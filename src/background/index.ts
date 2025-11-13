// C:\Projects\TOKEN-COUNTER\src\background\index.ts
// V64.0 (Final Code Structure): 修复 debugLog 声明顺序导致的 TS2304 错误

import { MessageType } from '../utils/common';
import { loadTokenState, saveTokenState, TokenCountState, loadUserLanguage } from './storage'; 
import modelRules from '../config/model_rules.json';

// =================================================================
// 0. 类型定义 (Types & Interfaces)
// =================================================================
// ... (Types & Interfaces remain the same) ...
type ModelName = keyof typeof modelRules.MODELS;

interface GetResponseBodyResponse {
    body: string;
    base64Encoded: boolean;
}

interface TokenState extends TokenCountState {
    model: ModelName;
}

// =================================================================
// 1. 核心常量与初始状态 (Core Constants & Initial State)
// =================================================================

const DEBUGGER_VERSION = "1.3"; 

const DEFAULT_MODEL_NAME: ModelName = modelRules.DEFAULT_MODEL_NAME as ModelName; 
const DEFAULT_RULES = modelRules.MODELS[DEFAULT_MODEL_NAME]; 

let lastKnownState: TokenState | null = null; 
let debuggerTarget: chrome.debugger.Debuggee | null = null;
let currentTabId: number | null = null;

// =================================================================
// 2. 核心辅助函数 (Core Helpers)
// =================================================================

// V64.0 核心修复：将 debugLog 移至顶部，确保所有函数都可以调用它
function debugLog(level: string, message: string, details: string = '') {
    console.log(`[SW-DEBUG] [${level}] ${message}`, details);
}

// 根据模型名称获取规则和默认状态 (用于初始化或模型切换)
function initializeState(modelName: string): TokenState {
    // ... (initializeState logic remains the same) ...
    const safeModelName: ModelName = modelRules.MODELS.hasOwnProperty(modelName)
        ? (modelName as ModelName) 
        : DEFAULT_MODEL_NAME;
        
    const rules = modelRules.MODELS[safeModelName] || DEFAULT_RULES;

    return {
        model: safeModelName,
        maxTokens: rules.MAX_TOKENS,
        inputText: 0,
        inputFile: 0,
        thinking: 0, 
        outputText: 0,
        outputFile: 0,
        total: 0, 
    } as TokenState;
}

// Req 4: 健壮性 - 重置计数状态（保留模型名称和规则）
function resetTokenCounts(state: TokenState): TokenState {
    debugLog('INFO', 'Token counts reset', `Model: ${state.model}`); 

    return {
        ...state,
        inputText: 0,
        inputFile: 0,
        thinking: 0, 
        outputText: 0,
        outputFile: 0,
        total: 0,
    };
}

// 核心通信工具：向 UI 广播消息
function broadcastToUI(message: { type: MessageType, payload?: any }): void {
    chrome.runtime.sendMessage(message).catch((e: any) => {
        const constMsg = e.message;
        if (constMsg && !constMsg.includes('Receiving end does not exist')) {
            debugLog('WARN', `无法广播到 UI (类型: ${message.type})`, constMsg);
        }
    });
}

// 核心通信工具：广播当前完整状态给 UI
function broadcastState(): void {
    if (lastKnownState) {
        saveTokenState(lastKnownState); 
        
        broadcastToUI({ 
            type: MessageType.SW_SEND_STATE, 
            payload: lastKnownState 
        });
    }
}


// =================================================================
// 3. Debugger 核心逻辑 - Token & Model 解析
// ... (parseModelNameFromResponse, parseUsageMetadata signatures remain the same) ...
// =================================================================

function parseModelNameFromResponse(body: string): ModelName | null {
    try {
        const match = body.match(/\"model\":\"(Gemini 2\.5 Pro|Gemini 2\.5 Flash)\"/);
        if (match && match[1] && modelRules.MODELS.hasOwnProperty(match[1])) {
             return match[1] as ModelName;
        }
    } catch (e: any) {
        debugLog('ERROR', "Failed to parse model name", (e as Error).message);
    }
    return null;
}

function parseUsageMetadata(body: string): { promptTokens: number, candidatesTokens: number } | null {
    const usageMatches = Array.from(body.matchAll(/"usageMetadata":\s*\{[^}]+\}/g));
    
    if (usageMatches.length === 0) {
        return null;
    }
    
    const usageString = usageMatches[usageMatches.length - 1][0];
    
    try {
        const promptMatch = usageString.match(/"promptTokenCount":\s*(\d+)/);
        const candidatesMatch = usageString.match(/"candidatesTokenCount":\s*(\d+)/);

        if (promptMatch && candidatesMatch) {
            const promptTokens = parseInt(promptMatch[1], 10);
            const candidatesTokens = parseInt(candidatesMatch[1], 10);
            
            if (!isNaN(promptTokens) && !isNaN(candidatesTokens) && promptTokens >= 0 && candidatesTokens >= 0) {
                 return { promptTokens, candidatesTokens };
            }
        }
    } catch (e: any) {
        debugLog('ERROR', "Failed to parse usageMetadata", (e as Error).message);
    }
    return null;
}

function onDebuggerEvent(source: chrome.debugger.Debuggee, method: string, params: any) {
    if (source.tabId !== currentTabId || !currentTabId) return;

    if (!lastKnownState) return; 

    if (method === "Network.requestWillBeSent") {
        const { request } = params;
        const url = request.url;
        
        if (url.includes("gemini.google.com/api/chat")) {
            if (request.method === 'POST') {
                lastKnownState = resetTokenCounts(lastKnownState);
                broadcastState();
            }
        }
        
    } else if (method === "Network.responseReceived") {
        const { requestId, response } = params;
        const url = response.url;

        if (url.includes("gemini.google.com/api/chat")) {
            
            if (!lastKnownState) return; 

            chrome.debugger.sendCommand({ tabId: currentTabId }, "Network.getResponseBody", { requestId }, (responseBody: any) => { 
                
                if (chrome.runtime.lastError) {
                    debugLog('ERROR', "Debugger API Error: Failed to get response body", chrome.runtime.lastError.message);
                    return; 
                }
                
                if (!responseBody || typeof responseBody !== 'object' || !('body' in responseBody)) {
                    return;
                }
                
                const responseTyped = responseBody as GetResponseBodyResponse; 
                const responseText = responseTyped.body;
                
                // V58.0 核心调试：在解析前记录是否找到 usageMetadata
                const isUsageFound = responseText.includes('usageMetadata');
                debugLog('INFO', 'API Response Captured', `Usage found: ${isUsageFound}, Size: ${responseText.length} bytes`);

                let stateUpdated = false;

                if (!lastKnownState) return; 

                // 1. 尝试解析模型名称 (自适应)
                const newModelName = parseModelNameFromResponse(responseText);
                if (newModelName && newModelName !== lastKnownState.model) {
                    debugLog('INFO', 'Model detected', newModelName);
                    lastKnownState = initializeState(newModelName);
                    stateUpdated = true;
                }
                
                // 2. 尝试解析 Token 使用量 (Req 1 - 精确计数)
                const usage = parseUsageMetadata(responseText); 
                
                if (usage) {
                    debugLog('INFO', 'Usage Parsed', `Prompt: ${usage.promptTokens}, Candidates: ${usage.candidatesTokens}`);
                    
                    const newState = { ...lastKnownState };
                    
                    const promptTotal = usage.promptTokens;
                    const outputTotal = usage.candidatesTokens;
                    const thoughtCost = modelRules.COST_RULES.THOUGHT_COST_PER_TURN;
                    
                    newState.inputText = Math.max(0, promptTotal - thoughtCost); 
                    newState.thinking = thoughtCost; 
                    newState.outputText = outputTotal;

                    newState.total = newState.inputText + newState.inputFile + newState.thinking + newState.outputText + newState.outputFile;
                    
                    if (lastKnownState.total !== newState.total) {
                        lastKnownState = newState;
                        stateUpdated = true;
                    }
                } else {
                    debugLog('WARN', 'Usage Failed to Parse', `Pattern match for usageMetadata failed (length: ${responseText.length} bytes).`);
                }
                
                if (stateUpdated) {
                    broadcastState();
                }
            });
        }
    }
}


function attachDebugger(tabId: number) {
    if (debuggerTarget && debuggerTarget.tabId === tabId) {
        debugLog('INFO', 'Debugger attached.', `Already attached to TabId: ${tabId}`);
        return; 
    }
    
    if (debuggerTarget) {
        chrome.debugger.detach(debuggerTarget, () => {});
    }

    const target: chrome.debugger.Debuggee = { tabId: tabId };
    currentTabId = tabId;
    debuggerTarget = target;
    
    chrome.debugger.attach(target, DEBUGGER_VERSION, () => {
        if (chrome.runtime.lastError) {
            debugLog('ERROR', "Debugger: Failed to attach.", chrome.runtime.lastError.message);
            debuggerTarget = null;
            currentTabId = null;
            return;
        }
        
        debugLog('INFO', "Debugger attached.", `TabId: ${tabId}. Enabling Network/DOM monitoring.`);

        chrome.debugger.sendCommand(target, "Network.enable");
        chrome.debugger.sendCommand(target, "DOM.enable");
    });
}

function onDebuggerDetach(source: chrome.debugger.Debuggee, reason: string): void {
    if (source.tabId === currentTabId) {
        debugLog('WARN', "Debugger detached.", `Reason: ${reason}`);
        debuggerTarget = null;
        currentTabId = null;
        
        if (lastKnownState) {
            broadcastToUI({ type: MessageType.SW_SEND_STATE, payload: { ...lastKnownState, model: lastKnownState.model + ' (Disconnected)' }});
        }
    }
}


// =================================================================
// 4. 业务逻辑处理函数 & 5. SW 启动与事件监听
// =================================================================

async function handleUiRequest(message: any): Promise<void> {
    
    if (!lastKnownState) {
        await loadInitialState();
    }
    
    if (message.type === MessageType.UI_REQUEST_INITIAL_STATE) {
        
        // V62.0 修复：简化 URL 匹配，并确保当前页面是目标
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const targetTab = tabs.find(tab => tab.url && tab.url.includes("gemini.google.com"));
        
        let logMessage = '';
        if (targetTab && targetTab.id) {
            logMessage = `Found target tab. ID: ${targetTab.id}, URL: ${targetTab.url}`;
            attachDebugger(targetTab.id); 
        } else {
            logMessage = 'Target Tab Not Found. Gemini tab not active in current window.';
        }
        
        // V62.0 强制日志输出
        debugLog('INFO', 'handleUiRequest Status', logMessage);

        broadcastState();

        return; 
    }
}

async function loadInitialState(): Promise<void> {
    const defaultState = initializeState(DEFAULT_MODEL_NAME);
    const storedState = await loadTokenState(defaultState);
    
    const safeModelName: ModelName = modelRules.MODELS.hasOwnProperty(storedState.model)
        ? (storedState.model as ModelName)
        : DEFAULT_MODEL_NAME;
        
    const modelRulesState = initializeState(safeModelName);
    lastKnownState = { ...storedState, model: safeModelName, maxTokens: modelRulesState.maxTokens } as TokenState;
    
    const userLang = await loadUserLanguage();
    if (userLang) {
        debugLog('INFO', 'Language loaded from storage', userLang);
    }
    
    if (lastKnownState) {
        debugLog('INFO', 'SW Initialized', `Loaded model: ${lastKnownState.model}, Total: ${lastKnownState.total}`);
    }
}


// =================================================================
// 6. 顶层启动 (Top-level Startup)
// =================================================================

loadInitialState();

chrome.debugger.onEvent.addListener(onDebuggerEvent);
chrome.debugger.onDetach.addListener(onDebuggerDetach);

chrome.runtime.onMessage.addListener(async (message: any, sender: any, sendResponse: any) => {
    
    if (!lastKnownState) {
        await loadInitialState();
    }
    
    if (message.type === MessageType.UI_REQUEST_INITIAL_STATE) { 
        handleUiRequest(message); 
        return;
    }
});
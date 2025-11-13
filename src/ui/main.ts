// C:\Projects/TOKEN-COUNTER/src\ui\main.ts
// V59.0 (Final Fix): 恢复关键的“说明”文本，并确保 UI 逻辑稳定

import { MessageType } from '../utils/common';

// =================================================================
// 0. 核心常量与 DOM 声明
// =================================================================

const MAX_RETRY_ATTEMPTS = 15;
const RETRY_DELAY_MS = 1000;

// DOM 元素 - 声明为可空类型 (在 initialize 中赋值)
let modelNameEl: HTMLElement | null = null;
let statusMessageEl: HTMLElement | null = null;
let totalDisplayEl: HTMLElement | null = null;
let inputTextEl: HTMLElement | null = null;
let inputFileEl: HTMLElement | null = null;
let thinkingEl: HTMLElement | null = null;
let outputTextEl: HTMLElement | null = null;
let outputFileEl: HTMLElement | null = null;
let settingsButton: HTMLElement | null = null;
let settingsPanel: HTMLElement | null = null; 


// =================================================================
// 1. 核心业务函数 (Core Business Logic)
// =================================================================

function updateStatus(statusKey: string, message: string) {
    if (statusMessageEl) { 
        // V52.0: 硬编码“状态”前缀
        statusMessageEl.textContent = `状态: ${message}`; 
        statusMessageEl.className = `status-row status-${statusKey}`;
    }
}

function updateUI(state: {
    model: string,
    maxTokens: number, 
    inputText: number,
    inputFile: number,
    thinking: number,
    outputText: number,
    outputFile: number,
    total: number
}) {
    if (modelNameEl) {
        if (state.model.includes('(Disconnected)')) {
             // 硬编码 "模型"
             modelNameEl.textContent = `模型: ${state.model}`; 
        } else {
             modelNameEl.textContent = `模型: ${state.model}`;
        }
    }
    
    if (inputTextEl) inputTextEl.textContent = state.inputText.toLocaleString();
    if (inputFileEl) inputFileEl.textContent = state.inputFile.toLocaleString();
    if (thinkingEl) thinkingEl.textContent = state.thinking.toLocaleString();
    if (outputTextEl) outputTextEl.textContent = state.outputText.toLocaleString();
    if (outputFileEl) outputFileEl.textContent = state.outputFile.toLocaleString();

    const maxTokens = state.maxTokens;
    const usageRatio = maxTokens > 0 ? state.total / maxTokens : 0;
    const totalText = `${state.total.toLocaleString()} / ${maxTokens.toLocaleString()} (${(usageRatio * 100).toFixed(1)}%)`;
    if (totalDisplayEl) totalDisplayEl.textContent = totalText;
}


// =================================================================
// 2. 设置 UI 辅助函数
// =================================================================

function createSettingsHtml(): string {
    // V52.0: 设置面板中的文本硬编码
    return `
        <h2>设置</h2>
        <div class="setting-row">
            <label for="language-select">语言:</label>
            <select id="language-select">
                <option value="default">浏览器默认 (Browser Default)</option>
                <option value="zh_CN">简体中文</option>
                <option value="zh_TW">繁體中文</option>
                <option value="en">English</option>
            </select>
        </div>
        <button id="settings-back">返回</button>
    `;
}

function bindSettingsEvents() {
    if (!settingsPanel) return;
    const languageSelect = settingsPanel.querySelector('#language-select') as HTMLSelectElement;
    
    settingsPanel.querySelector('#settings-back')?.addEventListener('click', closeSettings);
    languageSelect?.addEventListener('change', handleLanguageChange);
}

function loadCurrentLanguage() {
    if (!settingsPanel) return;
    const languageSelect = settingsPanel.querySelector('#language-select') as HTMLSelectElement;
    
    // Req 4: 健壮性 - 加载并设置当前语言
    chrome.storage.local.get('user_language', (result) => {
        if (result.user_language && languageSelect) {
            languageSelect.value = result.user_language;
        } else if (languageSelect) {
            // 如果没有存储偏好，选择“浏览器默认” (全自动模式)
            languageSelect.value = 'default';
        }
    });
}


/**
 * V59.0: 恢复 UI 标签和注释文本
 */
function updateLabels() {
    // V53.0: 标签元素赋值逻辑保持不变
    const labelInputHeader = document.getElementById('label-input-header');
    const labelsInputTextLabel = document.getElementById('label-input-text');
    const labelsInputFileLabel = document.getElementById('label-input-file');
    const labelsThinkingHeader = document.getElementById('label-thinking-header');
    const labelsThinkingLabel = document.getElementById('label-thinking-text');
    const labelsOutputHeader = document.getElementById('label-output-header');
    const labelsOutputTextLabel = document.getElementById('label-output-text');
    const labelsOutputFileLabel = document.getElementById('label-output-file');
    const labelsTotalLabel = document.getElementById('label-total');
    const labelsExplanation = document.getElementById('explanation-text'); 
    
    // 赋值 (V59.0: 恢复最终标签和说明)
    if (labelInputHeader) labelInputHeader.textContent = '用户输入'; 
    if (labelsInputTextLabel) labelsInputTextLabel.textContent = '文本'; 
    if (labelsInputFileLabel) labelsInputFileLabel.textContent = '文件'; 
    
    if (labelsThinkingHeader) labelsThinkingHeader.textContent = '模型思考'; 
    if (labelsThinkingLabel) labelsThinkingLabel.textContent = '模型思考'; 
    
    if (labelsOutputHeader) labelsOutputHeader.textContent = '模型输出';
    if (labelsOutputTextLabel) labelsOutputTextLabel.textContent = '文本';
    if (labelsOutputFileLabel) labelsOutputFileLabel.textContent = '文件';
    
    if (labelsTotalLabel) labelsTotalLabel.textContent = '计算总计';
    
    // V59.0 核心修复：恢复说明文本
    if (labelsExplanation) labelsExplanation.textContent = '说明：计数器仅实时统计当前*已加载*的对话。如需统计历史记录，请**手动上/下滚动**以加载更多内容。'; 
    
    // V16.0: 如果设置面板已存在，更新其 i18n 文本
    if (settingsPanel) {
        settingsPanel.innerHTML = createSettingsHtml();
        bindSettingsEvents();
        loadCurrentLanguage();
    }
}


// =================================================================
// 3. 消息处理与事件绑定 (Handlers)
// =================================================================

function handleMessage(message: any) {
    const { type, payload } = message;
    
    // V52.0: 硬编码状态文本
    const statusWaiting = '等待页面活动...';
    const statusReady = '就绪'; 

    switch (type) {
        case MessageType.SW_SEND_STATE:
            updateLabels(); 
            updateUI(payload);
            
            if (payload.total === 0) {
                 updateStatus('waiting', statusWaiting);
            } else {
                 updateStatus('ready', statusReady);
            }
            break;
    }
}

function handleLanguageChange(event: Event) {
    const newLang = (event.target as HTMLSelectElement).value;
    
    if (newLang === 'default') {
        chrome.storage.local.remove('user_language', () => {
             const userPrompt = '语言偏好已清除。请重新加载扩展以跟随浏览器默认语言。';
             alert(userPrompt);
             updateLabels(); 
        });
        return;
    }
    
    chrome.storage.local.set({ user_language: newLang }, () => {
        const userPrompt = `语言设置已保存。请重新加载扩展或重启浏览器以使更改完全生效。`;
        
        alert(userPrompt); 
        
        updateLabels(); 
    });
}

function openSettings() {
    const contentBody = document.querySelector('.content-body') as HTMLElement;
    const totalRow = document.querySelector('.total-row') as HTMLElement;
    const explanationText = document.getElementById('explanation-text');
    
    if (contentBody) contentBody.style.display = 'none';
    if (totalRow) totalRow.style.display = 'none';
    if (explanationText) explanationText.style.display = 'none';
    
    if (!settingsPanel) {
        settingsPanel = document.getElementById('settings-panel');
    }
    
    if (settingsPanel) {
        settingsPanel.innerHTML = createSettingsHtml();
        bindSettingsEvents(); 
        loadCurrentLanguage(); 
        settingsPanel.style.display = 'block';
    }

    if (settingsButton) settingsButton.innerHTML = '&#x2190;'; // 返回箭头
    settingsButton?.removeEventListener('click', openSettings);
    settingsButton?.addEventListener('click', closeSettings);
}

function closeSettings() {
    const contentBody = document.querySelector('.content-body') as HTMLElement;
    const totalRow = document.querySelector('.total-row') as HTMLElement;
    const explanationText = document.getElementById('explanation-text');

    if (contentBody) contentBody.style.display = 'block';
    if (totalRow) totalRow.style.display = 'grid'; 
    if (explanationText) explanationText.style.display = 'block';
    if (settingsPanel) settingsPanel.style.display = 'none';

    if (settingsButton) settingsButton.innerHTML = '⚙️'; // 恢复设置图标
    settingsButton?.removeEventListener('click', closeSettings);
    settingsButton?.addEventListener('click', openSettings);
    
    updateLabels(); // 重新加载标签
}


function addEventListeners() {
    settingsButton?.addEventListener('click', openSettings);
}

// =================================================================
// 4. 启动逻辑 (Initialization Logic)
// =================================================================

function sendInitialRequest(attempt: number = 1) {
    const statusReady = '就绪'; 
    if (attempt > MAX_RETRY_ATTEMPTS) {
        console.error("UI (V59.0): 达到最大重试次数，无法连接到 Service Worker。");
        updateStatus('error', statusReady); 
        return;
    }

    chrome.runtime.sendMessage({ type: MessageType.UI_REQUEST_INITIAL_STATE })
        .then(() => {
            // Success
        })
        .catch((e: any) => {
            const msg = e.message;
            if (msg.includes('Receiving end does not exist') || msg.includes('Could not establish connection')) {
                console.warn(`UI (V59.0): 连接失败 (尝试 ${attempt}/${MAX_RETRY_ATTEMPTS})，正在重试...`);
                window.setTimeout(() => sendInitialRequest(attempt + 1), RETRY_DELAY_MS);
            } else {
                console.error("UI (V59.0): 意外的连接错误:", e);
                updateStatus('error', statusReady); 
            }
        });
}

async function initialize() {
    // === V20.0: 赋值 DOM 元素 ===
    modelNameEl = document.getElementById('model-name');
    statusMessageEl = document.getElementById('status-message');
    totalDisplayEl = document.getElementById('total-display');
    inputTextEl = document.getElementById('input-text');
    inputFileEl = document.getElementById('input-file');
    thinkingEl = document.getElementById('thinking');
    outputTextEl = document.getElementById('output-text');
    outputFileEl = document.getElementById('output-file');
    settingsButton = document.getElementById('settings-button');
    settingsPanel = document.getElementById('settings-panel'); 

    updateLabels(); 
    const statusWaiting = '等待页面活动...';
    updateStatus('waiting', statusWaiting); 
    chrome.runtime.onMessage.addListener(handleMessage);
    
    sendInitialRequest();
    
    addEventListeners();
    
    if(settingsPanel) settingsPanel.style.display = 'none';
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
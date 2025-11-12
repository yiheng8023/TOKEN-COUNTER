// C:\Projects\TOKEN-COUNTER\src\background\index.ts
// V1.5 (Task 1.5): 激活数据管道，处理来自 Content Script 的数据

import { Logger } from './storage';
import { MessageType } from '../utils/common'; // V1.4
import * as Rules from '../config/model_rules.json'; // V1.4

console.log('Service Worker (SW) 启动 (V1.5)。');
Logger.info('Service Worker 启动 (V1.5)。');

// -------------------------------------------------
// 1. (V1.3) 启动“计算工厂” (Web Worker)
// -------------------------------------------------
let modelWorker: Worker;
let isModelReady = false;
let currentTextToCalculate = ''; // V1.5: 缓存，用于对比

function initializeModelWorker() {
    try {
        modelWorker = new Worker(
            new URL('./modelWorker.ts', import.meta.url), 
            { type: 'module' }
        );
        console.log('SW: Model Worker 正在初始化...');
        
        modelWorker.onmessage = (event) => {
            const { type, payload, error } = event.data;

            switch (type) {
                case 'model_loading_progress':
                    sendToUI(MessageType.BG_UPDATE_STATUS_BUSY);
                    console.log('SW: 收到模型加载进度', payload.status);
                    break;
                
                case 'model_loaded':
                    isModelReady = true;
                    sendToUI(MessageType.BG_UPDATE_STATUS_READY);
                    console.log('SW: Model Worker 报告模型加载完毕！');
                    Logger.info('Tokenizer 模型已加载并缓存。');
                    // V1.5: 模型加载后，立即计算一次当前文本
                    if (currentTextToCalculate) {
                        triggerTokenCalculation(currentTextToCalculate);
                    }
                    break;

                case 'model_load_error':
                    isModelReady = false;
                    sendToUI(MessageType.BG_UPDATE_STATUS_READY);
                    console.error('SW: Model Worker 报告模型加载失败!', error);
                    Logger.error('Model Worker 加载失败', error);
                    break;
                
                // V1.5: 接收来自 Worker 的计算结果
                case 'token_calculation_complete':
                    // 这是 V168 (App.tsx) 真正需要的消息
                    sendToUI(MessageType.BG_UPDATE_TEXT_TOKENS, { 
                        totalTokens: payload.tokenCount 
                    });
                    // 更新我们的“单一事实来源”
                    currentTextTokens = payload.tokenCount;
                    // V1.5: 告诉 UI 计算已完成
                    sendToUI(MessageType.BG_UPDATE_STATUS_READY);
                    Logger.info(`计算完成: ${payload.tokenCount} tokens`);
                    break;
                
                case 'token_calculation_error':
                    Logger.error('Token 计算失败', error);
                    sendToUI(MessageType.BG_UPDATE_STATUS_READY); // 计算失败也要 "Ready"
                    break;
            }
        };

        modelWorker.onerror = (e) => {
            console.error('SW: Model Worker 出现致命错误', e);
            Logger.error('Model Worker 致命错误', e.message);
            isModelReady = false;
            initializeModelWorker();
        };

    } catch (e) {
        console.error('SW: 无法创建 Model Worker!', e);
        Logger.error('无法创建 Model Worker', e);
    }
}
initializeModelWorker();


// -------------------------------------------------
// 2. (V1.4) “状态中心”：存储来自 Content Script 的最新数据
// -------------------------------------------------
let currentModelName: string = Rules.DEFAULT_MODEL_NAME;
let currentFileCount: number = 0;
let currentTextTokens: number = 0; // 这是已计算的 Token 数

// -------------------------------------------------
// 3. (V1.5) “消息总线”：处理所有传入消息
// -------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { type, payload } = message;

    switch (type) {
        // --- 来自 Content Script (CS_SEND_GEMINI_DATA) ---
        // V1.5: 激活此处理器
        case MessageType.CS_SEND_GEMINI_DATA:
            // Logger.info('SW: 收到 Content Script 数据');
            let hasUiChanged = false;
            
            // 1. 更新模型名称
            if (payload.modelName && payload.modelName !== currentModelName) {
                currentModelName = payload.modelName;
                sendToUI(MessageType.BG_UPDATE_MODEL_NAME, { modelName: currentModelName });
                hasUiChanged = true;
            }
            
            // 2. 更新文件计数
            if (payload.fileCount !== undefined && payload.fileCount !== currentFileCount) {
                currentFileCount = payload.fileCount;
                sendToUI(MessageType.BG_UPDATE_FILE_COUNT, { fileCount: currentFileCount });
                hasUiChanged = true;
            }

            // 3. (核心) 更新文本 Token
            if (payload.textToCalculate !== undefined && payload.textToCalculate !== currentTextToCalculate) {
                currentTextToCalculate = payload.textToCalculate;
                // V1.5: 触发 Web Worker 计算
                triggerTokenCalculation(currentTextToCalculate);
                hasUiChanged = true; // (计算中)
            }
            
            if (hasUiChanged) {
                // console.log('SW (V1.5): 数据已更新并转发。');
            }
            break;
        

        // --- 来自 UI (UI_REQUEST_INITIAL_STATE) ---
        case MessageType.UI_REQUEST_INITIAL_STATE:
            Logger.info('SW: 收到 UI 初始状态请求');
            
            sendToUI(MessageType.BG_SEND_INITIAL_STATE, {
                modelName: currentModelName,
                fileCount: currentFileCount,
                totalTokens: currentTextTokens // 发送 *已计算* 的 Token
            });
            
            if (isModelReady) {
                sendToUI(MessageType.BG_UPDATE_STATUS_READY);
            } else {
                sendToUI(MessageType.BG_UPDATE_STATUS_BUSY); // 仍在加载
            }
            break;
    }
    
    return true; // 保持异步
});

// -------------------------------------------------
// 4. (V1.5) 辅助函数：触发 Worker 计算
// -------------------------------------------------
function triggerTokenCalculation(text: string) {
    if (!text) {
        // V1.5: 如果文本为空，立即重置
        currentTextTokens = 0;
        sendToUI(MessageType.BG_UPDATE_TEXT_TOKENS, { totalTokens: 0 });
        sendToUI(MessageType.BG_UPDATE_STATUS_READY);
        return;
    }

    // 如果模型未就绪，SW 会在 'model_loaded' 事件中自动计算
    if (!isModelReady || !modelWorker) {
        sendToUI(MessageType.BG_UPDATE_STATUS_BUSY); // (模型加载中...)
        return;
    }

    // V1.5: 告诉 UI 我们开始忙碌
    sendToUI(MessageType.BG_UPDATE_STATUS_BUSY);

    // V1.5: 将计算任务转发给 Model Worker
    modelWorker.postMessage({
        type: 'calculate_tokens',
        payload: { text: text }
    });
}


// -------------------------------------------------
// 5. (V1.4) 辅助函数：向 UI 发送消息
// -------------------------------------------------
function sendToUI(type: MessageType, payload: any = {}) {
    // console.log(`SW: 正在发送消息到 UI: ${type}`, payload);
    chrome.runtime.sendMessage({ type, payload })
        .catch(e => {
            const msg = e.message;
            if (msg && !msg.includes('Receiving end does not exist')) {
                console.warn(`SW: sendToUI 失败 (类型: ${type})`, e);
            }
        });
}
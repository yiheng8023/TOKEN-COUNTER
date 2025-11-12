// C:\Projects\TOKEN-COUNTER\src\ui\main.ts
// V6.3 (Task P1.1a): "最终计算"
// 1. (P1.1a 根源修复) *删除* updateUI 中导致 Bug 的*除法* 逻辑

import { MessageType } from '../utils/common';

// V5.0: 获取所有 DOM 元素 (保留)
const modelNameEl = document.getElementById('model-name');
const textCountEl = document.getElementById('text-count');
const fileCountEl = document.getElementById('file-count');
const totalDisplayEl = document.getElementById('total-display');
const statusMessageEl = document.getElementById('status-message');
const settingsButton = document.getElementById('settings-button');

// V5.0: (保留)
const MODEL_RULES = {
    MAX_TOKENS: 1048576,
    COST_PER_FILE: 258,
};

// -----------------------------------------------------------
// V6.3: UI 渲染逻辑 (P1.1a 修复)
// -----------------------------------------------------------

function updateUI({ model, text, file, total }: { model: string, text: number, file: number, total: number }) {
    if (modelNameEl) modelNameEl.textContent = `模型: ${model}`;
    if (textCountEl) textCountEl.textContent = text.toLocaleString();
    
    // V6.3 (P1.1a 根源修复): 
    // *删除*了 (file / fileCost) 逻辑。
    // 'file' (来自 V5.2 handleMessage) *已经是*计算后的 Token。
    if (fileCountEl) fileCountEl.textContent = file.toLocaleString(); 
    
    // V5.0: 总计显示 (P1.6 修复) (保留)
    const maxTokens = MODEL_RULES.MAX_TOKENS;
    const usageRatio = total / maxTokens;
    const totalText = `${total.toLocaleString()} / ${maxTokens.toLocaleString()} (${(usageRatio * 100).toFixed(1)}%)`;
    if (totalDisplayEl) totalDisplayEl.textContent = totalText;
}

function updateStatus(statusKey: string, message: string) {
    if (statusMessageEl) {
        statusMessageEl.textContent = `状态: ${message}`;
        statusMessageEl.className = `status-row status-${statusKey}`;
    }
}

// -----------------------------------------------------------
// V5.0: 消息监听器 (V6.3 保留 V3.4 架构)
// -----------------------------------------------------------

function handleMessage(message: any) {
    const { type, payload } = message;

    switch (type) {
        case MessageType.WORKER_STATUS_INIT:
            updateStatus('initializing', getMessage('statusInitializing'));
            break;
        case MessageType.WORKER_STATUS_BUSY:
            updateStatus('calculating', getMessage('statusCalculating'));
            break;

        // V3.4 (P-DATA) (保留)
        case MessageType.WORKER_SEND_STATE:
            const fileCost = MODEL_RULES.COST_PER_FILE;
            const fileCount = payload.fileCount; // V6.3: 145
            const textTokens = payload.textTokens;
            
            // V6.3: (P1.1a 修复) 
            // 计算*一次*
            const calculatedFile = fileCount * fileCost;
            const newTotal = textTokens + calculatedFile;
            
            const state = {
                model: payload.model,
                text: textTokens,
                file: calculatedFile, // V6.3: 发送 37410 (145 * 258)
                total: newTotal
            };
            updateUI(state);
            updateStatus('ready', getMessage('statusReady'));
            break;
    }
}

// -----------------------------------------------------------
// V5.0: 启动逻辑 (保留)
// -----------------------------------------------------------
settingsButton?.addEventListener('click', () => {
    alert('设置功能 (P2) 待开发，用于语言切换等。');
});

function getMessage(key: string): string {
    return (typeof chrome !== 'undefined' && chrome.i18n) ? chrome.i18n.getMessage(key) : key;
}

function initialize() {
    updateStatus('initializing', getMessage('statusInitializing'));
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.runtime.sendMessage({ type: MessageType.UI_REQUEST_INITIAL_STATE });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
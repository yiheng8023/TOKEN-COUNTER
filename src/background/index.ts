// src/background/index.ts (V154: 修复 R8 架构崩溃 - 修正 "message channel closed" 错误)

/**
 * 消息类型枚举 (Background Script 独立定义以避免模块解析错误)
 */
enum MessageType {
    BG_CALCULATE_TOKENS = 'BG_CALCULATE_TOKENS',
    OFFSCREEN_CALCULATE_TOKENS = 'OFFSCREEN_CALCULATE_TOKENS',
    OFFSCREEN_CALCULATE_TOKENS_RESPONSE = 'OFFSCREEN_CALCULATE_TOKENS_RESPONSE',
    UPDATE_UI_TOKENS = 'UPDATE_UI_TOKENS',
    UPDATE_UI_COUNTERS = 'UPDATE_UI_COUNTERS',
    UPDATE_UI_MODEL = 'UPDATE_UI_MODEL',
    UPDATE_UI_STATUS = 'UPDATE_UI_STATUS',
    REQUEST_INITIAL_STATE = 'REQUEST_INITIAL_STATE',
}

const OFFSCREEN_DOCUMENT_PATH = 'src/engine/offscreen.html';

/**
 * V1E.T. 52 (R8) 修复: 
 * (此函数已验证可工作，保持不变)
 */
async function setupOffscreenDocument() {
    try {
        if (!chrome.offscreen) {
            console.error("TOKEN-COUNTER: chrome.offscreen API 不存在。");
            return;
        }

        const hasDoc = await chrome.offscreen.hasDocument();
        if (hasDoc) {
            return;
        }

        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: [chrome.offscreen.Reason.IFRAME_SCRIPTING],
            justification: 'Offload heavy tokenization model from Service Worker.'
        });
        // V154: 仅在成功时记录一次
        console.log("TOKEN-COUNTER: Offscreen Document 已创建。");

    } catch (e: unknown) {
        console.error("TOKEN-COUNTER: setupOffscreenDocument 失败:", e);
        throw e; 
    }
}

// V149 修复: 为整个监听器添加顶层 try...catch
try {
    // V154 (R8) 致命错误修复: 
    // 1. 将 addListener 回调设为 'async'。
    // 2. 移除所有 'return true' 和 'return false'。
    //
    // 解释: 'return true' 是一个契约，表示我们会调用 sendResponse()。
    // 但我们从未调用，导致了 "message channel closed" 崩溃。
    // 通过将监听器设为 'async' 并移除 'return'，我们告诉 Chrome
    // 我们会处理消息，但不会回复原始调用者 (这是正确的架构)。
    // 所有的 sendMessage 调用仍需被 .catch() 捕获 (V153 修复)。

    chrome.runtime.onMessage.addListener(async (message, _sender, _sendResponse) => { 
        
        try {
            // 1. 监听来自 Content Script 的 Token 计算请求
            if (message.type === MessageType.BG_CALCULATE_TOKENS) {
                await setupOffscreenDocument(); 
                // 转发给 Offscreen Document
                chrome.runtime.sendMessage({
                    type: MessageType.OFFSCREEN_CALCULATE_TOKENS, 
                    text: message.text,
                }).catch(e => {
                    // (V153 修复)
                    console.warn(`TOKEN-COUNTER: 转发 ${message.type} 失败 (Offscreen 就绪?):`, e.message);
                });
                return; // V154: 移除 'return true'
            }

            // 2. 监听来自 Offscreen Document 的 Token 计算结果
            if (message.type === MessageType.OFFSCREEN_CALCULATE_TOKENS_RESPONSE) {
                // 转发给 UI (Side Panel)
                chrome.runtime.sendMessage({
                    type: MessageType.UPDATE_UI_TOKENS, 
                    totalTokens: message.tokenCount
                }).catch(e => {
                    // (V153 修复)
                    console.warn(`TOKEN-COUNTER: 转发 ${message.type} 失败 (UI 打开?):`, e.message);
                });
                return; // V154: 移除 'return false'
            }

            // 3. 监听来自 Content Script 的其他 UI 更新消息
            if (message.type === MessageType.UPDATE_UI_MODEL || 
                message.type === MessageType.UPDATE_UI_COUNTERS) {
                // 转发给 UI (Side Panel)
                chrome.runtime.sendMessage(message).catch(e => {
                    // (V153 修复)
                    console.warn(`TOKEN-COUNTER: 转发 ${message.type} 失败 (UI 打开?):`, e.message);
                });
                return; // V154: 移除 'return false'
            }

            // 4. V175: 监听 UI 侧边栏的状态更新
            if (message.type === MessageType.UPDATE_UI_STATUS) {
                // 转发给 UI (Side Panel)
                chrome.runtime.sendMessage(message).catch(e => {
                    // (V153 修复)
                    console.warn(`TOKEN-COUNTER: 转发 ${message.type} 失败:`, e.message);
                });
                return; // V154: 移除 'return false'
            }

            // 5. 监听来自 UI 的请求初始状态
            if (message.type === MessageType.REQUEST_INITIAL_STATE) {
                await setupOffscreenDocument();
                return; // V154: 移除 'return true'
            }

        } catch (e: unknown) {
             console.error("TOKEN-COUNTER: onMessage 监听器内部错误:", e);
        }
    });
} catch (e: unknown) {
     console.error("TOKEN-COUNTER: 无法设置 onMessage 监听器:", e);
}


// V151 (R8) 修复: 
// (此函数已验证可工作，保持不变)
chrome.runtime.onStartup.addListener(() => {
    setupOffscreenDocument().catch(e => {
        console.error("TOKEN-COUNTER: onStartup 预热失败 (已捕获):", e);
    });
});
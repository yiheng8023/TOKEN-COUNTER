// C:\Projects\TOKEN-COUNTER\src\background\index.ts
// V4.0 (Task P-SW): "新思路"
// 1. (P-SW 根源修复) *删除* "旧路": 
//    彻底删除 `setupOffscreenDocument` 和 `routeToWorker` 
//    中所有 *违规* (illegal) 的 `Logger` 调用 (它们导致了 崩溃)
// 2. (P-SW 根源修复) *只使用* `console.error` (同步且安全)
// 3. (P-DATA) *保留* V3.4 "Dumb Pipe" 架构

import { MessageType } from '../utils/common';
// V4.0 (P-SW 根源修复): 
// *不能* 在顶层导入 Logger，
// 我们只在*安全*的 onMessage 内部导入它。
// import { Logger } from './storage'; 

// -----------------------------------------------------------------
// V4.0: Offscreen Document 管理 (P-SW 修复)
// -----------------------------------------------------------------
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
let creatingOffscreen: Promise<void> | null = null; 

async function hasOffscreenDocument(): Promise<boolean> {
    // @ts-ignore
    if (chrome.runtime.getContexts) {
        // @ts-ignore
        const contexts = await chrome.runtime.getContexts({
            contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
        });
        return Array.isArray(contexts) && contexts.length > 0;
    }
    try {
        const clients = await (self as unknown as ServiceWorkerGlobalScope).clients.matchAll();
        return clients.some((c: Client) => c.url.endsWith(OFFSCREEN_DOCUMENT_PATH));
    } catch (e) {
        return false;
    }
}

async function setupOffscreenDocument() {
    if (await hasOffscreenDocument()) {
        console.log('SW (V4.0): Offscreen Document 已存在。');
        return;
    }
    if (creatingOffscreen) {
        await creatingOffscreen;
        return;
    }
    console.log('SW (V4.0): 正在创建 Offscreen Document...');
    creatingOffscreen = (async () => {
        try {
            await chrome.offscreen.createDocument({
                url: OFFSCREEN_DOCUMENT_PATH,
                reasons: [chrome.offscreen.Reason.WORKERS], 
                justification: '用于加载和运行 Tokenizer Web Worker',
            });
            console.log('SW (V4.0): Offscreen Document 创建成功。');
        } catch (e: any) {
            // V4.0 (P-SW 根源修复): *删除* Logger
            if (e.message.includes('Document already exists')) {
                 console.warn('SW (V4.0): 创建失败 (已存在，竞态条件)。', e.message);
            } else {
                console.error('SW (V4.0): Offscreen Document 创建失败!', e);
                // Logger.error('Offscreen.Create.Fail', e); // <-- V4.0 删除
            }
        } finally {
            creatingOffscreen = null;
        }
    })();
    await creatingOffscreen;
}

// -----------------------------------------------------------------
// V3.4 (P-DATA): "Dumb Pipe" 消息路由
// -----------------------------------------------------------------

function broadcastToUI(message: { type: MessageType, payload?: any }) {
    chrome.runtime.sendMessage(message).catch(e => {
        const msg = e.message;
        if (msg && !msg.includes('Receiving end does not exist')) {
            console.warn(`SW (V4.0): 无法广播到 UI (类型: ${message.type})`, e);
        }
    });
}

async function routeToWorker(message: any) {
    try {
        await chrome.runtime.sendMessage(message);
    } catch (e: any) {
         // V4.0 (P-SW 根源修复): *删除* Logger
         if (e.message.includes('Could not establish connection')) {
             console.warn('SW (V4.0): 无法路由消息 (Offscreen 可能正在启动)，正在重试...');
             setTimeout(() => routeToWorker(message), 1000); 
         } else {
             console.error('SW (V4.0): 无法路由消息到 Offscreen/Worker', e);
             // Logger.error('SW.RouteToWorker.Fail', e); // <-- V4.0 删除
         }
    }
}

// -----------------------------------------------------------------
// SW 启动与事件监听
// -----------------------------------------------------------------

chrome.runtime.onStartup.addListener(async () => {
    await setupOffscreenDocument();
});

chrome.runtime.onInstalled.addListener(async (details) => {
    await setupOffscreenDocument();
});


// V3.4: 全局消息监听器 (Dumb Pipe)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    if (message.type === MessageType.CS_SEND_DATA || 
        message.type === MessageType.UI_REQUEST_INITIAL_STATE) {
        
        routeToWorker(message);
        return; 
    }

    if (sender.url && sender.url.endsWith(OFFSCREEN_DOCUMENT_PATH)) {
        
        broadcastToUI(message);
        return;
    }
});
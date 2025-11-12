// C:\Projects\TOKEN-COUNTER\src\background\index.ts
// 这是基于我们新 "Web Worker 蓝图" 的全新版本

import { Logger } from './storage'; // 导入您 V147 的日志记录器

console.log('Service Worker (SW) 启动。');
Logger.info('Service Worker 启动。');

// -------------------------------------------------
// 1. 启动我们的“计算工厂” (Web Worker)
// -------------------------------------------------

let modelWorker: Worker;
let isModelReady = false;

function initializeModelWorker() {
    try {
        modelWorker = new Worker(
            // Vite/Rollup 会自动处理这个 URL
            new URL('./modelWorker.ts', import.meta.url), 
            { type: 'module' }
        );

        console.log('SW: Model Worker 正在初始化...');
        
        // 监听来自 Model Worker 的消息
        modelWorker.onmessage = (event) => {
            const { type, payload, error } = event.data;

            switch (type) {
                case 'model_loading_progress':
                    console.log('SW: 收到模型加载进度', payload.status, payload.progress);
                    // 我们可以将进度转发给 UI (如果 UI 处于打开状态)
                    // port?.postMessage({ type: 'UPDATE_UI_STATUS', ... });
                    break;
                
                case 'model_loaded':
                    isModelReady = true;
                    console.log('SW: Model Worker 报告模型加载完毕！');
                    Logger.info('Tokenizer 模型已加载并缓存。');
                    // 如果 Port 已连接，通知 UI
                    activePort?.postMessage({ type: 'MODEL_LOADED' });
                    break;

                case 'model_load_error':
                    console.error('SW: Model Worker 报告模型加载失败!', error);
                    Logger.error('Model Worker 加载失败', error);
                    activePort?.postMessage({ type: 'ERROR', message: '模型加载失败', error: error });
                    break;
                
                case 'token_calculation_complete':
                    console.log(`SW: 收到计算结果: ${payload.tokenCount}`);
                    // 将结果通过 Port 发回 UI
                    activePort?.postMessage({
                        type: 'TOKENS_CALCULATED',
                        tokenCount: payload.tokenCount,
                        originalText: payload.text
                    });
                    break;
                
                case 'token_calculation_error':
                    console.error('SW: Model Worker 报告计算失败!', error);
                    Logger.error('Token 计算失败', error);
                    activePort?.postMessage({ type: 'ERROR', message: 'Token 计算失败', error: error });
                    break;
            }
        };

        modelWorker.onerror = (e) => {
            console.error('SW: Model Worker 出现致命错误', e);
            Logger.error('Model Worker 致命错误', e.message);
            isModelReady = false; // 重置状态
            // 尝试重启 Worker
            initializeModelWorker();
        };

    } catch (e) {
        console.error('SW: 无法创建 Model Worker!', e);
        Logger.error('无法创建 Model Worker', e);
    }
}

// 立即初始化 Worker
initializeModelWorker();

// -------------------------------------------------
// 2. 管理与侧边栏 UI 的“通信枢纽” (Port)
// -------------------------------------------------

let activePort: chrome.runtime.Port | null = null;

chrome.runtime.onConnect.addListener((port) => {
    // 我们只关心来自侧边栏的 Port
    if (port.name === 'sidebar-channel') {
        activePort = port;
        console.log('SW: 侧边栏 UI 已连接 (Port 建立)。');
        Logger.info('UI Port 已连接。');

        // 立即向 UI 发送当前状态
        // UI (V40) 需要这个
        port.postMessage({
            type: isModelReady ? 'INITIAL_STATE_POST_MODEL' : 'INITIAL_STATE_PRE_MODEL',
            serviceWorkerReady: true,
            isModelLoaded: isModelReady
        });

        // 监听来自 UI 的消息
        port.onMessage.addListener((message) => {
            console.log(`SW: 收到 UI 消息: ${message.type}`);
            
            if (message.type === 'BG_CALCULATE_TOKENS') {
                if (!isModelReady || !modelWorker) {
                    port.postMessage({ type: 'ERROR', message: '模型未就绪或 Worker 未启动。' });
                    return;
                }
                // 将计算任务转发给 Model Worker
                modelWorker.postMessage({
                    type: 'calculate_tokens',
                    payload: { text: message.text }
                });
            }
        });

        // 处理 Port 断开
        port.onDisconnect.addListener(() => {
            console.log('SW: 侧边栏 UI 已断开 (Port 断开)。');
            Logger.info('UI Port 已断开。');
            if (port === activePort) {
                activePort = null;
            }
        });
    }
});

// -------------------------------------------------
// 3. (占位) 监听来自 Content Script 的消息
// -------------------------------------------------
// 我们将在下一个任务中实现这里
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 示例：
    // if (message.type === 'BG_CALCULATE_TOKENS_FROM_CONTENT') { ... }
    return true; // 保持异步
});
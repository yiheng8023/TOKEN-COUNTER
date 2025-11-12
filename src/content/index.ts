// src/content/index.ts (V19: 修复 Content Script 编译和路径)

import { initializeGeminiEngine } from './engines/gemini';
// V17 修复: 'coze' 引擎尚不存在，必须注释掉
// import { initializeCozeEngine } from './engines/coze'; 
// V19 修复: 移除 MessageType 导入，因为已在 gemini/index.ts 中直接导入

console.log('TOKEN-COUNTER Content Script (V19) started.');

// --- 暴露给 Content Engine 的工具函数 ---
export function debounce<F extends (...args: any[]) => any>(func: F, delay: number): (...args: Parameters<F>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function(this: any, ...args: Parameters<F>) {
        const context = this;
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func.apply(context, args);
            timeout = null;
        }, delay);
    };
}

// --- 根据 URL 初始化相应的引擎 ---
function initEngineBasedOnUrl() {
    const url = window.location.href;

    if (url.includes('gemini.google.com')) {
        console.log('TOKEN-COUNTER: Initializing Gemini engine...');
        initializeGeminiEngine(); 
    } 
    // V17 修复: 'coze' 引擎尚不存在，必须注释掉
    /* else if (url.includes('coze.com')) {
        console.log('TOKEN-COUNTER: Initializing Coze engine...');
        initializeCozeEngine(); 
    }
    */
}

// 页面加载后立即尝试初始化
initEngineBasedOnUrl();

// 监听 URL 变化，例如单页应用中的路由变化
new MutationObserver(() => {
    const newUrl = window.location.href;
    if (window.location.href !== newUrl) { // 检查 URL 是否实际变化
        // 重置状态或重新初始化引擎
        initEngineBasedOnUrl();
    }
}).observe(document, { subtree: true, childList: true });
// src/content/index.ts (V145: 修复导入错误 - 重新定义 MessageType 和 debounce 以解决模块解析问题)

console.log('TOKEN-COUNTER Content Script (V145) is active.'); // 更新版本号

/**
 * 消息类型枚举 (Content Script 独立定义以避免模块解析错误)
 * 仅包含 Content Script 需要用到的 MessageTypes
 */
enum MessageType {
    BG_CALCULATE_TOKENS = 'BG_CALCULATE_TOKENS',
    UPDATE_UI_TOKENS = 'UPDATE_UI_TOKENS',
    UPDATE_UI_COUNTERS = 'UPDATE_UI_COUNTERS',
    UPDATE_UI_MODEL = 'UPDATE_UI_MODEL',
    UPDATE_UI_STATUS = 'UPDATE_UI_STATUS',
    // UI Request: 确保 Content Script 知道这个类型
    REQUEST_INITIAL_STATE = 'REQUEST_INITIAL_STATE', 
}

/**
 * 防抖函数 (Content Script 独立定义以避免模块解析错误)
 */
function debounce<T extends (...args: any[]) => void>(func: T, timeout = 300): (...args: Parameters<T>) => void {
    let timer: number | undefined; 
    
    return (...args: Parameters<T>) => {
        if (timer) {
            clearTimeout(timer); 
        }
        timer = window.setTimeout(() => {
            func(...args);
        }, timeout);
    };
}


/**
 * 引擎映射表：根据 host 动态加载对应的 engine.ts
 */
const ENGINE_MAP = {
    // V145: 导入时不再使用相对路径，而是使用 Content Script 自身的路径
    'gemini.google.com': () => import('./engines/gemini/index'), 
};

const currentHost = window.location.host;

/**
 * 动态加载 Content Script Engine。
 */
async function loadEngine() {
    const loader = ENGINE_MAP[currentHost as keyof typeof ENGINE_MAP];
    
    if (loader) {
        try {
            console.log(`Content: Initializing engine for host: ${currentHost}`);
            
            const module = await loader();
            if (typeof module.initializeGeminiEngine === 'function') {
                // V145: 将共享工具函数和类型注入到引擎模块中
                module.initializeGeminiEngine({ debounce, MessageType }); 
            } else {
                 console.error(`Content Script: Engine module is missing initializeGeminiEngine function.`);
            }
        } catch (error) {
            console.error(`Content Script: Failed to load engine for ${currentHost}`, error);
            // V142 修复: 如果加载失败，通知 UI 等待
            chrome.runtime.sendMessage({ type: MessageType.UPDATE_UI_STATUS, data: { status: 'statusWaiting' } }).catch(() => {});
        }
    } else {
        console.log('Content Script: No specific engine found for this host.');
        // V142 修复: 如果没有匹配的引擎，通知 UI 等待
        chrome.runtime.sendMessage({ type: MessageType.UPDATE_UI_STATUS, data: { status: 'statusWaiting' } }).catch(() => {});
    }
}

// 立即执行加载
loadEngine();

// V145 导出 debounce 和 MessageType，供 Content 引擎文件使用
// 注意: 这种导出只对 Content Script 的子模块有效
export { debounce, MessageType };
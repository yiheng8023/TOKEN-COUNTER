// C:\Projects\TOKEN-COUNTER\src\utils\common.ts
// V1.4: 统一通信协议 (Task 1.4)

/**
 * 消息类型枚举：用于统一所有脚本间的通信类型
 * (Content <-> Background <-> Worker <-> UI)
 */
export enum MessageType {
    // --- UI (Side Panel) -> Background (SW) ---
    /**
     * (UI -> SW) 
     * UI 请求 Service Worker 发送当前所有状态的快照。
     */
    UI_REQUEST_INITIAL_STATE = 'UI_REQUEST_INITIAL_STATE',
    
    // --- Background (SW) -> UI (Side Panel) ---
    /**
     * (SW -> UI) 
     * SW 回复 UI 的请求，发送包含所有当前状态的快照。
     * App.tsx (V168) 依赖此消息。
     */
    BG_SEND_INITIAL_STATE = 'BG_SEND_INITIAL_STATE',
    
    /**
     * (SW -> UI) 
     * Content Script 检测到模型名称发生变化 (例如 "2.5 Pro")，
     * SW 将此新名称转发给 UI。
     * App.tsx (V168) 依赖此消息 (原 UPDATE_UI_MODEL)。
     */
    BG_UPDATE_MODEL_NAME = 'BG_UPDATE_MODEL_NAME',

    /**
     * (SW -> UI) 
     * Content Script 检测到文件计数发生变化，
     * SW 将此新计数转发给 UI。
     * App.tsx (V168) 依赖此消息 (原 UPDATE_UI_COUNTERS)。
     */
    BG_UPDATE_FILE_COUNT = 'BG_UPDATE_FILE_COUNT',
    
    /**
     * (SW -> UI) 
     * Content Script 检测到文本 Token 发生变化，
     * SW 将此新计数转发给 UI。
     * App.tsx (V168) 依赖此消息 (原 UPDATE_UI_TOKENS)。
     */
    BG_UPDATE_TEXT_TOKENS = 'BG_UPDATE_TEXT_TOKENS',

    /**
     * (SW -> UI) 
     * SW (或 Model Worker) 正在执行一个耗时操作 (如加载模型、计算)。
     * App.tsx (V168) 依赖此消息 (原 UPDATE_UI_STATUS)。
     */
    BG_UPDATE_STATUS_BUSY = 'BG_UPDATE_STATUS_BUSY',
    
    /**
     * (SW -> UI) 
     * SW (或 Model Worker) 已完成耗时操作，返回就绪状态。
     * App.tsx (V168) 依赖此消息 (原 UPDATE_UI_STATUS)。
     */
    BG_UPDATE_STATUS_READY = 'BG_UPDATE_STATUS_READY',

    // --- Content Script -> Background (SW) ---
    /**
     * (Content -> SW) 
     * Content Script 发送它抓取到的所有数据。
     */
    CS_SEND_GEMINI_DATA = 'CS_SEND_GEMINI_DATA',
}


/**
 * 防抖函数：确保频繁触发的事件 (如 MutationObserver) 不会过度消耗资源。
 * (V1.4: 从 V142 保留，Content Script 将需要它)
 */
export function debounce<T extends (...args: any[]) => void>(func: T, timeout = 300): (...args: Parameters<T>) => void {
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
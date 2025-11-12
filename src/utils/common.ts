// C:\Projects\TOKEN-COUNTER\src\utils\common.ts
// V6.2 (Task P1.2): 修复 MessageType 定义

/**
 * 消息类型枚举：用于统一所有脚本间的通信类型
 */
export enum MessageType {
    // --- UI (Side Panel) -> Background (SW) ---
    UI_REQUEST_INITIAL_STATE = 'UI_REQUEST_INITIAL_STATE',
    
    // --- Content Script -> Background (SW) ---
    CS_SEND_DATA = 'CS_SEND_DATA',
    /**
     * (CS -> SW) 
     * Content Script 发送 Keep-Alive Ping 消息，确保 Service Worker 不被杀死。
     */
    CS_PING_SW = 'CS_PING_SW', // <--- V6.2 修复

    // --- Worker -> Background (SW) -> UI ---
    WORKER_STATUS_INIT = 'WORKER_STATUS_INIT',
    WORKER_STATUS_BUSY = 'WORKER_STATUS_BUSY',
    WORKER_SEND_STATE = 'WORKER_SEND_STATE',
}


/**
 * 防抖函数 (V1.4: 保留)
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
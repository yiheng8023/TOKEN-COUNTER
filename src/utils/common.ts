// C:\Projects\TOKEN-COUNTER\src\utils\common.ts
// 恢复原始代码。
// "debounce" 现在是安全的，因为它不再被 SW 共享。

export enum MessageType {
    UI_REQUEST_INITIAL_STATE = 'UI_REQUEST_INITIAL_STATE',
    SW_SEND_STATE = 'SW_SEND_STATE',
    CS_UPDATE_MODEL_NAME = 'CS_UPDATE_MODEL_NAME', 
    CS_SEND_TOKEN_DATA = 'CS_SEND_TOKEN_DATA',
    SW_SEND_LOG = 'SW_SEND_LOG',
    CS_SEND_LOG = 'CS_SEND_LOG',
}

export function debounce<T extends (...args: any[]) => void>(func: T, timeout = 300): (...args: Parameters<T>) => void {
    let timer: any; // 修复 TS2322
    
    return (...args: Parameters<T>) => {
        if (timer) {
            clearTimeout(timer); 
        }
        // 原始代码 (window.) 也是安全的，但为保险起见移除
        timer = setTimeout(() => {
            func(...args);
        }, timeout);
    };
}
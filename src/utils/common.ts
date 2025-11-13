// C:\Projects\TOKEN-COUNTER\src\utils\common.ts
// V14.1 (Task P-FIX): 修复 debounce 导出和消息类型

export enum MessageType {
    UI_REQUEST_INITIAL_STATE = 'UI_REQUEST_INITIAL_STATE',
    SW_SEND_STATE = 'SW_SEND_STATE',
    // V13.1 恢复: 用于模型名称的 DOM 监听 (已删除)
    // CS_UPDATE_MODEL_NAME = 'CS_UPDATE_MODEL_NAME', 
}

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
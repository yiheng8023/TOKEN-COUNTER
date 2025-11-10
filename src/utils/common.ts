// src/utils/common.ts (V142: 共享类型和工具)

/**
 * 消息类型枚举：用于统一所有脚本间的通信类型 (Content <-> Background <-> Offscreen <-> UI)
 */
export enum MessageType {
    // 1. Content Script 发送给 Background 的计算请求
    BG_CALCULATE_TOKENS = 'BG_CALCULATE_TOKENS',
    
    // 2. Background 发送给 Offscreen 的请求
    OFFSCREEN_CALCULATE_TOKENS = 'OFFSCREEN_CALCULATE_TOKENS',
    
    // 3. Offscreen 回复 Background 的计算结果
    OFFSCREEN_CALCULATE_TOKENS_RESPONSE = 'OFFSCREEN_CALCULATE_TOKENS_RESPONSE',
    
    // 4. Background/Content 发送给 UI 的更新消息
    UPDATE_UI_TOKENS = 'UPDATE_UI_TOKENS',
    UPDATE_UI_COUNTERS = 'UPDATE_UI_COUNTERS',
    UPDATE_UI_MODEL = 'UPDATE_UI_MODEL',
    UPDATE_UI_STATUS = 'UPDATE_UI_STATUS',
    
    // 5. UI 请求初始状态
    REQUEST_INITIAL_STATE = 'REQUEST_INITIAL_STATE',
}

/**
 * 防抖函数：确保频繁触发的事件 (如 MutationObserver) 不会过度消耗资源。
 */
export function debounce<T extends (...args: any[]) => void>(func: T, timeout = 300): (...args: Parameters<T>) => void {
    let timer: number | undefined; 
    
    return (...args: Parameters<T>) => {
        if (timer) {
            // V142 修复: 清除 TypeScript 的 window.setTimeout/NodeJS.Timeout 类型不匹配问题
            clearTimeout(timer); 
        }
        timer = window.setTimeout(() => {
            func(...args);
        }, timeout);
    };
}
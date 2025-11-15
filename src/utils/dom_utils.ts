// C:\Projects\TOKEN-COUNTER\src\utils\dom_utils.ts
// (新文件)
// 包含所有依赖 DOM/Window 的工具 (例如 setTimeout)

export function debounce<T extends (...args: any[]) => void>(func: T, timeout = 300): (...args: Parameters<T>) => void {
    // 类型改为 'any' 以兼容 Node.js (Timeout) 和浏览器 (number)
    let timer: any; 
    
    return (...args: Parameters<T>) => {
        if (timer) {
            clearTimeout(timer); 
        }
        // 直接使用全局 setTimeout
        timer = setTimeout(() => {
            func(...args);
        }, timeout);
    };
}
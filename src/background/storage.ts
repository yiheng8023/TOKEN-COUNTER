// src/background/storage.ts (V147: 修复 "unknown" 错误)

// ============== 辅助函数：类型守卫 ==============
// V147 关键修复: 检查错误对象是否是标准的 Error 类型
function isError(e: unknown): e is Error {
    return e instanceof Error;
}

// 定义存储键和默认值
const STORAGE_KEYS = {
    TOKEN_COUNT: 'token_count_state',
    AUDIT_LOG: 'audit_log'
};

// --- 数据结构定义 ---
export interface TokenCountState {
    total: number;
    lastUpdated: number; // Unix timestamp
}

export interface AuditLogEntry {
    timestamp: number;
    level: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
    details?: string;
}

const MAX_LOG_ENTRIES = 50; // 限制日志条目数量

// --- Token 状态管理 ---

/**
 * V147: 从 chrome.storage 加载上次保存的 Token 状态。
 */
export async function loadTokenState(): Promise<TokenCountState> {
    const defaultState: TokenCountState = { total: 0, lastUpdated: 0 };
    try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.TOKEN_COUNT);
        return (result[STORAGE_KEYS.TOKEN_COUNT] || defaultState) as TokenCountState;
    } catch (e) {
        console.error('Storage: Failed to load token state. Using default.', e);
        return defaultState;
    }
}

/**
 * V147: 将当前的 Token 状态保存到 chrome.storage。
 */
export async function saveTokenState(count: number): Promise<void> {
    const newState: TokenCountState = {
        total: count,
        lastUpdated: Date.now()
    };
    try {
        await chrome.storage.local.set({ [STORAGE_KEYS.TOKEN_COUNT]: newState });
    } catch (e) {
        console.error('Storage: Failed to save token state.', e);
    }
}

// --- 审计日志管理 ---

/**
 * V147: 记录一条审计日志。
 */
export async function logAudit(level: AuditLogEntry['level'], message: string, details?: string): Promise<void> {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.AUDIT_LOG);
        const currentLog: AuditLogEntry[] = (result[STORAGE_KEYS.AUDIT_LOG] || []) as AuditLogEntry[];

        const newEntry: AuditLogEntry = {
            timestamp: Date.now(),
            level: level,
            message: message,
            details: details
        };

        // 添加新条目并保持最大长度 (Req 7 容错)
        currentLog.push(newEntry);
        if (currentLog.length > MAX_LOG_ENTRIES) {
            currentLog.shift(); // 移除最旧的条目
        }

        await chrome.storage.local.set({ [STORAGE_KEYS.AUDIT_LOG]: currentLog });
    } catch (e) {
        console.error('Storage: Failed to record audit log.', e);
    }
}

// ------------------------------------
// V147: 导出日志快捷方式
// ------------------------------------
export const Logger = {
    error: (msg: string, e: unknown) => { // V147 修复: 接受 unknown
        const details = isError(e) ? e.message : String(e);
        logAudit('ERROR', msg, details);
    },
    warning: (msg: string, details?: string) => logAudit('WARNING', msg, details),
    info: (msg: string, details?: string) => logAudit('INFO', msg, details),
};
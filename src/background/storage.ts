// C:\Projects\TOKEN-COUNTER\src\background\storage.ts
// V28.0 (Final Fix): 确保所有存储键和语言加载逻辑正确

// ============== 辅助函数：类型守卫 ==============
function isError(e: unknown): e is Error {
    return e instanceof Error;
}

// 定义存储键和默认值
const STORAGE_KEYS = {
    TOKEN_COUNT: 'token_count_state', 
    AUDIT_LOG: 'audit_log',
    USER_LANGUAGE: 'user_language' // <-- 语言设置的存储键
};

// --- 数据结构定义 (与 index.ts 保持严格同步) ---
export interface TokenCountState {
    model: string;
    maxTokens: number; 
    inputText: number;
    inputFile: number;
    thinking: number;
    outputText: number;
    outputFile: number;
    total: number;
}

export interface AuditLogEntry {
    timestamp: number;
    level: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
    details?: string;
}

const MAX_LOG_ENTRIES = 50; 

// --- Token 状态管理 ---

/**
 * 从 chrome.storage 加载上次保存的完整 Token 状态。
 */
export async function loadTokenState(defaultState: TokenCountState): Promise<TokenCountState> {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.TOKEN_COUNT);
        const storedState = result[STORAGE_KEYS.TOKEN_COUNT] as TokenCountState;
        
        if (storedState && typeof storedState.total === 'number') {
            return { ...defaultState, ...storedState };
        }
        return defaultState;
    } catch (e) {
        console.error('Storage: Failed to load token state. Using default.', e);
        return defaultState;
    }
}

/**
 * 将当前的 Token 状态保存到 chrome.storage。
 */
export async function saveTokenState(state: TokenCountState): Promise<void> {
    try {
        await chrome.storage.local.set({ [STORAGE_KEYS.TOKEN_COUNT]: state });
    } catch (e) {
        console.error('Storage: Failed to save token state.', e);
    }
}

// --- 语言设置管理 ---

/**
 * V25.0: 加载用户语言设置。返回 'zh_CN', 'zh_TW', 'en' 或 null (如果选择了默认或未设置)。
 */
export async function loadUserLanguage(): Promise<string | null> {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.USER_LANGUAGE);
        // 确保返回 'zh_CN', 'zh_TW', 或 'en' 格式
        const lang = result[STORAGE_KEYS.USER_LANGUAGE];
        if (lang === 'zh_CN' || lang === 'zh_TW' || lang === 'en') {
            return lang;
        }
        // 如果存储中没有值，或者值不是有效的语言代码 (如用户选择了 'default')，则返回 null。
        return null;
    } catch (e) {
        console.error('Storage: Failed to load user language.', e);
        return null;
    }
}


// --- 审计日志管理 ---
// ... (logAudit 和 Logger 保持不变)
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

        currentLog.push(newEntry);
        if (currentLog.length > MAX_LOG_ENTRIES) {
            currentLog.shift();
        }

        await chrome.storage.local.set({ [STORAGE_KEYS.AUDIT_LOG]: currentLog });
    } catch (e) {
        console.error('Storage: Failed to record audit log.', e);
    }
}

export const Logger = {
    error: (msg: string, e: unknown) => { 
        const details = isError(e) ? e.message : String(e);
        logAudit('ERROR', msg, details);
    },
    warning: (msg: string, details?: string) => logAudit('WARNING', msg, details),
    info: (msg: string, details?: string) => logAudit('INFO', msg, details),
};
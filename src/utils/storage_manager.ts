// C:\Projects\TOKEN-COUNTER\src\utils\storage_manager.ts
// [!! 架构 V3.0: 完美解耦 !!]

// 1. 存储键 (零配置 V1)
export const STORAGE_KEYS = {
    TOKEN_COUNT: 'token_count_state'
};

// 2. 核心数据结构 (完美方案 V1)
export interface TokenCountState {
    model: string;
    maxTokens: number; 
    alertThreshold: number;
    inputText: number;
    thinking: number;
    outputText: number;
    overhead: number; 
    total: number;
}

// 3. 模型规则 (V3.0: 外部定义)
// 这个文件现在只定义“接口”，不再“实现”
export interface ModelRules {
    VERSION: string;
    DEFAULT_MODEL_NAME: string;
    MODELS: {
        [key: string]: {
            MAX_TOKENS: number;
            ALERT_THRESHOLD: number;
        };
    };
    COST_RULES?: {};
}

// [!! 关键修改: 移除 getModelRules() !!]

// 4. 状态管理
// [!! 关键修改: createDefaultState 现在是 100% 通用的 !!]
export async function createDefaultState(): Promise<TokenCountState> {
    // 它不再需要读取任何文件，只返回一个“空”状态。
    // 真正的模型规则将在第一次 processTokenUpdate 时被注入。
    return {
        model: "Unknown",
        maxTokens: 1000000, // 默认给一个大值
        alertThreshold: 0.8,
        inputText: 0,
        thinking: 0,
        outputText: 0,
        overhead: 0,
        total: 0
    };
}

// (安全存储函数 ... 保持不变)
async function safeStorageSet(data: { [key: string]: any }): Promise<void> {
    try {
        await chrome.storage.local.set(data);
    } catch (error) {
        if (String(error).includes('Extension context invalidated')) {
            console.warn("TOKEN-COUNTER: Storage write failed (context invalidated). Data may be stale.");
        } else {
            console.error("TOKEN-COUNTER: Failed to write to storage:", error);
        }
    }
}

async function safeStorageGet(key: string): Promise<any> {
    try {
        const result = await chrome.storage.local.get(key);
        return result[key];
    } catch (error) {
        if (String(error).includes('Extension context invalidated')) {
            console.warn("TOKEN-COUNTER: Storage read failed (context invalidated).");
        } else {
            console.error("TOKEN-COUNTER: Failed to read from storage:", error);
        }
        return undefined;
    }
}

// [!! 关键修改: loadTokenState 现在完全解耦 !!]
export async function loadTokenState(): Promise<TokenCountState> {
    let state = await safeStorageGet(STORAGE_KEYS.TOKEN_COUNT);
    if (!state) {
        state = await createDefaultState(); // 调用 100% 通用的 createDefaultState
        await safeStorageSet({ [STORAGE_KEYS.TOKEN_COUNT]: state });
    }
    return state as TokenCountState;
}

// 接口 (保持不变)
export interface TokenProcessingData {
    tokens?: {
        input: number;
        thinking: number;
        output: number;
        total: number; 
    };
    modelName?: string;
    reset?: boolean;
}

// [!! 关键修改: processTokenUpdate 现在接收 modelRules 作为参数 !!]
export async function processTokenUpdate(
    data: TokenProcessingData, 
    modelRules: ModelRules // “适配器”必须提供这个参数
): Promise<void> {
    
    try {
        let currentState = await loadTokenState();
        // [!! 关键修改: 不再调用 getModelRules() !!]
        // const modelRules = await getModelRules(); 

        // 1. 处理重置请求 (保持不变)
        if (data.reset) {
            currentState.inputText = 0;
            currentState.thinking = 0;
            currentState.outputText = 0;
            currentState.overhead = 0; 
            currentState.total = 0;    
        }
        
        // 2. 处理模型名称更新 (保持不变)
        // 它现在使用您传入的 modelRules 参数，非常健壮！
        if (data.modelName && data.modelName !== currentState.model) {
            currentState.model = data.modelName;
            
            const modelEntry = modelRules.MODELS[data.modelName];
            if (modelEntry) {
                currentState.maxTokens = modelEntry.MAX_TOKENS;
                currentState.alertThreshold = modelEntry.ALERT_THRESHOLD;
            } else {
                const defaultModel = modelRules.MODELS[modelRules.DEFAULT_MODEL_NAME];
                currentState.maxTokens = defaultModel.MAX_TOKENS;
                currentState.alertThreshold = defaultModel.ALERT_THRESHOLD;
            }
            currentState.inputText = 0;
            currentState.thinking = 0;
            currentState.outputText = 0;
            currentState.overhead = 0; 
            currentState.total = 0;    
        }

        // 3. 处理 Token 更新 (保持不变)
        if (data.tokens && data.tokens.total > 0) {
            
            currentState.inputText += data.tokens.input;
            currentState.thinking += data.tokens.thinking;
            currentState.outputText += data.tokens.output;
            
            const partsSum = data.tokens.input + data.tokens.thinking + data.tokens.output;
            const callOverhead = data.tokens.total - partsSum;
            
            if (callOverhead > 0) {
                currentState.overhead += callOverhead;
            }

            currentState.total += data.tokens.total;
        }

        // 4. 保存状态 (保持不变)
        await safeStorageSet({ [STORAGE_KEYS.TOKEN_COUNT]: currentState });

    } catch (error) {
        console.error("TOKEN-COUNTER: Fatal error in processTokenUpdate:", error);
    }
}
// C:\Projects\TOKEN-COUNTER\src\background\modelWorker.ts
// V3.4 (Task P-DATA): "新思路"
// 1. (P1.1a) *升级* Worker 为 "计算大脑"
// 2. (P1.1a) Worker 负责*所有*状态计算
// 3. (P1.3) Worker 负责*所有*状态广播

import { PreTrainedTokenizer } from '@xenova/transformers';
import { MessageType } from '../utils/common'; // V3.4

const CDN_BASE_PATH = "https://cdn.jsdelivr.net/gh/yiheng8023/TOKEN-COUNTER@main/model_cdn/";

// V3.4: (P1.1a 修复) 定义 Worker 状态
interface WorkerState {
    model: string;
    textTokens: number;
    fileCount: number;
}

/**
 * V3.4: "计算大脑"
 */
class TokenizerManager {
    private tokenizers: Map<string, PreTrainedTokenizer> = new Map();
    private loadingPromises: Map<string, Promise<PreTrainedTokenizer>> = new Map();
    
    // V3.4 (P1.1a 修复): Worker 现在是有状态的
    private lastState: WorkerState = {
        model: 'Gemini 2.5 Pro',
        textTokens: 0,
        fileCount: 0,
    };
    
    // V2.4 (P-MODEL) (保留)
    private mapModelToFolder(modelName: string): string {
        const lowerName = modelName.toLowerCase();
        if (lowerName.includes('gemini')) {
            return 'gemini';
        }
        return modelName;
    }


    /**
     * V3.4: 获取 Tokenizer (核心)
     */
    private async getTokenizer(modelName: string): Promise<PreTrainedTokenizer> {
        if (this.tokenizers.has(modelName)) {
            return this.tokenizers.get(modelName)!;
        }
        if (this.loadingPromises.has(modelName)) {
            return this.loadingPromises.get(modelName)!;
        }

        console.log(`ModelManager (V3.4): 正在为 "${modelName}" 手动 fetch 模型...`);
        
        // V3.4 (P1.3 修复): 广播 "初始化中"
        self.postMessage({ type: MessageType.WORKER_STATUS_INIT });

        const folderName = this.mapModelToFolder(modelName);
        const modelPath = `${CDN_BASE_PATH}${folderName}/`;

        const promise = (async () => {
            try {
                const [tokenizerJson, tokenizerConfig, specialTokens] = await Promise.all([
                    (await fetch(`${modelPath}tokenizer.json`)).json(),
                    (await fetch(`${modelPath}tokenizer_config.json`)).json(),
                    (await fetch(`${modelPath}special_tokens_map.json`)).json()
                ]);
                
                const tokenizer = new PreTrainedTokenizer(tokenizerJson, tokenizerConfig);
                if (specialTokens) {
                    tokenizer.special_tokens = specialTokens;
                }
                
                this.tokenizers.set(modelName, tokenizer); 
                this.loadingPromises.delete(modelName); 
                
                console.log(`ModelManager (V3.4): 模型 "${modelName}" 手动实例化完毕。`);
                
                // V3.4: (P1.3 修复) 广播 "就绪" (通过发送状态)
                this.broadcastState(); 
                
                return tokenizer;

            } catch (e: any) {
                this.loadingPromises.delete(modelName); 
                console.error(`ModelManager (V3.4): 模型 "${modelName}" 失败!`, e);
                // V3.4: (P1.3 修复) 广播 "就绪" (即使失败)
                this.broadcastState(); 
                throw e; 
            }
        })();

        this.loadingPromises.set(modelName, promise); 
        return promise;
    }
    
    /**
     * V3.4: 广播*完整*状态 (P1.1a 修复)
     */
    private broadcastState() {
        self.postMessage({
            type: MessageType.WORKER_SEND_STATE,
            payload: this.lastState
        });
    }

    /**
     * V3.4: 计算 Token (P1.1a 修复)
     */
    private async calculateTokens(modelName: string, text: string, fileCount: number): Promise<void> {
        try {
            // V3.4 (P1.3 修复): 广播 "计算中"
            self.postMessage({ type: MessageType.WORKER_STATUS_BUSY });
            
            const tokenizer = await this.getTokenizer(modelName);
            
            const tokens = tokenizer.encode(text);
            const tokenCount = tokens.length;
            
            // V3.4 (P1.1a 修复): 更新*所有*状态
            this.lastState = {
                model: modelName,
                textTokens: tokenCount,
                fileCount: fileCount // P1.1a 修复
            };

        } catch (e: any) {
            console.error("ModelManager (V3.4): 计算失败", e);
            // V3.4 (P1.1a 修复): 即使失败也更新
            this.lastState.model = modelName;
            this.lastState.fileCount = fileCount; 
        } finally {
            // V3.4 (P1.3 修复): 广播 "就绪" (通过发送状态)
            this.broadcastState();
        }
    }

    /**
     * V3.4: 处理来自 SW 的消息
     */
    public onMessage(event: MessageEvent): void {
        const { type, payload } = event.data;

        // V3.4 (P1.1a 修复): 来自 CS 的数据
        if (type === MessageType.CS_SEND_DATA) {
            if (payload) {
                this.calculateTokens(
                    payload.modelName || this.lastState.model, 
                    payload.textToCalculate || "", 
                    payload.fileCount || 0
                );
            }
        }
        
        // V3.4 (P1.3 修复): 来自 UI 的请求
        if (type === MessageType.UI_REQUEST_INITIAL_STATE) {
            // UI 刚刚启动，发送 Worker 的最后已知状态
            this.broadcastState();
        }
    }
}

// -----------------------------------------------------------------
// 实例化 Worker 并监听消息
// -----------------------------------------------------------------
const managerInstance = new TokenizerManager();
self.onmessage = (event) => {
    managerInstance.onMessage(event);
};
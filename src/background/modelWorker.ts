// C:\Projects\TOKEN-COUNTER\src\background\modelWorker.ts
// V1.3: 切换到 jsDelivr CDN 方案，解决全球（含中国）网络问题

import { AutoTokenizer, PreTrainedTokenizer } from '@xenova/transformers';

// 关键：在 Worker 内部设置 transformers.js 的配置
import { env } from '@xenova/transformers';
env.allowLocalModels = false; // 严格禁止本地加载
env.allowRemoteModels = true; // 允许从远程 URL 加载

// -----------------------------------------------------------------
// 任务 1.3 核心：
// 我们不再使用 "google/gemini-pro" (Hugging Face)
// 而是使用我们自己的、全球加速的 jsDelivr CDN 地址。
// -----------------------------------------------------------------
const MODEL_ID = "https://cdn.jsdelivr.net/gh/yiheng8023/TOKEN-COUNTER@main/model_cdn/";


/**
 * 这是一个单例模式 (Singleton) 的实现。
 * 无论 Service Worker 如何启动和停止，
 * 这个 Worker 都会在后台加载模型一次，并始终持有它。
 */
class ModelWorkerSingleton {
  private tokenizer: PreTrainedTokenizer | null = null;
  private modelLoadingPromise: Promise<void> | null = null;

  constructor() {
    console.log(`Model Worker (V1.3): 已启动。开始从 CDN 加载模型: ${MODEL_ID}`);
    // 立即开始加载模型
    this.modelLoadingPromise = this.loadModel();
  }

  /**
   * 加载 Tokenizer
   */
  private async loadModel(): Promise<void> {
    try {
      // 关键: transformers.js 会自动从此 URL 寻找 tokenizer.json 和 config.json
      this.tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, {
        // 进度回调，发送给 Service Worker
        progress_callback: (progress: any) => {
          self.postMessage({
            type: 'model_loading_progress',
            payload: progress,
          });
        }
      });
      
      console.log('Model Worker (V1.3): Tokenizer 从 CDN 加载并缓存完毕。');
      // 发送加载成功消息
      self.postMessage({ type: 'model_loaded' });

    } catch (e: any) {
      console.error(`Model Worker (V1.3): CDN 模型加载失败 (${MODEL_ID})`, e);
      // 发送加载失败消息
      self.postMessage({ type: 'model_load_error', error: e.message });
    }
  }

  /**
   * 计算 Token 的核心方法
   */
  private async calculateTokens(text: string): Promise<void> {
    // 如果模型还在加载，等待它加载完成
    if (this.modelLoadingPromise) {
      await this.modelLoadingPromise;
    }

    // 如果 Tokenizer 不存在（加载失败），则抛出错误
    if (!this.tokenizer) {
      self.postMessage({
        type: 'token_calculation_error',
        error: 'Tokenizer 未加载，无法计算。'
      });
      return;
    }

    try {
      // 执行 Token 计算
      const tokens = this.tokenizer.encode(text);
      const tokenCount = tokens.length;
      
      // 将结果发回
      self.postMessage({
        type: 'token_calculation_complete',
        payload: { tokenCount, text }
      });

    } catch (e: any) {
      self.postMessage({
        type: 'token_calculation_error',
        error: e.message
      });
    }
  }

  /**
   * 处理来自 Service Worker 的消息
   */
  public onMessage(event: MessageEvent): void {
    const { type, payload } = event.data;

    if (type === 'calculate_tokens') {
      this.calculateTokens(payload.text);
    }
  }
}

// -----------------------------------------------------------------
// 实例化 Worker 并监听消息
// -----------------------------------------------------------------
const workerInstance = new ModelWorkerSingleton();
self.onmessage = (event) => {
  workerInstance.onMessage(event);
};
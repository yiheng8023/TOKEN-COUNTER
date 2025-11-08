// src/engine/core.ts (V116 "黄金"版 - 100% 修复作用域)
import { PreTrainedTokenizer } from '@xenova/transformers';

// -----------------------------------------------------------------------------
// "世界级"的 V116 "Vite 导入"
// -----------------------------------------------------------------------------
import tokenizerJson from './models/tokenizer.json';
import tokenizerConfig from './models/tokenizer_config.json'; 
import specialTokens from './models/special_tokens_map.json'; 
// -----------------------------------------------------------------------------


/**
 * "世界级"的 V116 单例模式 (100% 离线)
 */
class TokenizerEngine {
  private static instance: PreTrainedTokenizer | null = null;

  /**
   * 获取 Tokenizer 实例 (异步)
   */
  public static async getInstance(): Promise<PreTrainedTokenizer> {
    if (this.instance) {
      return this.instance;
    }
    
    // 关键 (V116 修复): 声明 tokenizer 变量在 try/catch 外部
    let tokenizer: PreTrainedTokenizer; 

    try {
      console.log('TokenizerEngine (V116): 正在 "Offscreen" 中 "手动" new (接收)...');
      
      // 赋值给外部声明的 tokenizer
      tokenizer = new PreTrainedTokenizer(tokenizerJson, tokenizerConfig);
      
      if (specialTokens) {
        tokenizer.special_tokens = specialTokens;
      }

      this.instance = tokenizer;
      console.log('TokenizerEngine (V116): "Offscreen" "手动" new 成功。');
      return this.instance;
      
    } catch (e) {
      console.error('TokenizerEngine (V116): "Offscreen" "手动" new 失败!', e);
      throw e; 
    }
  }

  public static async calculateTokens(text: string): Promise<number> {
    // 关键 (V116 修复): 由于 getInstance 现在 100% 确保成功或抛出错误，
    // 我们可以安全地断言它不是 null。
    const tokenizer = await this.getInstance() as PreTrainedTokenizer; 
    
    try {
      const tokens = tokenizer.encode(text);
      return tokens.length;
    } catch (e) {
      console.error('TokenizerEngine (V116): 计算失败!', e);
      return 0;
    }
  }
}

// -----------------------------------------------------------------------------
//  V3 Offscreen (屏外) 通信
// -----------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CALCULATE_TOKENS') {
    (async () => {
      const tokenCount = await TokenizerEngine.calculateTokens(message.text);
      sendResponse({ tokenCount });
    })();
    return true; 
  }
});
// 立即预热 Tokenizer
TokenizerEngine.getInstance();

export default TokenizerEngine;
// src/engine/core.ts (V122 "黄金"版 - 100% 修复精度)
import { PreTrainedTokenizer } from '@xenova/transformers';

// -----------------------------------------------------------------------------
// "世界级"的 V122 "Vite 导入"
// -----------------------------------------------------------------------------
import tokenizerJson from './models/tokenizer.json';
import tokenizerConfig from './models/tokenizer_config.json'; 
import specialTokens from './models/special_tokens_map.json'; 
// -----------------------------------------------------------------------------


/**
 * "世界级"的 V122 单例模式 (100% 离线)
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
    
    let tokenizer: PreTrainedTokenizer; 

    try {
      console.log('TokenizerEngine (V122): 正在 "Offscreen" 中 "手动" new (接收)...');
      
      tokenizer = new PreTrainedTokenizer(tokenizerJson, tokenizerConfig);
      
      if (specialTokens) {
        tokenizer.special_tokens = specialTokens;
      }

      this.instance = tokenizer;
      console.log('TokenizerEngine (V122): "Offscreen" "手动" new 成功。');
      return this.instance;
      
    } catch (e) {
      console.error('TokenizerEngine (V122): "Offscreen" "手动" new 失败!', e);
      throw e; 
    }
  }

  public static async calculateTokens(text: string): Promise<number> {
    const tokenizer = await this.getInstance() as PreTrainedTokenizer; 
    
    try {
      const tokens = tokenizer.encode(text);
      return tokens.length;
    } catch (e) {
      console.error('TokenizerEngine (V122): 计算失败!', e);
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
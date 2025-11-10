// src/engine/index.ts (V113 "黄金"版 - 100% 修复路径)
import { PreTrainedTokenizer } from '@xenova/transformers';

// -----------------------------------------------------------------------------
// "世界级"的 V113 "Vite 导入"
// -----------------------------------------------------------------------------
// 关键 (V113): 路径现在是正确的: "./models/gemini/..."
import tokenizerJson from './models/gemini/tokenizer.json';
import tokenizerConfig from './models/gemini/tokenizer_config.json'; 
import specialTokens from './models/gemini/special_tokens_map.json'; 
// -----------------------------------------------------------------------------


/**
 * "世界级"的 V113 单例模式 (100% 离线)
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

    try {
      console.log('TokenizerEngine (V113): MANUAL IMPORT SUCCESSFUL.');
      
      const tokenizer = new PreTrainedTokenizer(tokenizerJson, tokenizerConfig);
      
      if (specialTokens) {
        tokenizer.special_tokens = specialTokens;
      }

      this.instance = tokenizer;
      console.log('TokenizerEngine (V113): TOKENIZER INSTANCE CREATED.');
      return this.instance;
      
    } catch (e) {
      console.error('TokenizerEngine (V113): FAILED TO INIT.', e);
      throw e;
    }
  }

  /**
   * 核心功能 (Req 2): 精确计算
   */
  public static async calculateTokens(text: string): Promise<number> {
    try {
      const tokenizer = await this.getInstance();
      const tokens = tokenizer.encode(text);
      return tokens.length;
    } catch (e) {
      console.error('TokenizerEngine (V113): 计算失败!', e);
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
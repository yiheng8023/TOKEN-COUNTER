// src/engine/index.ts (V115: 修复 R1 致命逻辑 - 修正 "黑洞" 回复机制)
import { PreTrainedTokenizer } from '@xenova/transformers';

// -----------------------------------------------------------------------------
// V113 "Vite 导入" (经验证可工作)
// -----------------------------------------------------------------------------
import tokenizerJson from './models/gemini/tokenizer.json';
import tokenizerConfig from './models/gemini/tokenizer_config.json'; 
import specialTokens from './models/gemini/special_tokens_map.json'; 
// -----------------------------------------------------------------------------

/**
 * 消息类型枚举 (Engine Script 独立定义以避免模块解析错误)
 */
enum MessageType {
    // 监听来自 Background 的计算请求
    OFFSCREEN_CALCULATE_TOKENS = 'OFFSCREEN_CALCULATE_TOKENS',
    // 回复给 Background 的计算结果
    OFFSCREEN_CALCULATE_TOKENS_RESPONSE = 'OFFSCREEN_CALCULATE_TOKENS_RESPONSE',
}


/**
 * "世界级"的 V113 单例模式 (经验证可工作)
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
      console.log('TokenizerEngine (V115): MANUAL IMPORT SUCCESSFUL.');
      
      const tokenizer = new PreTrainedTokenizer(tokenizerJson, tokenizerConfig);
      
      if (specialTokens) {
        tokenizer.special_tokens = specialTokens;
      }

      this.instance = tokenizer;
      console.log('TokenizerEngine (V115): TOKENIZER INSTANCE CREATED.');
      return this.instance;
      
    } catch (e) {
      console.error('TokenizerEngine (V115): FAILED TO INIT.', e);
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
      console.error('TokenizerEngine (V115): 计算失败!', e);
      return 0;
    }
  }
}

// -----------------------------------------------------------------------------
//  V3 Offscreen (屏外) 通信
// -----------------------------------------------------------------------------
console.log('TokenizerEngine (V115): 正在设置 onMessage 监听器...');

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  
  // V114 (R1-F) 修复: 监听正确的类型
  if (message.type === MessageType.OFFSCREEN_CALCULATE_TOKENS) {
    
    console.log(`TokenizerEngine (V115): 收到计算请求 (长度: ${message.text?.length || 0})`);
    
    (async () => {
      try {
        const tokenCount = await TokenizerEngine.calculateTokens(message.text);
        
        console.log(`TokenizerEngine (V115): 计算完成 (Tokens: ${tokenCount})`);
        
        // V115 (R1-F) 致命 Bug 修复: 
        // 必须使用 chrome.runtime.sendMessage 发送一个 *新* 消息,
        // 而不是使用 sendResponse() 回复。
        // 这样 Background (V154) 的监听器才能收到它。
        chrome.runtime.sendMessage({ 
            type: MessageType.OFFSCREEN_CALCULATE_TOKENS_RESPONSE,
            tokenCount: tokenCount 
        }).catch(e => {
            console.error('TokenizerEngine (V115): 无法将结果发送回 Background!', e);
        });
        
      } catch (e) {
        console.error('TokenizerEngine (V115): 异步计算/回复失败', e);
        chrome.runtime.sendMessage({ 
            type: MessageType.OFFSCREEN_CALCULATE_TOKENS_RESPONSE,
            tokenCount: 0 
        }).catch(() => {}); // 失败时也发送 0
      }
    })();
    
    // V115 修复: 我们不再使用异步 sendResponse，因此必须移除 'return true'
    // 否则会导致 'message channel closed' 错误
    return false; 
  }
  
  // 明确拒绝其他所有消息
  return false; 
});

// 立即预热 Tokenizer (V113 验证有效)
TokenizerEngine.getInstance().catch(e => {
    console.error("TokenizerEngine (V115): 预热失败 (已捕获)", e);
});
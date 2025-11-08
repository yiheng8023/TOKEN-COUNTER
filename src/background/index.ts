// src/background/index.ts (V110 "纯净"版)

console.log('TOKEN-COUNTER Service Worker (V110) is running.');

const OFFSCREEN_DOCUMENT_PATH = 'src/engine/offscreen.html';

/**
 * "世界级" (Req 7): 查找或创建 Offscreen 文档
 */
async function getOrCreateOffscreenDocument(): Promise<boolean> {
  // 1. 检查是否已存在
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  });

  if (existingContexts.length > 0) {
    return true;
  }

  // 2. 如果不存在，则创建
  console.log('Offscreen document 不存在，正在创建...');
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.IFRAME_SCRIPTING], // V24 修复
      justification: 'Tokenizer engine requires DOM APIs (not available in SW)',
    });
    console.log('Offscreen document 创建成功。');
    return true;
  } catch (error) {
    console.error('Offscreen document 创建失败:', error);
    return false;
  }
}

/**
 * "世界级" (Req 2): 封装计算请求
 */
async function requestTokenCalculation(text: string): Promise<number> {
  // 1. (V110) 确保 Offscreen 引擎正在运行
  await getOrCreateOffscreenDocument();

  // 2. (V110) 将文本发送到 Offscreen 引擎
  console.log('Background (V110): 正在向 Offscreen 发送计算请求...');
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CALCULATE_TOKENS', // 最终消息类型
      text: text,
    });
        
    if (!response) {
       throw new Error("Offscreen did not return a response (undefined).");
    }

    console.log('Background (V110): 收到来自 Offscreen 的响应:', response);
    return response.tokenCount || 0;
  } catch (e) {
    console.error('Background (V110): 与 Offscreen 通信失败。', e);
    return 0; 
  }
}

// -----------------------------------------------------------------------------
//  SW 消息监听器 (来自 UI)
// -----------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'BG_CALCULATE_TOKENS') {
    (async () => {
      const tokenCount = await requestTokenCalculation(message.text);
      sendResponse({ tokenCount });
    })();
    return true; 
  }
});
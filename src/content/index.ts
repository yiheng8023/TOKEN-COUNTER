// src/content/index.ts (V119: 修复代码洁癖)

console.log('TOKEN-COUNTER Content Script (V119) is loaded on Gemini.');

// ============== 配置和常量 (Req 7: 健壮性) ==============

// 定义用于抓取关键文本的 DOM 选择器。
const SELECTORS = {
    // 假设用户输入区域有一个独特的 data-testid 或 class
    INPUT_AREA: '[aria-label="Send a message"]', 
    
    // 聊天回复容器，通常是一个包含所有消息的父级 div
    CHAT_CONTAINER: 'main > div > div > div:last-child', 
};

// ============== 通信函数 ==============

/**
 * 将文本发送给后台 Service Worker (SW) 进行 Token 计算。
 */
async function sendTextToCalculate(text: string): Promise<number> {
    if (!text || text.trim() === '') return 0;

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'BG_CALCULATE_TOKENS',
            text: text,
        });
        return response?.tokenCount || 0;
    } catch (e) {
        // 静默处理，因为 Side Panel 或 SW 未运行，通信会失败
        return 0;
    }
}

// ============== 核心抓取逻辑 ==============

// V119 修复：将 latestTokens 移到函数外部，以便在多次调用中保持状态
let latestTokens = 0; 

/**
 * 【核心逻辑】遍历 DOM，抓取所有需要的文本，并计算总 Token。
 */
function processPageContent() {
    // 1. 抓取用户输入
    const inputElement = document.querySelector(SELECTORS.INPUT_AREA) as HTMLTextAreaElement;
    const inputText = inputElement?.value || '';
    
    // 2. 抓取聊天容器内的所有回复文本 (简易模式，抓取所有可见文本)
    const chatContainer = document.querySelector(SELECTORS.CHAT_CONTAINER);
    const repliesText = chatContainer?.textContent || '';
    
    const totalTextToProcess = inputText + ' ' + repliesText;

    // 3. 计算并更新 Token
    if (totalTextToProcess.trim().length > 0) {
        sendTextToCalculate(totalTextToProcess).then(count => {
            if (count !== latestTokens) {
                latestTokens = count;
                
                // 【V119 关键步骤】：将最新的 Token 数发送给 Side Panel UI
                chrome.runtime.sendMessage({
                    type: 'UPDATE_UI_TOKENS',
                    totalTokens: count
                }).catch(() => {
                    // 静默处理，因为 Side Panel 可能没打开
                });
            }
        });
    }
}


// ============== MutationObserver (Req 7: 健壮性) ==============

// V119 修复：修复 observer 变量和回调参数的未读取警告
const observer = new MutationObserver((mutationsList, _observer) => {
    // 简单检查：如果有任何变化，就重新处理页面内容
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
            processPageContent();
            return; 
        }
    }
});

// 核心：在页面加载后，启动观察者
function initializeObserver() {
    const chatRoot = document.body; // 从 body 开始观察，确保不漏掉任何元素
    
    if (chatRoot) {
        // 观察 Body 及其所有子树的变化
        observer.observe(chatRoot, { childList: true, subtree: true, characterData: true });
        
        // 首次运行
        processPageContent();
    }
}

// 确保页面完全加载后再启动
window.addEventListener('load', initializeObserver);
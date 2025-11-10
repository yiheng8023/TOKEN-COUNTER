// src/content/engines/gemini/index.ts (V145: 修复导入错误 - 接收注入的工具)

console.log('TOKEN-COUNTER Content Engine (V175) is active.');

// 定义局部变量，用于存储从入口文件注入的工具
let localDebounce: typeof import('../..').debounce; 
let localMessageType: typeof import('../..').MessageType;
let latestTokens = 0; 
let currentModelName = ''; 

// V168 核心锚点: 采用您提供的 DOM 结构中最稳定的锚点
const SELECTORS = {
    MODEL_ANCHOR: 'div[data-test-id="bard-mode-menu-button"]',
    MODEL_NAME_PATH: 'button span.mdc-button__label > div.logo-pill-label-container > span', 
    // V175 修复: 确保能抓取到用户输入文本的实际元素
    INPUT_AREA: 'div[data-placeholder="问问 Gemini"]', 
    THOUGHTS_ANCHOR: 'model-thoughts[data-test-id="model-thoughts"]',
    MODEL_OUTPUT_SELECTOR: 'model-response message-content div.markdown-main-panel',
    FILE_CONTAINER_TAG: 'user-query-file-preview',
    CHAT_CONTAINER: 'chat-app',
    OBSERVE_TARGET: 'body', 
};

// --- 辅助函数：通讯和计算 ---
async function sendTextToCalculate(text: string): Promise<number> {
    try {
        const response = await chrome.runtime.sendMessage({
            type: localMessageType.BG_CALCULATE_TOKENS, // <-- 使用注入的类型
            text: text,
        });
        return response?.tokenCount || 0;
    } catch (e) {
        console.error('TOKEN-COUNTER: BG_CALCULATE_TOKENS 消息发送失败', e);
        return 0;
    }
}

// ============== 核心抓取逻辑 ==============
function sendModelDataToUI() {
    
    // 1. 抓取模型名称 (利用稳定锚点)
    const anchor = document.querySelector(SELECTORS.MODEL_ANCHOR);
    let modelName = '';
    
    if (anchor) {
        const nameElement = anchor.querySelector(SELECTORS.MODEL_NAME_PATH);
        if (nameElement && nameElement.textContent) {
            modelName = nameElement.textContent.trim();
        }
    }
    
    // 2. 抓取思考 Token 和文件数量
    const thoughtsElements = document.querySelectorAll(SELECTORS.THOUGHTS_ANCHOR);
    const thoughtTurns = thoughtsElements.length;
    const fileCount = document.querySelectorAll(SELECTORS.FILE_CONTAINER_TAG).length; 

    // 3. 抓取所有回复和输入的总文本（用于总上下文计算）
    let fullTextToCalculate = '';
    const chatApp = document.querySelector(SELECTORS.CHAT_CONTAINER);

    if (chatApp) {
        const allBubbles = chatApp.querySelectorAll('user-query, model-response');
        
        allBubbles.forEach(bubble => {
            // 提取用户输入文本 (使用稳定锚点)
            if (bubble.tagName === 'USER-QUERY') {
                const userTextElement = bubble.querySelector(SELECTORS.INPUT_AREA); 
                if (userTextElement) fullTextToCalculate += userTextElement.textContent + '\n';
            }
            
            // 提取模型输出文本 (使用稳定锚点)
            if (bubble.tagName === 'MODEL-RESPONSE') {
                const modelTextElement = bubble.querySelector('.markdown-main-panel');
                if (modelTextElement) fullTextToCalculate += modelTextElement.textContent + '\n';
            }
        });
    }

    // 4. 计算当前文本的总 Tokens (异步发送到 background/offscreen)
    if (fullTextToCalculate.length > 0) {
        sendTextToCalculate(fullTextToCalculate).then(count => {
            if (count !== latestTokens) {
                latestTokens = count;
                chrome.runtime.sendMessage({
                    type: localMessageType.UPDATE_UI_TOKENS, // <-- 使用注入的类型
                    totalTokens: count 
                }).catch(() => {});
            }
        });
    } else if (latestTokens !== 0) {
        // V175 修复: 如果文本为空，则清零
        latestTokens = 0;
        chrome.runtime.sendMessage({ type: localMessageType.UPDATE_UI_TOKENS, totalTokens: 0 }).catch(() => {}); // <-- 使用注入的类型
    }

    // 5. 确保模型名称实时更新 UI
    if (modelName && (modelName.includes('Pro') || modelName.includes('Flash')) && modelName !== currentModelName) {
        currentModelName = modelName;
        chrome.runtime.sendMessage({
            type: localMessageType.UPDATE_UI_MODEL, // <-- 使用注入的类型
            modelName: currentModelName,
        }).catch(() => {});
    }

    // 6. 发送文件/思考计数 (UI 将使用 model_rules.json 来计算其 Token 值)
    chrome.runtime.sendMessage({
        type: localMessageType.UPDATE_UI_COUNTERS, // <-- 使用注入的类型
        thoughtTurns: thoughtTurns,
        fileCount: fileCount,
    }).catch(() => {});
}


// V170 编译修复: 确保函数在被引用前已定义
function processPageContent() {
    sendModelDataToUI();
}

// V145 重构: 此时 debouncedProcess 需要在 initializeGeminiEngine 中定义/初始化，因为它依赖 localDebounce
let debouncedProcess: () => void; 

/**
 * 暴露的初始化函数，现在接收注入的工具
 * @param tools 从 content/index.ts 注入的工具和类型
 */
export function initializeGeminiEngine(tools: { debounce: typeof localDebounce, MessageType: typeof localMessageType }) {
    localDebounce = tools.debounce;
    localMessageType = tools.MessageType;

    // 此时才能安全地定义 debouncedProcess
    debouncedProcess = localDebounce(processPageContent, 250); 
    
    const targetNode = document.querySelector(SELECTORS.OBSERVE_TARGET);
    if (!targetNode) {
        setTimeout(() => initializeGeminiEngine(tools), 1000); // 重新传入 tools
        return;
    }

    const observer = new MutationObserver((mutationsList) => {
        sendModelDataToUI(); 
        
        for (const mutation of mutationsList) {
            if (mutation.type === 'characterData' || mutation.type === 'childList' || mutation.type === 'attributes') {
                debouncedProcess();
                return; 
            }
        }
    });

    observer.observe(targetNode, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true 
    });

    // 立即运行一次以获取初始状态
    processPageContent();
}

window.addEventListener('load', () => {
    // 页面加载后，如果还没有初始化，等待 Content Script 入口调用 initializeGeminiEngine。
    // 这里不再主动调用 initializeGeminiEngine，防止重复执行。
});
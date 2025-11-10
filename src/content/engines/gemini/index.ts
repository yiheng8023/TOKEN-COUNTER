// src/content/engines/gemini/index.ts (V179: R1 诊断 - 插入 console.log)

console.log('TOKEN-COUNTER Content Engine (V179 DEBUG) is active.');

// 定义局部变量，用于存储从入口文件注入的工具
let localDebounce: typeof import('../..').debounce; 
let localMessageType: typeof import('../..').MessageType;
let latestTokens = 0; 
let currentModelName = ''; 

// V178 (R1) 最终修复: 
// 基于用户提供的 4 个真实 DOM 结构，定义最终的选择器
const SELECTORS = {
    // R1-A: 左上角的 Logo (抓取 "Gemini")
    MODEL_LOGO: 'bard-logo[data-test-id="bard-logo-only"] span[data-test-id="bard-text"]',
    
    // R1-B: 模型切换按钮 (抓取 "2.5 Pro" 等)
    MODEL_VERSION_BUTTON: 'div[data-test-id="bard-mode-menu-button"]',
    MODEL_VERSION_PATH: 'div.logo-pill-label-container > span',
    
    // R1-C: 用户输入气泡 (来自用户 DOM)
    USER_QUERY_BUBBLE: 'user-query',
    USER_QUERY_TEXT_BLOCK: 'div.query-text', 
    
    // R1-D: 模型输出气泡 (来自用户 DOM)
    MODEL_RESPONSE_BUBBLE: 'model-response',
    MODEL_OUTPUT_TEXT_BLOCK: 'div.markdown-main-panel',
    
    // R2/R7: 思考元素 (用于排除)
    THOUGHTS_ELEMENT: 'model-thoughts',

    // R1 (文件): 文件计数器 (V176 验证有效)
    FILE_CONTAINER_TAG: 'user-query-file-preview',
    
    CHAT_CONTAINER: 'chat-app',
    OBSERVE_TARGET: 'body', 
};

// --- 辅助函数：通讯和计算 ---
async function sendTextToCalculate(text: string): Promise<number> {
    try {
        const response = await chrome.runtime.sendMessage({
            type: localMessageType.BG_CALCULATE_TOKENS,
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
    
    // --- 1. 抓取模型名称 (R1-A + R1-B) ---
    let logoName = '';
    let versionName = '';
    
    // R1-A: 抓取 Logo
    const logoElement = document.querySelector(SELECTORS.MODEL_LOGO);
    if (logoElement && logoElement.textContent) {
        logoName = logoElement.textContent.trim(); // 应该是 "Gemini"
    }

    // R1-B: 抓取版本
    const versionButton = document.querySelector(SELECTORS.MODEL_VERSION_BUTTON);
    if (versionButton) {
        const versionElement = versionButton.querySelector(SELECTORS.MODEL_VERSION_PATH);
        if (versionElement && versionElement.textContent) {
            versionName = versionElement.textContent.trim(); // 应该是 "2.5 Pro"
        }
    }
    
    // R1 修复: 合并模型名称
    const fullModelName = (logoName + ' ' + versionName).trim(); 

    // --- 2. 抓取文件计数 (V176 验证有效) ---
    const fileCount = document.querySelectorAll(SELECTORS.FILE_CONTAINER_TAG).length; 

    // --- 3. 抓取所有文本 (R1-C + R1-D) ---
    let fullTextToCalculate = '';
    const chatApp = document.querySelector(SELECTORS.CHAT_CONTAINER);

    if (chatApp) {
        // V178 修复: 抓取 'user-query' 和 'model-response' 两个气泡
        const allBubbles = chatApp.querySelectorAll(
            `${SELECTORS.USER_QUERY_BUBBLE}, ${SELECTORS.MODEL_RESPONSE_BUBBLE}`
        );

        allBubbles.forEach(bubble => {
            
            // R1-C: 抓取用户输入
            if (bubble.tagName === 'USER-QUERY') {
                const textEl = bubble.querySelector(SELECTORS.USER_QUERY_TEXT_BLOCK);
                if (textEl) {
                    fullTextToCalculate += (textEl.textContent || '') + '\n';
                }
            }
            
            // R1-D: 抓取模型输出
            if (bubble.tagName === 'MODEL-RESPONSE') {
                const textEl = bubble.querySelector(SELECTORS.MODEL_OUTPUT_TEXT_BLOCK);
                
                // V178 (R2/R7) 关键修复: 
                // 确保我们抓取的 'div.markdown-main-panel' (模型)
                // 不在 'model-thoughts' (思考) 元素内部，避免重复计算
                if (textEl && !textEl.closest(SELECTORS.THOUGHTS_ELEMENT)) {
                    fullTextToCalculate += (textEl.textContent || '') + '\n';
                }
            }
        });
    }

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // V179 诊断: 在这里打印我们抓取到的内容
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    console.log('TOKEN-COUNTER (V179 Debug): Text being sent to calculate:', {
        length: fullTextToCalculate.length,
        content: fullTextToCalculate
    });


    // 4. 计算文本 Tokens (异步)
    if (fullTextToCalculate.length > 0) {
        sendTextToCalculate(fullTextToCalculate).then(textCount => { 
            if (textCount !== latestTokens) {
                latestTokens = textCount;
                chrome.runtime.sendMessage({
                    type: localMessageType.UPDATE_UI_TOKENS,
                    totalTokens: textCount // V155 的 App.tsx 会正确处理
                }).catch(() => {});
            }
        });
    } else if (latestTokens !== 0) {
        // V177 修复: 如果文本为空 (例如新聊天)，则清零
        latestTokens = 0;
        chrome.runtime.sendMessage({ type: localMessageType.UPDATE_UI_TOKENS, totalTokens: 0 }).catch(() => {}); 
    }

    // 5. 更新模型名称 UI
    if (fullModelName && fullModelName.length > 5 && fullModelName !== currentModelName) {
        currentModelName = fullModelName;
        chrome.runtime.sendMessage({
            type: localMessageType.UPDATE_UI_MODEL,
            modelName: currentModelName,
        }).catch(() => {});
    }

    // 6. V176 (R2) 修复: 仅发送文件计数
    chrome.runtime.sendMessage({
        type: localMessageType.UPDATE_UI_COUNTERS,
        fileCount: fileCount,
    }).catch(() => {});
}


// V170 编译修复
function processPageContent() {
    sendModelDataToUI();
}

// V145 重构
let debouncedProcess: () => void; 

/**
 * 暴露的初始化函数
 * @param tools 从 content/index.ts 注入的工具和类型
 */
export function initializeGeminiEngine(tools: { debounce: typeof localDebounce, MessageType: typeof localMessageType }) {
    localDebounce = tools.debounce;
    localMessageType = tools.MessageType;

    debouncedProcess = localDebounce(processPageContent, 250); 
    
    const targetNode = document.querySelector(SELECTORS.OBSERVE_TARGET);
    if (!targetNode) {
        setTimeout(() => initializeGeminiEngine(tools), 1000); // 重新传入 tools
        return;
    }

    const observer = new MutationObserver((mutationsList) => {
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
    // 等待 Content Script 入口调用 initializeGeminiEngine。
});
// src/content/engines/gemini/index.ts (V197: 修复 R8 崩溃 - 修正 TS 路径)
// V1.2b 修复: 使用 3 级相对路径 (../../../)
import { MessageType } from '../../../utils/common';
// V195 修复: 路径从 'src/content/engines/gemini/' 访问 'src/content/' 应该是 '../../'
import { debounce } from '../../'; 

console.log('TOKEN-COUNTER Content Engine (V197) is active.');

let latestTokens = 0; 
let currentModelName = ''; 

const SELECTORS = {
    // R1-A: 左上角的 Logo (抓取 "Gemini")
    MODEL_LOGO: 'bard-logo[data-test-id="bard-logo-only"] span[data-test-id="bard-text"]',
    
    // R1-B: 模型切换按钮 (抓取 "2.5 Pro" 等)
    MODEL_VERSION_BUTTON: 'div[data-test-id="bard-mode-menu-button"]',
    MODEL_VERSION_PATH: 'div.logo-pill-label-container > span',
    
    // R1-C: 用户输入文本
    USER_QUERY_TEXT_BLOCK: 'div.query-text', 
    
    // R1-D & R2.1: 模型输出 + 思考
    MODEL_OUTPUT_TEXT_BLOCK: 'div.markdown-main-panel',
    
    // R1.1 (文件): 双向文件
    USER_FILE_SELECTOR: 'user-query-file-preview',
    // V190 (R1.1) 修复: 使用来自用户 DOM 的最精确父级选择器 (此选择器被您验证是正确的)
    MODEL_FILE_SELECTOR: 'div.attachment-container.generated-images generated-image',
    
    CHAT_CONTAINER: 'chat-app',
    OBSERVE_TARGET: 'body', 
};

// --- 辅助函数：健壮的通讯函数 ---
async function sendMessageRobustly(message: any) {
    try {
        await chrome.runtime.sendMessage(message);
    } catch (e: any) {
        if (e.message && e.message.includes("Extension context invalidated")) {
            console.warn("TOKEN-COUNTER: Extension context invalidated. Service Worker 重启中。");
        } else {
            console.error('TOKEN-COUNTER: chrome.runtime.sendMessage failed unexpectedly', e);
        }
    }
}

async function sendTextToCalculate(text: string): Promise<number> {
    await sendMessageRobustly({
        type: MessageType.UPDATE_UI_STATUS, 
        data: { status: 'statusCalculating' } 
    });

    try {
        // V194 修复: 确保 BG_CALCULATE_TOKENS 也使用健壮的发送
        const response = await chrome.runtime.sendMessage({
            type: MessageType.BG_CALCULATE_TOKENS,
            text: text,
        });
        return response?.tokenCount || 0;
    } catch (e: any) {
        if (e.message && e.message.includes("Extension context invalidated")) {
             console.warn("TOKEN-COUNTER: BG_CALCULATE_TOKENS 失败 (Context Invalidated)");
        } else {
            console.error('TOKEN-COUNTER: BG_CALCULATE_TOKENS 消息发送失败', e);
        }
        return 0;
    }
}

// ============== 核心抓取逻辑 ==============
async function sendModelDataToUI() { // 改为异步函数

    // 在抓取 *开始* 时立即发送“计算中”
    await sendMessageRobustly({
        type: MessageType.UPDATE_UI_STATUS, 
        data: { status: 'statusCalculating' }
    });
    
    // --- 1. 抓取模型名称 (R1-A + R1-B) ---
    let logoName = '';
    let versionName = '';
    
    const logoElement = document.querySelector(SELECTORS.MODEL_LOGO);
    if (logoElement && logoElement.textContent) {
        logoName = logoElement.textContent.trim(); // "Gemini"
    }
    const versionButton = document.querySelector(SELECTORS.MODEL_VERSION_BUTTON);
    if (versionButton) {
        const versionElement = versionButton.querySelector(SELECTORS.MODEL_VERSION_PATH);
        if (versionElement && versionElement.textContent) {
            versionName = versionElement.textContent.trim(); // "2.5 Pro"
        }
    }
    const fullModelName = (logoName + ' ' + versionName).trim();

    // --- 2. 抓取文件计数 (R1.1 修复) ---
    const userFileCount = document.querySelectorAll(SELECTORS.USER_FILE_SELECTOR).length;
    const modelFileCount = document.querySelectorAll(SELECTORS.MODEL_FILE_SELECTOR).length;
    const fileCount = userFileCount + modelFileCount; // 双向计算

    // --- 3. 抓取所有文本 (R1-C + R1-D + R2.1 修复) ---
    let fullTextToCalculate = '';
    const chatApp = document.querySelector(SELECTORS.CHAT_CONTAINER);

    if (chatApp) {
        const allTextBlocks = chatApp.querySelectorAll(
            `${SELECTORS.USER_QUERY_TEXT_BLOCK}, ${SELECTORS.MODEL_OUTPUT_TEXT_BLOCK}`
        );

        allTextBlocks.forEach(block => {
            fullTextToCalculate += (block.textContent || '') + '\n';
        });
    }

    console.log('TOKEN-COUNTER (V197 Debug): Text being sent to calculate:', {
        length: fullTextToCalculate.length
    });

    // 4. 计算文本 Tokens (异步)
    if (fullTextToCalculate.length > 0) {
        const textCount = await sendTextToCalculate(fullTextToCalculate); // 等待结果
        if (textCount !== latestTokens) {
            latestTokens = textCount;
            await sendMessageRobustly({
                type: MessageType.UPDATE_UI_TOKENS,
                totalTokens: textCount // V155 的 App.tsx 会正确处理
            });
        }
        // V185 (R12) 竞争条件修复: 
        // 移除 'statusReady'。App.tsx (V157) 将在收到 UPDATE_UI_TOKENS 时设置 "就绪"。
    } else if (latestTokens !== 0) {
        latestTokens = 0;
        await sendMessageRobustly({ type: MessageType.UPDATE_UI_TOKENS, totalTokens: 0 }); 
        
        // 在重置时也发送“就绪”状态
        await sendMessageRobustly({
            type: MessageType.UPDATE_UI_STATUS, 
            data: { status: 'statusReady' }
        });
    }

    // 5. 更新模型名称 UI
    if (fullModelName && fullModelName.length > 5 && fullModelName !== currentModelName) {
        currentModelName = fullModelName;
        await sendMessageRobustly({
            type: MessageType.UPDATE_UI_MODEL,
            modelName: currentModelName,
        });
    }

    // 6. 更新文件计数 UI
    await sendMessageRobustly({
        type: MessageType.UPDATE_UI_COUNTERS,
        fileCount: fileCount, // (V183) 发送双向计算总数
    });
}


function processPageContent() {
    sendModelDataToUI();
}

let debouncedProcess: () => void;

// 暴露的初始化函数
export function initializeGeminiEngine() { // 不再需要传入 tools
    // V196 修复: debounce 现在从 content 导入
    debouncedProcess = debounce(processPageContent, 250); 
    
    const targetNode = document.querySelector(SELECTORS.OBSERVE_TARGET);
    if (!targetNode) {
        setTimeout(() => initializeGeminiEngine(), 1000); // 重新调用自己
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
    initializeGeminiEngine(); // 页面加载后直接初始化
});
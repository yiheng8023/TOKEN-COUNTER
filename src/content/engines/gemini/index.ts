// C:\Projects\TOKEN-COUNTER\src\content\engines/gemini/index.ts
// V1.5d (Task 1.5d): 移除 .ts 扩展名

// V1.5d 修复: 移除 .ts 扩展名
import { MessageType, debounce } from '../../../utils/common'; 

// V1.5b 修复: .json 导入 (现在可以正常工作)
import * as Rules from '../../../config/model_rules.json';

console.log('TOKEN-COUNTER Content Engine (V1.5d - Gemini) is active.');

// (V197) 保留选择器
const SELECTORS = {
    MODEL_LOGO: "[data-test-id='bard-logo-only'] span[data-test-id='bard-text']",
    MODEL_VERSION_BUTTON: "div[data-test-id='bard-mode-menu-button']",
    MODEL_VERSION_PATH: "div.logo-pill-label-container > span",
    USER_QUERY_TEXT_BLOCK: 'div.query-text',
    MODEL_OUTPUT_TEXT_BLOCK: 'div.markdown-main-panel',
    USER_FILE_SELECTOR: 'user-query-file-preview',
    MODEL_FILE_SELECTOR: "div.attachment-container.generated-image",
    CHAT_CONTAINER: 'chat-app',
    OBSERVE_TARGET: 'body',
};

// (V1.5) 保留状态缓存
let lastModelName = '';
let lastFileCount = 0;
let lastTextToCalculate = '';


/**
 * 核心功能：抓取 DOM 并发送数据
 */
function scanDOMAndSendData() {
    // console.log('CS (V1.5d): Scanning DOM...');
    
    // (V1.5b) 保留 Rules 逻辑
    let modelName = Rules.DEFAULT_MODEL_NAME; 
    const modelButton = document.querySelector(SELECTORS.MODEL_VERSION_BUTTON);
    if (modelButton && modelButton.textContent) {
        modelName = modelButton.textContent.trim();
    } else {
        const logo = document.querySelector(SELECTORS.MODEL_LOGO);
        if (logo && logo.textContent) {
            modelName = logo.textContent.trim();
        }
    }
    
    // (V168) 保留文件计数逻辑
    const userFiles = document.querySelectorAll(SELECTORS.USER_FILE_SELECTOR).length;
    const modelFiles = document.querySelectorAll(SELECTORS.MODEL_FILE_SELECTOR).length;
    const fileCount = userFiles + modelFiles;

    // (V168) 保留文本抓取逻辑
    let combinedText = '';
    const textBlocks = document.querySelectorAll(
        `${SELECTORS.USER_QUERY_TEXT_BLOCK}, ${SELECTORS.MODEL_OUTPUT_TEXT_BLOCK}`
    );
    textBlocks.forEach(block => {
        combinedText += block.textContent || '';
    });
    
    // (V1.5) 保留数据检查逻辑
    if (
        modelName !== lastModelName ||
        fileCount !== lastFileCount ||
        combinedText !== lastTextToCalculate
    ) {
        // (V1.4) 保留消息发送逻辑
        chrome.runtime.sendMessage({
            type: MessageType.CS_SEND_GEMINI_DATA,
            payload: {
                modelName: modelName,
                fileCount: fileCount,
                textToCalculate: combinedText
            }
        }).catch(e => {
            console.error('CS (V1.5d): 无法发送数据到 SW', e);
        });

        // (V1.5) 保留缓存更新逻辑
        lastModelName = modelName;
        lastFileCount = fileCount;
        lastTextToCalculate = combinedText;
    }
}

/**
 * 启动 MutationObserver
 */
export function initializeGeminiEngine() {
    const targetNode = document.querySelector(SELECTORS.OBSERVE_TARGET);
    if (!targetNode) {
        console.warn('CS (V1.5d): 无法找到观察目标 (body)，5秒后重试...');
        setTimeout(initializeGeminiEngine, 5000); // 重试
        return;
    }

    // (V142) 保留防抖逻辑
    const debouncedScan = debounce(scanDOMAndSendData, 500); 

    const observer = new MutationObserver((_mutationsList, _observer) => {
        debouncedScan();
    });

    observer.observe(targetNode, { 
        childList: true, 
        subtree: true, 
        characterData: true 
    });

    // 立即执行一次扫描
    scanDOMAndSendData();
}

// 导入时自动运行 (V1.5)
initializeGeminiEngine();
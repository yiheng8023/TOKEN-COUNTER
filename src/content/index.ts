// C:\Projects\TOKEN-COUNTER\src\content\index.ts
// V6.2 (Task P1.2): 修复 Service Worker Keep-Alive (Extension context invalidated)
// 同时包含 V6.0 的 P1.1a (文件计数) 修复

import { MessageType } from '../utils/common';
import { debounce } from '../utils/common';

// V4.5 (P1.1) 终极简化: 只抓取最可能的输出面板
const TEXT_SELECTORS = [
    'div.markdown-main-panel',
];

// V1.5d: 模型名称选择器 (保留)
const MODEL_NAME_SELECTORS = {
    LOGO: "[data-test-id='bard-logo-text']",
    VERSION: "div[data-test-id='bard-mode-menu-button']"
};

// V6.0 (P1.1a) 最终抽象: 
// 使用最通用的文件组件锚点 (修复文件计数)
const FILE_COUNT_SELECTORS: string[] = [
    'user-query-file-preview', // 1. 用户输入文件
    'response-element',        // 2. 模型输出文件 (通用组件)
];

// -----------------------------------------------------------------
// V6.1: Service Worker Keep-Alive (P1.2)
// -----------------------------------------------------------------
const SW_PING_INTERVAL_MS = 30000; // 30 seconds
let pingInterval: number | null = null;

function startPing() {
    if (pingInterval) {
        window.clearInterval(pingInterval);
    }

    pingInterval = window.setInterval(() => {
        try {
            // V6.1: 发送 PING 消息，不关心结果。
            chrome.runtime.sendMessage({ type: MessageType.CS_PING_SW }).catch(() => {
                // 忽略失败的 PING
            });
        } catch (e) {
            // 忽略同步错误
        }
    }, SW_PING_INTERVAL_MS);
}


/**
 * V4.5: 抓取文本 (保留)
 */
function scrapeText(selectors: string[]): string {
    let combinedText = '';
    const seenText = new Set<string>(); 
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && !seenText.has(text)) {
                combinedText += text + '\n\n'; 
                seenText.add(text);
            }
        });
    });
    return combinedText.trim();
}

/**
 * 抓取模型名称 (V1.5d: 保留)
 */
function scrapeModelName(): string {
    const logoEl = document.querySelector(MODEL_NAME_SELECTORS.LOGO);
    const versionEl = document.querySelector(MODEL_NAME_SELECTORS.VERSION);
    let modelName = logoEl?.textContent?.trim() || 'Gemini';
    const version = versionEl?.textContent?.trim();
    if (version && !modelName.includes(version)) {
        modelName = `${modelName} ${version}`;
    }
    return modelName || 'Gemini 2.5 Pro';
}

/**
 * V6.0 (P1.1a) 最终修复:
 */
function scrapeFileCount(): number {
    const seenElements = new Set<Element>();
    FILE_COUNT_SELECTORS.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (!seenElements.has(el)) {
                seenElements.add(el);
            }
        });
    });
    return seenElements.size;
}


/**
 * 扫描 DOM 并发送数据到 Service Worker
 */
function scanDOMAndSendData() {
    try {
        const modelName = scrapeModelName();
        const fileCount = scrapeFileCount();
        const textToCalculate = scrapeText(TEXT_SELECTORS);

        chrome.runtime.sendMessage({
            type: MessageType.CS_SEND_DATA,
            payload: {
                modelName: modelName,
                fileCount: fileCount,
                textToCalculate: textToCalculate
            }
        }).catch(e => {
            const msg = e.message;
            if (msg && !msg.includes('Receiving end does not exist')) {
                console.warn('Content Script (V6.2): 无法发送消息到 SW (SW 崩溃?)', e);
            }
        });
    } catch (e: any) {
        console.error("Content Script (V6.2): 扫描 DOM 时出错", e);
    }
}

// (V1.5d: 保留)
const debouncedScan = debounce(scanDOMAndSendData, 500);
const observer = new MutationObserver(() => debouncedScan());
observer.observe(document.body, { 
    childList: true, 
    subtree: true, 
    characterData: true, 
    attributes: true
});

// V6.1: 在 Content Script 启动时立即开始 PING
scanDOMAndSendData();
startPing();
export {}
// C:\Projects\TOKEN-COUNTER\src\models\gemini\content.ts
// [!! 架构 V3.1: 修复 TS2339 !!]

// 导入 ../../utils/storage_manager (核心)
import { processTokenUpdate, ModelRules } from '../../utils/storage_manager';
// 导入 ../../utils/dom_utils (包含 debounce)
import { debounce } from '../../utils/dom_utils';
// 导入自己的模型规则
import * as geminiRules from './model_rules.json';

const EVENT_TOKEN_DATA = 'token-counter-token-data';
const EVENT_MODEL_NAME = 'token-counter-model-name';

const ROOT_ELEMENT_TO_OBSERVE = '#app-root'; 

// T-4 (容错机制定义，保持不变)
const DOM_HIERARCHY = {
    MODEL_NAME: {
        CHILD: 'span[data-test-id=\"bard-text\"]',
        ANCHOR: '[data-test-id=\"bard-logo-only\"]',
        PATH: 'div.logo span[data-test-id=\"bard-text\"]'
    },
    MODEL_VERSION: {
        CHILD: '.logo-pill-label-container span:not([data-test-id])',
        ANCHOR: '[data-test-id=\"bard-mode-menu-button\"]',
        PATH: 'div.logo-pill-label-container span:not([data-test-id])'
    }
};

// T-4 容错函数 (保持不变)
const inferFromDOM = (hierarchy: { CHILD: string, ANCHOR: string, PATH: string }): string => {
    try {
        const childEl = document.querySelector(hierarchy.CHILD);
        if (childEl) return childEl.textContent || '';
        
        const anchorEl = document.querySelector(hierarchy.ANCHOR);
        if (anchorEl) {
            const pathEl = anchorEl.closest('.logo')?.querySelector(hierarchy.PATH);
            if (pathEl) return pathEl.textContent || '';
        }
        
    } catch (e) {
        // T-4: 容错
    }
    return '';
};

// (V3.0: 修复 debounce)
const extractModelNameFromDOM = debounce(() => {
    const model = inferFromDOM(DOM_HIERARCHY.MODEL_NAME);
    const version = inferFromDOM(DOM_HIERARCHY.MODEL_VERSION);
    
    let combinedName = `${model} ${version}`.trim();

    if (combinedName) {
        // [!! 关键修复 1/3: 移除 .default !!]
        processTokenUpdate(
            { modelName: combinedName },
            geminiRules as ModelRules
        );
    }
}, 500); // 500ms 防抖

function setupMainWorldListener() {
    window.addEventListener(EVENT_TOKEN_DATA, (event) => {
        const customEvent = event as CustomEvent;
        const tokenData = customEvent.detail; 

        if (tokenData && tokenData.totalTokens > 0) {
            
            // [!! 关键修复 2/3: 移除 .default !!]
            processTokenUpdate(
                { 
                    tokens: {
                        input:    tokenData.inputTokens || 0,
                        thinking: tokenData.thinkingTokens || 0,
                        output:   tokenData.outputTokens || 0,
                        total:    tokenData.totalTokens 
                    }
                },
                geminiRules as ModelRules
            );
        }
    });

    window.addEventListener(EVENT_MODEL_NAME, (event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail && customEvent.detail.modelName) {
            // [!! 关键修复 3/3: 移除 .default !!]
            processTokenUpdate(
                { modelName: customEvent.detail.modelName },
                geminiRules as ModelRules
            );
        }
    });
}

function injectMainWorldScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('gemini_interceptor.js');
    
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => {
        script.remove();
    };
}

function initialize() {
    console.log("TOKEN-COUNTER (Gemini Adapter V3.1): Content Script Starting."); 
    
    setupMainWorldListener();
    injectMainWorldScript();
    
    const targetNode = document.querySelector(ROOT_ELEMENT_TO_OBSERVE);
    if (targetNode) {
        const config = { childList: true, subtree: true, characterData: true, attributes: true };
        
        const callback = function(_mutationsList: MutationRecord[], _observer: MutationObserver) {
            extractModelNameFromDOM(); 
        };
        
        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
        
    } else {
        console.warn("TOKEN-COUNTER: Root element (#app-root) not found. DOM fallback disabled.");
    }
}

initialize();
// C:\Projects/TOKEN-COUNTER/src/ui/main.ts
// [!! 零配置 V1 !!]

// [!! 关键修改: 移除 createDefaultState (TS6133 修复) !!]
import { TokenCountState, loadTokenState, STORAGE_KEYS } from '../utils/storage_manager';

// =================================================================
// 0. 核心常量与 DOM 声明
// =================================================================

// DOM 元素
let modelLabelEl: HTMLElement | null = null;
let modelNameEl: HTMLElement | null = null;
let totalRowEl: HTMLElement | null = null; 
let totalDetailsEl: HTMLElement | null = null; 
let inputTotalEl: HTMLElement | null = null;
let thinkingTotalEl: HTMLElement | null = null;
let outputTotalEl: HTMLElement | null = null;
let overheadTotalEl: HTMLElement | null = null; 
let statusLabelEl: HTMLElement | null = null; 
let appStatusEl: HTMLElement | null = null; 

// [!! 关键修改: 移除 settings 声明 !!]


// =================================================================
// 1. 核心业务函数 (Core Business Logic)
// =================================================================

// [!! 关键修改: 移除 safeGetMessage !!]

function updateUI(state: TokenCountState) {
    if (!state) return;

    // 计算
    const maxTokens = state.maxTokens || 1; 
    const currentTotal = state.total || 0;
    const alertThreshold = state.alertThreshold || 0.8;
    const percentage = (currentTotal / maxTokens);
    const pctText = (percentage * 100).toFixed(1) + '%';

    if (modelNameEl) {
        modelNameEl.textContent = state.model || '...';
    }

    if (inputTotalEl) {
        inputTotalEl.textContent = (state.inputText || 0).toLocaleString();
    }
    
    if (thinkingTotalEl) {
        thinkingTotalEl.textContent = (state.thinking || 0).toLocaleString();
    }

    if (outputTotalEl) {
        outputTotalEl.textContent = (state.outputText || 0).toLocaleString();
    }
    
    if (overheadTotalEl) {
        overheadTotalEl.textContent = (state.overhead || 0).toLocaleString();
    }

    if (totalRowEl && totalDetailsEl) {
        totalDetailsEl.textContent = `${currentTotal.toLocaleString()} / ${maxTokens.toLocaleString()} (${pctText})`;
        
        totalRowEl.className = 'total-row status-normal'; 
        if (percentage >= 1) {
            totalRowEl.className = 'total-row status-danger';
        } else if (percentage >= alertThreshold) {
            totalRowEl.className = 'total-row status-warning';
        }
    }
}


// =================================================================
// 2. 设置面板逻辑 (Settings Panel Logic)
// =================================================================

// [!! 关键修改: 移除 showSettings !!]
// [!! 关键修改: 移除 saveLanguageSetting !!]
// [!! 关键修改: 移除 loadLanguageSetting !!]

// [!! 关键修改: 硬编码双语标签 !!]
function updateLabels() {
    // 主面板
    if (modelLabelEl) modelLabelEl.textContent = "模型 / Model";
    if (statusLabelEl) statusLabelEl.textContent = "状态 / Status";
    
    document.getElementById('label-input')!.textContent = "用户输入 / Input";
    document.getElementById('label-thinking')!.textContent = "模型思考 / Thinking";
    document.getElementById('label-output')!.textContent = "模型输出 / Output";
    document.getElementById('label-overhead')!.textContent = "系统开销 / Overhead"; 
    document.getElementById('label-total')!.textContent = "总计 / Total";
    
    // 设置面板 (已移除)
}

// [!! 关键修改: 移除 safeStorageGet (已在 storage_manager 中) !!]
// (如果其他地方需要，可以保留，但这里已不需要)


// =================================================================
// 3. 事件监听器 (Event Listeners)
// =================================================================

// [!! 关键修改: 移除 addEventListeners (不再需要) !!]


// =================================================================
// 4. 启动逻辑 (Initialization Logic)
// =================================================================

async function initialize() {
    // 获取 DOM
    modelLabelEl = document.getElementById('label-model');
    modelNameEl = document.getElementById('model-name');
    totalRowEl = document.querySelector('.total-row');
    totalDetailsEl = document.getElementById('total-details');
    inputTotalEl = document.getElementById('input-total');
    thinkingTotalEl = document.getElementById('thinking-total');
    outputTotalEl = document.getElementById('output-total');
    overheadTotalEl = document.getElementById('overhead-total');
    statusLabelEl = document.getElementById('label-status');
    appStatusEl = document.getElementById('app-status');

    // [!! 关键修改: 移除 addEventListeners() !!]
    
    // 加载国际化文本 (现在是硬编码)
    updateLabels(); 
    
    // (完美方案 V3: 设置初始状态)
    if (appStatusEl) {
        appStatusEl.textContent = "运行中 / Active"; // 硬编码双V
    }
    
    // [!! 关键修改: 移除 loadLanguageSetting() !!]
    
    // 启动时立即加载状态
    const initialState = await loadTokenState();
    updateUI(initialState);
    
    // 监听来自 content.js 的存储变化
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes[STORAGE_KEYS.TOKEN_COUNT]) {
            updateUI(changes[STORAGE_KEYS.TOKEN_COUNT].newValue as TokenCountState);
        }
    });
    
    // [!! 关键修改: 移除 settingsPanel 检查 !!]
}

initialize();
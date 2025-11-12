// C:\Projects\TOKEN-COUNTER\src\ui\App.tsx
// V1.4: 统一通信协议 (Task 1.4)，使其与 V168 逻辑兼容

import { useState, useEffect } from 'react';
import * as Rules from '../config/model_rules.json'; 
import './App.css'; 
import { MessageType } from '../utils/common'; // V1.2b 修复: 指向统一的 common.ts

// 导入规则和默认值 (V168)
const MODEL_RULES = Rules.MODELS as Record<string, { MAX_TOKENS: number, ALERT_THRESHOLD: number }>;
const COST_RULES = Rules.COST_RULES as { FILE_COST_PER_UNIT: number };
const DEFAULT_MODEL_NAME = Rules.DEFAULT_MODEL_NAME;

// i18n 辅助函数 (V168)
const getMessage = (key: string) => {
    if (key === 'labelText') return (typeof chrome !== 'undefined' && chrome.i18n.getMessage(key)) || '文本';
    if (key === 'labelFile') return (typeof chrome !== 'undefined' && chrome.i18n.getMessage(key)) || '文件 (?)';
    if (key === 'statusReady') return (typeof chrome !== 'undefined' && chrome.i18n.getMessage(key)) || '就绪';
    if (key === 'statusCalculating') return (typeof chrome !== 'undefined' && chrome.i18n.getMessage(key)) || '计算中...';
    return typeof chrome !== 'undefined' && chrome.i18n ? chrome.i18n.getMessage(key) : `[${key}]`;
};

interface TokenState {
    total: number;
    text: number;
    file: number;
}
const initialState: TokenState = {
    total: 0,
    text: 0,
    file: 0,
};

function App() {
    const [tokens, setTokens] = useState<TokenState>(initialState);
    const [modelName, setModelName] = useState<string>(DEFAULT_MODEL_NAME);
    const [status, setStatus] = useState<string>('');
    
    // V168 模型自适应逻辑 (保留)
    const currentModelRules = (() => {
        if (MODEL_RULES[modelName as keyof typeof MODEL_RULES]) {
            return MODEL_RULES[modelName as keyof typeof MODEL_RULES];
        }
        for (const key in MODEL_RULES) {
            if (modelName.includes(key) || key.includes(modelName)) {
                return MODEL_RULES[key];
            }
        }
        return MODEL_RULES[DEFAULT_MODEL_NAME];
    })();

    const maxTokens = currentModelRules.MAX_TOKENS;
    const alertThreshold = currentModelRules.ALERT_THRESHOLD;
    const usageRatio = tokens.total / maxTokens;
    
    let totalColor: string | undefined = undefined; 
    let alertMessage = '';
    
    if (usageRatio > alertThreshold) {
        totalColor = '#FFC107'; // 警告色
        alertMessage = `⚠ 接近上限 (${(usageRatio * 100).toFixed(1)}%)`;
    }
    if (usageRatio >= 1.0) {
        totalColor = '#F44336'; // 超限色
        alertMessage = `🛑 已超限 (${(usageRatio * 100).toFixed(1)}%)`;
    }

    // -----------------------------------------------------------------
    // 任务 1.4 核心：更新 Effect 钩子
    // -----------------------------------------------------------------
    
    useEffect(() => {
        // 1. 组件加载时，请求 Service Worker 发送当前状态
        try {
            chrome.runtime.sendMessage({ type: MessageType.UI_REQUEST_INITIAL_STATE });
        } catch (e) {
            console.warn('UI: 无法在启动时请求初始状态 (可能 SW 未就绪)', e);
            setStatus('错误: SW 未连接');
        }

        // 2. 设置消息监听器
        const messageHandler = (message: any) => {
            const { type, payload } = message;

            // 任务 1.4: 监听新的、统一的消息
            switch (type) {
                // (V168 逻辑) 监听模型名称更新
                case MessageType.BG_UPDATE_MODEL_NAME:
                    setModelName(payload.modelName);
                    break;

                // (V168 逻辑) 监听文件计数更新
                case MessageType.BG_UPDATE_FILE_COUNT:
                    const calculatedFile = payload.fileCount * COST_RULES.FILE_COST_PER_UNIT;
                    setTokens(prev => ({
                        ...prev,
                        file: calculatedFile,
                        total: prev.text + calculatedFile, 
                    }));
                    break;

                // (V168 逻辑) 监听文本 Token 更新
                case MessageType.BG_UPDATE_TEXT_TOKENS:
                    const newTextTotal = payload.totalTokens;
                    setTokens(prev => ({
                        ...prev,
                        text: newTextTotal,
                        total: newTextTotal + prev.file, 
                    }));
                    break;
                
                // (V168 逻辑) 监听状态：忙碌 (计算中)
                case MessageType.BG_UPDATE_STATUS_BUSY:
                    setStatus(getMessage('statusCalculating'));
                    break;
                
                // (V168 逻辑) 监听状态：就绪
                case MessageType.BG_UPDATE_STATUS_READY:
                    setStatus(getMessage('statusReady'));
                    break;

                // (V1.4 新增) 监听来自 SW 的“初始状态”快照
                case MessageType.BG_SEND_INITIAL_STATE:
                    const { modelName, fileCount, totalTokens } = payload;
                    
                    const initialFile = fileCount * COST_RULES.FILE_COST_PER_UNIT;
                    const initialText = totalTokens;
                    
                    setModelName(modelName);
                    setTokens({
                        file: initialFile,
                        text: initialText,
                        total: initialFile + initialText
                    });
                    setStatus(getMessage('statusReady')); // 收到状态即为就绪
                    break;
            }
        };

        chrome.runtime.onMessage.addListener(messageHandler);
        return () => {
            chrome.runtime.onMessage.removeListener(messageHandler);
        };
    }, []); // 保持 V168 逻辑，仅在挂载时运行
    
    // (V168 逻辑) 设置按钮
    const handleSettingsClick = () => {
        alert('设置功能 (Phase 2) 待开发，用于语言切换（中/英）等。');
    };

    // (V168 逻辑) 渲染行
    const renderCountRow = (label: string, count: number, tooltip: string = "") => (
        <div className="count-row" key={label}>
            <span 
                title={tooltip}
                className="count-label"
            > 
                {label}
            </span>
            <span className="count-value"> 
                {count.toLocaleString()}
            </span>
        </div>
    );

    const modelInfo = modelName;
    const totalDisplay = `${tokens.total.toLocaleString()} / ${maxTokens.toLocaleString()} (${(usageRatio * 100).toFixed(1)}%)`;
    
    // (V168 逻辑) 状态 Class
    const statusClassName = status === getMessage('statusCalculating') 
        ? "status-row status-calculating" 
        : "status-row";

    // -----------------------------------------------------------------
    // 任务 1.4: UI 渲染 (V168 逻辑保持不变)
    // -----------------------------------------------------------------
    return (
        <div className="app-container">
            <div className="header-bar">
                <h4 className="header-model-name">
                    模型: {modelInfo}
                </h4>
                <button onClick={handleSettingsClick} className="settings-button">
                    ⚙️
                </button>
            </div>
            
            <div className="content-box">
                {renderCountRow(
                    getMessage('labelText') + ' (?)', 
                    tokens.text, 
                    "文本 = 用户输入 + 模型输出 + 模型思考"
                )}
                {renderCountRow(
                    getMessage('labelFile'), 
                    tokens.file, 
                    "文件 = 用户上传 + 模型生成 (基础值: 258 Tokens)"
                )}
                
                <div className="total-divider">
                    <div className="total-row">
                        <span 
                            title="（文本 + 文件） / 单窗口上下文上限"
                            className="total-label"
                        >
                            总计 (?):
                        </span>
                        <span style={{ color: totalColor }}>{totalDisplay}</span>
                    </div>
                    {alertMessage && (
                        <p className="alert-message" style={{ color: totalColor }}>
                            {alertMessage}
                        </p>
                    )}
                </div>
                
                <p className={statusClassName}>
                    <span>
                        状态: {status || getMessage('statusReady')} 
                    </span>
                </p>
                <p className="status-row">
                    <span>
                        说明：计数器自动统计当前对话内容。如需统计历史记录，请手动上滚页面。
                    </span>
                </p>
            </div>
        </div>
    );
}

export default App;
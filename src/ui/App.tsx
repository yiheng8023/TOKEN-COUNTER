// src/ui/App.tsx (V168: 修复 R-UI-Annotation 文本中的 "258 估算" Bug)
import { useState, useEffect } from 'react';
import * as Rules from '../config/model_rules.json'; 
import './App.css'; 
// V1.2b 修复: 使用 1 级相对路径 (../)
import { MessageType } from '../utils/common';

// 导入规则和默认值
const MODEL_RULES = Rules.MODELS as Record<string, { MAX_TOKENS: number, ALERT_THRESHOLD: number }>;
const COST_RULES = Rules.COST_RULES as { FILE_COST_PER_UNIT: number };
const DEFAULT_MODEL_NAME = Rules.DEFAULT_MODEL_NAME;

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
    
    // V175 修复: 模型自适应 (V155 已存在)
    const currentModelRules = (() => {
        // 尝试精确匹配
        if (MODEL_RULES[modelName as keyof typeof MODEL_RULES]) {
            return MODEL_RULES[modelName as keyof typeof MODEL_RULES];
        }
        // 尝试模糊匹配
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
    
    let totalColor: string | undefined = undefined; // V158: 默认为 CSS 变量
    
    // R3 (需求 #5) 修复: (V155 已存在)
    let alertMessage = '';
    
    if (usageRatio > alertThreshold) {
        totalColor = '#FFC107'; // 警告色
        alertMessage = `⚠ 接近上限 (${(usageRatio * 100).toFixed(1)}%)`;
    }
    if (usageRatio >= 1.0) {
        totalColor = '#F44336'; // 超限色
        alertMessage = `🛑 已超限 (${(usageRatio * 100).toFixed(1)}%)`;
    }

    
    useEffect(() => {
        chrome.runtime.sendMessage({ type: MessageType.REQUEST_INITIAL_STATE })
            .then(() => {}) 
            .catch(() => {});
        
    }, []); // V158: 移除所有 'isDark' 依赖


    useEffect(() => {
        const messageHandler = (message: any, _sender: chrome.runtime.MessageSender, _sendResponse: (response: any) => void) => {
            
            // 1. 处理模型名称更新 
            if (message.type === MessageType.UPDATE_UI_MODEL) {
                setModelName(message.modelName);
            }
            
            // 2. V155 (R2/R7) 修复: 仅处理文件计数 
            if (message.type === MessageType.UPDATE_UI_COUNTERS) {
                // V168 (R1.1-Cost) 修复: 确保使用来自 V-Final-10 (258) 的正确值
                const calculatedFile = message.fileCount * COST_RULES.FILE_COST_PER_UNIT;       

                setTokens(prev => ({
                    ...prev,
                    file: calculatedFile,
                    // V155 (R1) 修复: 总计 = 现有的文本 + 新的文件
                    total: prev.text + calculatedFile, 
                }));
            }

            // 3. V155 (R1) 致命逻辑修复 (Bug B):
            if (message.type === MessageType.UPDATE_UI_TOKENS) {
                const newTextTotal = message.totalTokens; 
                
                setTokens(prev => ({
                    ...prev,
                    // V155 (R1) 修复: 文本 = 传入的文本计数
                    text: newTextTotal, 
                    // V155 (R1) 修复: 总计 = 新的文本 + 现有的文件
                    total: newTextTotal + prev.file, 
                }));

                // V157 (R12) 竞争条件修复: 
                // 当收到 Token 结果时，才将状态设置回“就绪”。
                setStatus(getMessage('statusReady'));
            }

            // 4. 处理状态更新 (V155 已存在, V185 将使用它)
            if (message.type === MessageType.UPDATE_UI_STATUS) {
                // V185 发送 'statusCalculating' 或 'statusReady'
                setStatus(getMessage(message.data.status) || message.data.status);
            }
        };

        chrome.runtime.onMessage.addListener(messageHandler);
        return () => {
            chrome.runtime.onMessage.removeListener(messageHandler);
        };
    }, [modelName]); // V155 修复: [modelName] 依赖项是正确的
    
    const handleSettingsClick = () => {
        // R5 (需求 #8) 修复: (V155 已存在)
        alert('设置功能 (Phase 2) 待开发，用于语言切换（中/英）等。');
    };

    // V158 (R-UI-Annotation) 修复: 
    // (V157 的逻辑已正确, 现改为使用 CSS 类)
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
    
    // V158 (R12) 状态 Class
    const statusClassName = status === getMessage('statusCalculating') 
        ? "status-row status-calculating" 
        : "status-row";

    return (
        // V167 (R11 / R-UI-Polish) 修复: 移除所有内联样式，100% 依赖 CSS 类
        <div className="app-container">
            
            {/* V158 (R-UI-Layout) 修复: "别扭"的顶部栏 */}
            <div className="header-bar">
                {/* (需求 #2, #3) 修复: (V155 已存在, V158 移动到此) */}
                <h4 className="header-model-name">
                    模型: {modelInfo}
                </h4>
                
                {/* R9 (需求 #1) 修复: (V155 已存在, V158 移动到此) */}
                <button onClick={handleSettingsClick} className="settings-button">
                    ⚙️
                </button>
            </div>
            
            {/* V158 (R11) 修复: "大面积白色" 自适应 */}
            <div className="content-box">
                
                {/* V157 (R-UI-Annotation) 修复: 添加 title 注释 */}
                {renderCountRow(
                    getMessage('labelText') + ' (?)', 
                    tokens.text, 
                    "文本 = 用户输入 + 模型输出 + 模型思考"
                )}
                {/* V168 (R1.1-Cost) 修复: 更新注释文本 */ }
                {renderCountRow(
                    getMessage('labelFile'), 
                    tokens.file, 
                    "文件 = 用户上传 + 模型生成 (基础值: 258 Tokens)"
                )}
                
                {/* V175 修复: (V155 已存在) */}
                <div className="total-divider">
                    <div className="total-row">
                        {/* V157 (R-UI-Annotation) 修复: 添加 title 注释 */}
                        <span 
                            title="（文本 + 文件） / 单窗口上下文上限"
                            className="total-label"
                        >
                            总计 (?):
                        </span>
                        <span style={{ color: totalColor }}>{totalDisplay}</span>
                    </div>
                    {/* R3 (需求 #5) 修复: (V155 已存在) */}
                    {alertMessage && (
                        <p className="alert-message" style={{ color: totalColor }}>
                            {alertMessage}
                        </p>
                    )}
                </div>
                
                {/* R6 (需求 #11) 修复: (V155 已存在) */}
                <p className={statusClassName}>
                    <span>
                        {/* V157 (R12) 修复: 'status' 变量将在此处动态显示 '计算中...' */}
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
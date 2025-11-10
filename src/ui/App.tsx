// src/ui/App.tsx (V151: 修复主题自适应、文本赘述和 V148 语法错误)
import { useState, useEffect } from 'react';
import * as Rules from '../config/model_rules.json'; 

/**
 * 消息类型枚举 (UI Script 独立定义以避免模块解析错误)
 */
enum MessageType {
    // 仅包含 UI 监听的类型
    UPDATE_UI_TOKENS = 'UPDATE_UI_TOKENS',
    UPDATE_UI_COUNTERS = 'UPDATE_UI_COUNTERS',
    UPDATE_UI_MODEL = 'UPDATE_UI_MODEL',
    UPDATE_UI_STATUS = 'UPDATE_UI_STATUS',
    REQUEST_INITIAL_STATE = 'REQUEST_INITIAL_STATE', 
}

// 导入规则和默认值
const MODEL_RULES = Rules.MODELS as Record<string, { MAX_TOKENS: number, ALERT_THRESHOLD: number }>;
const COST_RULES = Rules.COST_RULES as { THOUGHT_COST_PER_TURN: number, FILE_COST_PER_UNIT: number };
const DEFAULT_MODEL_NAME = Rules.DEFAULT_MODEL_NAME;

const getMessage = (key: string) => {
    if (key === 'labelText') return (typeof chrome !== 'undefined' && chrome.i18n.getMessage(key)) || '文本';
    return typeof chrome !== 'undefined' && chrome.i18n ? chrome.i18n.getMessage(key) : `[${key}]`;
};
interface TokenState {
    total: number;
    text: number;
    file: number;
    thought: number;
}
const initialState: TokenState = {
    total: 0,
    text: 0,
    file: 0,
    thought: 0,
};

function App() {
    const [tokens, setTokens] = useState<TokenState>(initialState);
    const [modelName, setModelName] = useState<string>(DEFAULT_MODEL_NAME); 
    const [status, setStatus] = useState<string>(''); 
    
    // V167: 实现主题自适应逻辑
    const [isDark, setIsDark] = useState(true); // 默认值不重要，useEffect 会立即覆盖它
    
    // V175 修复: 模型自适应 - 查找最匹配的规则
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
    
    // V147 (R11) 修复: 确保主题颜色在顶层定义
    const bgColor = isDark ? '#1e1e1e' : '#f0f0f0'; // 亮色背景
    const primaryTextColor = isDark ? '#fff' : '#333'; // 主要文本 (亮色/暗色)
    const secondaryTextColor = isDark ? '#ccc' : '#555'; // 次要文本 (亮色/暗色)
    const noteColor = isDark ? '#888' : '#666'; // 状态和说明文本
    
    let totalColor = primaryTextColor; // 默认总计颜色
    
    // R3 (需求 #5) 修复: 默认 alertMessage 为空，不再显示 "上限:"
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
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDark(query.matches); // 立即设置
        const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
        query.addEventListener('change', listener);
        
        chrome.runtime.sendMessage({ type: MessageType.REQUEST_INITIAL_STATE })
            .then(() => {}) 
            .catch(() => {});
        
        return () => query.removeEventListener('change', listener);
    }, []); 


    useEffect(() => {
        const messageHandler = (message: any, _sender: chrome.runtime.MessageSender, _sendResponse: (response: any) => void) => {
            
            // 1. 处理模型名称更新 
            if (message.type === MessageType.UPDATE_UI_MODEL) {
                setModelName(message.modelName);
            }
            
            // 2. 处理文件/思考计数的更新 
            if (message.type === MessageType.UPDATE_UI_COUNTERS) {
                const calculatedThought = message.thoughtTurns * COST_RULES.THOUGHT_COST_PER_TURN; 
                const calculatedFile = message.fileCount * COST_RULES.FILE_COST_PER_UNIT;       

                setTokens(prev => ({
                    ...prev,
                    thought: calculatedThought,
                    file: calculatedFile,
                    total: prev.text + calculatedThought + calculatedFile,
                }));
            }

            // 3. 处理文本 Token 更新 (来自 Background/Offscreen)
            if (message.type === MessageType.UPDATE_UI_TOKENS) {
                const newTextTotal = message.totalTokens;
                
                setTokens(prev => ({
                    ...prev,
                    text: newTextTotal - prev.file - prev.thought, 
                    total: newTextTotal, 
                }));
            }

            // 4. 处理状态更新
            if (message.type === MessageType.UPDATE_UI_STATUS) {
                setStatus(chrome.i18n.getMessage(message.data.status) || message.data.status);
            }
        };

        chrome.runtime.onMessage.addListener(messageHandler);
        return () => {
            chrome.runtime.onMessage.removeListener(messageHandler);
        };
    }, [modelName]); 
    
    const handleSettingsClick = () => {
        // R5 (需求 #8) 修复: 移除 "cdn" 字样
        alert('设置功能 (Phase 2) 待开发，用于语言切换（中/英）等。');
    };

    // --- 渲染部分 (V151 修复主题) ---
    const renderCountRow = (label: string, count: number) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0'}}>
            {/* R11 (需求 #4/5) 修复: 使用自适应颜色 */}
            <span style={{ color: secondaryTextColor }}> 
                {label}
            </span>
            {/* R11 (需求 #4/5) 修复: 使用自适应颜色 */}
            <span style={{ color: primaryTextColor }}> 
                {count.toLocaleString()}
            </span>
        </div>
    );

    const modelInfo = modelName; 
    
    // V175 修复: 集中总计显示逻辑
    const totalDisplay = `${tokens.total.toLocaleString()} / ${maxTokens.toLocaleString()} (${(usageRatio * 100).toFixed(1)}%)`;
    

    return (
        // R11 (需求 #6) 修复: 确保根 div 应用主题颜色
        <div style={{ padding: '10px', backgroundColor: bgColor, color: primaryTextColor, height: '100%', minWidth: '250px' }}>
            
            {/* R9 (需求 #1) 修复: 顶部标题栏（<h3/>）已被移除 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
                <button onClick={handleSettingsClick} style={{ background: 'none', border: 'none', color: primaryTextColor, cursor: 'pointer', fontSize: '14px', padding: '0 5px' }}>
                    ⚙️
                </button>
            </div>
            
            <div style={{ border: `1px solid ${isDark ? '#333' : '#ccc'}`, padding: '10px', borderRadius: '4px' }}>
                
                {/* (需求 #2, #3) 修复: 在内容区上方显示模型名称 */}
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: primaryTextColor }}>
                    模型: {modelInfo}
                </h4>

                {renderCountRow(getMessage('labelText'), tokens.text)}
                {renderCountRow(getMessage('labelFile'), tokens.file)}
                
                {/* V148 (语法修复): 修复了 V147 的 : 拼写错误 */}
                {renderCountRow(getMessage('labelThought'), tokens.thought)}
                
                {/* V175 修复: 集中总计显示，并应用告警色 */}
                <div style={{ marginTop: '10px', borderTop: `1px solid ${isDark ? '#444' : '#ccc'}`, paddingTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span style={{ color: primaryTextColor }}>总计:</span>
                        <span style={{ color: totalColor }}>{totalDisplay}</span>
                    </div>
                    {/* R3 (需求 #5) 修复: 仅在需要时显示告警消息 */}
                    {alertMessage && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: totalColor }}>
                            {alertMessage}
                        </p>
                    )}
                </div>
                
                {/* R6 (需求 #11) 修复: 更新说明文本、样式和颜色 */}
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: noteColor }}>
                    <span style={{color: noteColor, fontStyle: 'normal', fontSize: '11px'}}>
                        状态: {status || getMessage('statusReady')} 
                    </span>
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: noteColor }}>
                    <span style={{color: noteColor, fontStyle: 'normal', fontSize: '11px'}}>
                        说明：计数器自动统计当前对话内容。如需统计历史记录，请手动上滚页面。
                    </span>
                </p>
            </div>
            
        </div>
    );
}

export default App;
// src/ui/App.tsx (V121: 恢复核心测试按钮)
import { useState, useEffect } from 'react';

// 定义 UI 状态的接口
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
    const [status, setStatus] = useState<string>('就绪');
    const [testText, setTestText] = useState('Hello world! This is a test.'); // 用于手动测试

    // V121 核心：监听来自 Content Script 的 Token 更新
    useEffect(() => {
        // 1. 定义消息处理器
        const messageHandler = (message: any, _sender: chrome.runtime.MessageSender, _sendResponse: (response: any) => void) => {
            if (message.type === 'UPDATE_UI_TOKENS') {
                const newTotal = message.totalTokens;
                
                // 收到 Content Script 的实时更新
                setTokens(_prev => ({
                    total: newTotal,
                    text: newTotal, // 暂时将总数赋值给文本
                    file: 0, 
                    thought: 0,
                }));
                setStatus('实时计算');
            }
        };

        // 2. 注册监听器
        chrome.runtime.onMessage.addListener(messageHandler);

        // 3. 清理函数 (组件卸载时移除监听器)
        return () => {
            chrome.runtime.onMessage.removeListener(messageHandler);
        };
    }, []);

    /**
     * V121: 恢复手动计算按钮的逻辑
     */
    const handleCalculateTest = async () => {
        if (!testText) return;
        setStatus('手动计算中...');
        setTokens(initialState); // 清空显示

        try {
            // 向 Background (SW) 发送消息，使用测试文本
            const response = await chrome.runtime.sendMessage({
                type: 'BG_CALCULATE_TOKENS',
                text: testText,
            });
            
            // 收到结果
            const count = response?.tokenCount || 0;

            setTokens(_prev => ({
                total: count,
                text: count, 
                file: 0, 
                thought: 0,
            }));
            setStatus('手动计算完成');

        } catch (e) {
            console.error('UI: 手动计算失败。', e);
            setStatus('错误: 通信失败');
        }
    };


    // --- 渲染部分 ---
    const renderCountRow = (label: string, count: number, isTotal: boolean = false) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: isTotal ? '1px solid #444' : 'none' }}>
            <span style={{ fontWeight: isTotal ? 'bold' : 'normal', color: '#ccc' }}>
                {label}
            </span>
            <span style={{ fontWeight: isTotal ? 'bold' : 'normal', color: '#fff' }}>
                {count.toLocaleString()}
            </span>
        </div>
    );


    return (
        <div style={{ padding: '10px', backgroundColor: '#1e1e1e', color: '#fff', height: '100%', minWidth: '250px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Gemini Token Counter (v1.0 - {status})</h3>
            
            <div style={{ border: '1px solid #333', padding: '10px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#eee' }}>Token 精确计算 (总计: {tokens.total.toLocaleString()})</h4>
                
                {/* 文本 (精) */}
                {renderCountRow("文本 (精):", tokens.text)}
                
                {/* 文件 (?) */}
                {renderCountRow("文件 (?):", tokens.file)}
                
                {/* 思考 (?) */}
                {renderCountRow("思考 (?):", tokens.thought)}
                
                {/* 计算总计 */}
                <div style={{ marginTop: '10px' }}>
                    {renderCountRow("计算总计:", tokens.total, true)}
                </div>
                
                {/* 状态栏 */}
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: tokens.total > 0 ? '#4CAF50' : '#888' }}>
                    {tokens.total > 0 ? `上次更新: ${new Date().toLocaleTimeString('zh-CN')}` : '等待 Gemini 页面活动...'}
                </p>
            </div>

            {/* V121 关键修复: 恢复手动测试区域 */}
            <div style={{ marginTop: '15px', borderTop: '1px solid #444', paddingTop: '10px' }}>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>手动测试 (仅开发用)</h4>
                <textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder="输入测试文本..."
                    style={{ width: '90%', minHeight: '50px', marginBottom: '10px', padding: '5px' }}
                />
                <button onClick={handleCalculateTest} style={{ fontSize: '14px', padding: '5px 10px' }}>
                    计算 Token (测试)
                </button>
            </div>
        </div>
    );
}

export default App;
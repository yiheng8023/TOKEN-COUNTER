// src/ui/App.tsx
import { useState } from 'react';

function App() {
  const [text, setText] = useState('Hello world! This is a test.');
  const [result, setResult] = useState<string>('... (等待计算)');

  /**
   * "世界级" V3 计算链: UI -> Background (SW)
   */
  const handleCalculate = async () => {
    setResult('... (正在请求 SW...)');
    try {
      // 1. 向 Background (SW) 发送消息
      const response = await chrome.runtime.sendMessage({
        type: 'BG_CALCULATE_TOKENS',
        text: text,
      });
      
      // 3. 收到来自 Background (SW) 的最终结果
      setResult(`计算完成: ${response.tokenCount} tokens`);

    } catch (e) {
      console.error('UI: 与 Background (SW) 通信失败。', e);
      setResult('错误: 无法连接到 Service Worker。');
    }
  };

  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif' }}>
      <h1>TOKEN-COUNTER (v1.0)</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: '90%', minHeight: '100px', margin: '10px 0' }}
      />
      <button onClick={handleCalculate} style={{ fontSize: '16px' }}>
        计算 Token (测试)
      </button>
      <p style={{ fontWeight: 'bold' }}>
        结果: {result}
      </p>
    </div>
  );
}

export default App;
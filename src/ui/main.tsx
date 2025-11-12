// C:\Projects\TOKEN-COUNTER\src\ui\main.tsx
// 这是一个全新的入口文件，用于加载 V168 的 App.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // <--- 导入 V168 的 App.tsx
import './index.css';   // <--- 导入 V165 使用的 index.css

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Fatal Error: Root element 'root' not found in side-panel.html");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
// C:\Projects\TOKEN-COUNTER\src\offscreen\index.ts
// V1.7i (Task 1.7i): “全局”修复
// 移除 "return true;"，修复 "message channel closed" 错误。

console.log('Offscreen (V1.7i): 启动。');

// V1.7: 这里的 new Worker() 是合法的 (正确)
const modelWorker = new Worker(
    new URL('../background/modelWorker.ts', import.meta.url), 
    { type: 'module' }
);

console.log('Offscreen (V1.7i): Web Worker 已创建。正在建立通信桥梁...');

// 1. 监听来自 "总路由器" (Service Worker) 的消息
chrome.runtime.onMessage.addListener((message) => {
    // 立即将消息转发给 "计算工厂" (Web Worker)
    modelWorker.postMessage(message);
    
    // V1.7i 修复: 
    // 我们的 SW (V1.7) 架构 *从不* 使用 sendResponse()。
    // 我们所有的通信都使用 sendMessage。
    // 因此，我们 *决不能* "return true;"。
    // 移除 "return true;" 即可修复 "message channel closed" 错误。
    // return true; // <-- V1.7i: 必须删除
});

// 2. 监听来自 "计算工厂" (Web Worker) 的消息
modelWorker.onmessage = (event) => {
    // 立即将消息转发给 "总路由器" (Service Worker)
    chrome.runtime.sendMessage(event.data).catch(e => {
        // 捕获“No receiving end”错误（这是正常的，意味着 SW 正在重启）
        const msg = e.message;
        if (msg && !msg.includes('Receiving end does not exist')) {
            console.warn(`Offscreen (V1.7i): 无法发送消息到 SW`, e);
        }
    });
};

console.log('Offscreen (V1.7i): 通信桥梁已建立。');
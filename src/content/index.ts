// C:\Projects\TOKEN-COUNTER\src\content\index.ts
// V1.5d (Task 1.5d): 移除 .ts 扩展名

console.log('TOKEN-COUNTER Content Script (V1.5d) is loaded.');

/**
 * 动态加载器
 * V1.5: 我们只关心 Gemini，因此我们硬编码加载它。
 * * V2.0 (未来 - "水平扩张"): 
 * 这里将检测 window.location.hostname，
 * 然后动态 import('./engines/chatgpt') 或 import('./engines/claude')
 */

if (window.location.hostname.includes('gemini.google.com')) {
    
    // V1.5d 修复: 移除 .ts 扩展名
    import('./engines/gemini/index')
        .then(() => {
            console.log('CS (V1.5d): Gemini 引擎加载成功。');
        })
        .catch(e => {
            console.error('CS (V1.5d): 无法加载 Gemini 引擎!', e);
        });
}
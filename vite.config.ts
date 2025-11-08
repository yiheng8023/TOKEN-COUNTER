import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// V18 最终版: 真正"世界级"的多入口配置
export default defineConfig({
  plugins: [react()],
  // 关键: publicDir (V14) 仍然是正确的，它负责复制 manifest.json
  publicDir: 'public',
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // 关键: 我们有 3 个独立的入口
      input: {
        // 1. HTML 入口
        // Vite 会自动处理这个 HTML，并将其复制到 dist/side-panel.html
        'side-panel': resolve(__dirname, 'src/ui/side-panel.html'),
        
        // 2. JS 入口 (后台)
        background: resolve(__dirname, 'src/background/index.ts'),
        
        // 3. JS 入口 (内容)
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        // 关键: 我们只为 JS 入口 (background, content)
        // 自定义名称。我们让 Vite 自动处理 HTML。
        entryFileNames: (chunkInfo) => {
          // 对 'background' 和 'content' 入口使用 [name].js
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js'; // -> dist/background.js, dist/content.js
          }
          // 让 Vite 默认处理 'side-panel' 的 JS (e.g., dist/assets/index-XXXX.js)
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
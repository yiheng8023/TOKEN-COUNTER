import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// V138 最终版: 修复 Content Script 动态加载失败的问题
export default defineConfig({
  plugins: [
    react()
  ],
  publicDir: 'public',
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // 关键 V138 修复: Content Script 不再是主要 Rollup 入口
      input: {
        'side-panel': resolve(__dirname, 'src/ui/side-panel.html'),
        'offscreen': resolve(__dirname, 'src/engine/offscreen.html'), 
        background: resolve(__dirname, 'src/background/index.ts'),
        // Content Script (src/content/index.ts) 被移除
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') { // 只处理 background
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
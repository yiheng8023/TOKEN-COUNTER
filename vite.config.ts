import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// V93 最终版: 解决 "You must supply options.input" 错误
export default defineConfig({
  plugins: [
    react()
  ],
  publicDir: 'public',
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // 关键 (V93 修复): 核心库 core.ts 应该被 *其他入口文件* 导入，
      // 而不是作为独立的 input。
      input: {
        'side-panel': resolve(__dirname, 'src/ui/side-panel.html'),
        'offscreen': resolve(__dirname, 'src/engine/offscreen.html'), 
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js';
          }
          // 让所有核心逻辑 (包括 core.ts 及其导入的 JSON) 打包到 chunks 中
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
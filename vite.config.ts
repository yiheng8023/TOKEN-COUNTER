// C:\Projects\TOKEN-COUNTER\vite.config.ts
// V41.0: 移除 Rollup 复制插件，防止与 Node.js 脚本冲突。

import { defineConfig } from 'vite';
import { resolve } from 'path';
// import copy from 'rollup-plugin-copy'; // V41.0: 移除

export default defineConfig({
  // V41.0: 移除 plugins 数组，避免冲突
  plugins: [
    
  ],
  publicDir: false, 
  
  build: {
    outDir: 'dist',
    // 禁用内部清理，由 npm 脚本负责
    emptyOutDir: false, 
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        main: resolve(__dirname, 'src/ui/main.ts'), 
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
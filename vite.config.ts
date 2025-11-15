// C:\Projects\TOKEN-COUNTER\vite.config.ts
// T-1: 移除 background 入口

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
  ],
  publicDir: 'public', 
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    
    // T-1: 移除 modulePreload (不再需要)
    target: 'es2020', 

    rollupOptions: {
      input: {
        // T-1: 移除 background 入口
        main: resolve(__dirname, 'src/ui/main.ts'), 
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  
  // V180.0: 移除 @/ 别名解析
});
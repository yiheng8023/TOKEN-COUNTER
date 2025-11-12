// C:\Projects\TOKEN-COUNTER\vite.config.ts
// V5.0 (Task P-UI): 激进重构
// 1. *删除* React 插件
// 2. 将 'main' 入口指向 Vanilla JS

import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react'; // V5.0 删除
import { resolve } from 'path';
import copy from 'rollup-plugin-copy';

export default defineConfig({
  plugins: [
    // react(), // V5.0 删除
    copy({
      targets: [
        { src: 'public/icons', dest: 'dist' },
        { src: 'src/ui/side-panel.html', dest: 'dist' }, 
        { src: 'public/_locales', dest: 'dist' },
        { src: 'public/manifest.json', dest: 'dist' },
        { src: 'src/offscreen/offscreen.html', dest: 'dist' } 
      ],
      hook: 'writeBundle'
    })
  ],
  publicDir: false, 
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        
        // V5.0 (P-UI) 激进重构: 
        // 入口现在是 Vanilla JS
        main: resolve(__dirname, 'src/ui/main.ts'), 
        
        offscreen: resolve(__dirname, 'src/offscreen/index.ts') 
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
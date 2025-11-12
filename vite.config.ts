import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import copy from 'rollup-plugin-copy';

export default defineConfig({
  plugins: [
    react(),
    copy({
      targets: [
        { src: 'public/icons', dest: 'dist' },
        { src: 'src/ui/side-panel.html', dest: 'dist' },
        { src: 'src/engine/offscreen.html', dest: 'dist' },
        { src: 'public/_locales', dest: 'dist' },
        { src: 'public/manifest.json', dest: 'dist' },
        { src: 'src/engine/models/gemini', dest: 'dist/models' } // <--- 关键修正：复制本地模型文件
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
        main: resolve(__dirname, 'src/ui/main.tsx') 
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
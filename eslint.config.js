// C:\Projects\TOKEN-COUNTER\eslint.config.js
// V67.0 (Req 5): 移除所有 React 相关的冗余 ESlint 配置

import js from '@eslint/js'
import globals from 'globals'
// V67.0: 移除 React 依赖
// import reactHooks from 'eslint-plugin-react-hooks'
// import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    // V67.0: 仅 lint TypeScript 文件
    files: ['**/*.{ts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // V67.0: 移除 React 规则
      // reactHooks.configs['recommended-latest'],
      // reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
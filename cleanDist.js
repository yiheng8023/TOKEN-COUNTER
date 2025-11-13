// C:\Projects\TOKEN-COUNTER\cleanDist.js
// V50.0: 修复模块冲突 - 切换到 ESM (import) 语法

import * as fs from 'fs';
import * as path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');

// 原生 Node.js 递归删除目录 (使用同步 fs 方法)
function removeDirRecursiveSync(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) { 
                removeDirRecursiveSync(curPath);
            } else {
                fs.unlinkSync(curPath); 
            }
        });
        // 确保文件夹是空的才能删除 (使用 rmdirSync)
        fs.rmdirSync(dirPath); 
    }
}

function cleanDist() {
    console.log('--- Executing Reliable Dist Cleanup (V50.0 - Native FS ESM) ---');
    try {
        removeDirRecursiveSync(distDir);
        console.log(`Successfully removed: ${distDir}`);
    } catch (err) {
        // 由于 cleanDist 在构建开始时执行，目录不存在是正常的，不应退出进程
        console.error('Warning: Failed to reliably clean dist directory.', err.message);
    }
    console.log('--- Cleanup Complete ---');
}

cleanDist();
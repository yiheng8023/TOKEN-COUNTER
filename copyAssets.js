// C:\Projects\TOKEN-COUNTER\copyAssets.js
// V50.0: 修复模块冲突 - 切换到 ESM (import) 语法

import * as fs from 'fs';
import * as path from 'path';

const projectRoot = process.cwd(); 
const distDir = path.join(projectRoot, 'dist');

const ASSETS_TO_COPY = [
    { src: 'public/icons', dest: path.join(distDir, 'icons') },
    { src: 'public/_locales', dest: path.join(distDir, '_locales') },
    { src: 'src/ui/side-panel.html', dest: path.join(distDir, 'side-panel.html') }
];

const MANIFEST_COPY = { src: 'public/manifest.json', dest: path.join(distDir, 'manifest.json') };

// 同步递归复制文件夹
function copyFolderRecursiveSync(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    if (fs.lstatSync(source).isDirectory()) {
        fs.readdirSync(source).forEach(file => {
            const curSource = path.join(source, file);
            const curTarget = path.join(target, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, curTarget);
            } else {
                fs.copyFileSync(curSource, curTarget);
            }
        });
    }
}

function copyAssets() {
    console.log('--- Executing Prebuild Asset Copy (V50.0 - Native FS ESM) ---');
    
    // 确保 dist 目录存在 
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir);
    }

    // 1. 复制所有非清单文件 (icons, _locales, html)
    for (const asset of ASSETS_TO_COPY) {
        const sourcePath = path.join(projectRoot, asset.src);
        
        try {
            if (fs.lstatSync(sourcePath).isDirectory()) {
                copyFolderRecursiveSync(sourcePath, asset.dest);
                console.log(`Copied Directory: ${asset.src} -> ${asset.dest}`);
            } else {
                fs.copyFileSync(sourcePath, asset.dest);
                console.log(`Copied File: ${asset.src} -> ${asset.dest}`);
            }
        } catch (err) {
            console.error(`FATAL ERROR: Error copying ${asset.src}. Check permissions/path:`, err.message);
            process.exit(1);
        }
    }

    // 2. 核心：最后复制 manifest.json
    try {
        const sourcePath = path.join(projectRoot, MANIFEST_COPY.src);
        fs.copyFileSync(sourcePath, MANIFEST_COPY.dest);
        console.log(`Copied File: ${MANIFEST_COPY.src} -> ${MANIFEST_COPY.dest}`);
    } catch (err) {
        console.error(`FATAL ERROR: Failed to copy manifest.json last:`, err.message);
        process.exit(1);
    }

    console.log('--- Asset Copy Complete ---');
}

copyAssets();
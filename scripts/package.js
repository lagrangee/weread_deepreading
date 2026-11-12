#!/usr/bin/env node

/**
 * @file 扩展打包脚本
 * @description 为Chrome Web Store发布准备扩展包
 * @author lagrangee
 * @date 2024-01-01
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const packageJson = require('../package.json');

const DIST_DIR = path.join(__dirname, '../dist');
const OUTPUT_DIR = path.join(__dirname, '../');
const VERSION = packageJson.version;
const ZIP_NAME = `weread-deepreading-v${VERSION}.zip`;

/**
 * 创建发布包
 */
async function createPackage() {
  console.log('📦 开始创建发布包...');

  // 检查dist目录是否存在
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist目录不存在，请先运行 npm run build');
    process.exit(1);
  }

  // 创建zip文件
  const output = fs.createWriteStream(path.join(OUTPUT_DIR, ZIP_NAME));
  const archive = archiver('zip', {
    zlib: { level: 9 } // 最高压缩级别
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ 发布包创建成功！`);
      console.log(`📁 文件名: ${ZIP_NAME}`);
      console.log(`📊 大小: ${sizeInMB} MB`);
      console.log(`📍 位置: ${path.join(OUTPUT_DIR, ZIP_NAME)}`);
      resolve();
    });

    archive.on('error', (err) => {
      console.error('❌ 打包失败:', err);
      reject(err);
    });

    archive.pipe(output);

    // 添加dist目录下的所有文件
    archive.directory(DIST_DIR, false);

    // 完成打包
    archive.finalize();
  });
}

/**
 * 验证发布包内容
 */
function validatePackage() {
  console.log('🔍 验证发布包内容...');

  const requiredFiles = [
    'manifest.json',
    'background.bundle.js',
    'content.bundle.js',
    'content-vendor.bundle.js',
    'popup.bundle.js',
    'popup-vendor.bundle.js',
    'popup/popup.html',
    'content/assistant-panel.html',
    'content/assistant-panel.css',
    'popup/popup.css',
    'assets/promotion/deepreading-app-store.png',
    'assets/icons/icon16.png',
    'assets/icons/icon32.png',
    'assets/icons/icon48.png',
    'assets/icons/icon64.png',
    'assets/icons/icon128.png'
  ];

  const missingFiles = [];

  for (const file of requiredFiles) {
    const filePath = path.join(DIST_DIR, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    console.error('❌ 缺少必要文件:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }

  console.log('✅ 所有必要文件都存在');
}

/**
 * 生成发布信息
 */
function generateReleaseInfo() {
  const releaseInfo = {
    name: packageJson.name,
    version: VERSION,
    description: packageJson.description,
    author: packageJson.author,
    buildTime: new Date().toISOString(),
    files: fs.readdirSync(DIST_DIR, { recursive: true })
  };

  const infoPath = path.join(OUTPUT_DIR, `release-info-v${VERSION}.json`);
  fs.writeFileSync(infoPath, JSON.stringify(releaseInfo, null, 2));

  console.log(`📋 发布信息已生成: ${infoPath}`);
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log(`🚀 开始打包 ${packageJson.name} v${VERSION}`);
    console.log('');

    // 验证文件
    validatePackage();
    console.log('');

    // 创建发布包
    await createPackage();
    console.log('');

    // 生成发布信息
    generateReleaseInfo();
    console.log('');

    console.log('🎉 打包完成！');
    console.log('');
    console.log('📋 下一步操作:');
    console.log('1. 访问 https://chrome.google.com/webstore/developer/dashboard');
    console.log('2. 打开现有扩展并上传新版本');
    console.log(`3. 上传 ${ZIP_NAME} 文件`);
    console.log('4. 填写商店信息并提交审核');

  } catch (error) {
    console.error('❌ 打包失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main();

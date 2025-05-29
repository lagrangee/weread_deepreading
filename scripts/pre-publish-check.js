#!/usr/bin/env node

/**
 * @file 发布前检查脚本
 * @description 检查Chrome Web Store发布所需的所有文件和信息
 * @author lagrangee
 * @date 2024-01-01
 */

const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

/**
 * 检查项目结构
 */
function checkProjectStructure() {
  console.log('🔍 检查项目结构...');
  
  const requiredFiles = [
    'manifest.json',
    'README.md',
    'PRIVACY.md',
    'LICENSE',
    'package.json',
    'webpack.config.js',
    'store/chrome-web-store-info.md'
  ];
  
  const requiredDirs = [
    'src',
    'assets/icons',
    'docs',
    'specs',
    'scripts'
  ];
  
  let allGood = true;
  
  // 检查文件
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ 缺少文件: ${file}`);
      allGood = false;
    } else {
      console.log(`✅ ${file}`);
    }
  }
  
  // 检查目录
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      console.error(`❌ 缺少目录: ${dir}`);
      allGood = false;
    } else {
      console.log(`✅ ${dir}/`);
    }
  }
  
  return allGood;
}

/**
 * 检查图标文件
 */
function checkIcons() {
  console.log('\n🎨 检查图标文件...');
  
  const iconSizes = [16, 32, 48, 64, 128];
  let allGood = true;
  
  for (const size of iconSizes) {
    const iconPath = `assets/icons/icon${size}.png`;
    if (!fs.existsSync(iconPath)) {
      console.error(`❌ 缺少图标: ${iconPath}`);
      allGood = false;
    } else {
      const stats = fs.statSync(iconPath);
      console.log(`✅ icon${size}.png (${(stats.size / 1024).toFixed(1)}KB)`);
    }
  }
  
  return allGood;
}

/**
 * 检查manifest.json
 */
function checkManifest() {
  console.log('\n📋 检查manifest.json...');
  
  try {
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    let allGood = true;
    
    // 检查必要字段
    const requiredFields = [
      'manifest_version',
      'name',
      'version',
      'description',
      'permissions',
      'action',
      'background',
      'content_scripts',
      'icons'
    ];
    
    for (const field of requiredFields) {
      if (!manifest[field]) {
        console.error(`❌ manifest.json缺少字段: ${field}`);
        allGood = false;
      } else {
        console.log(`✅ ${field}`);
      }
    }
    
    // 检查版本号是否与package.json一致
    if (manifest.version !== packageJson.version) {
      console.error(`❌ 版本号不一致: manifest.json(${manifest.version}) vs package.json(${packageJson.version})`);
      allGood = false;
    } else {
      console.log(`✅ 版本号一致: ${manifest.version}`);
    }
    
    // 检查权限
    if (manifest.permissions && manifest.permissions.length > 0) {
      console.log(`✅ 权限: ${manifest.permissions.join(', ')}`);
    }
    
    return allGood;
  } catch (error) {
    console.error('❌ manifest.json格式错误:', error.message);
    return false;
  }
}

/**
 * 检查构建文件
 */
function checkBuildFiles() {
  console.log('\n🏗️ 检查构建文件...');
  
  if (!fs.existsSync('dist')) {
    console.error('❌ dist目录不存在，请先运行 npm run build');
    return false;
  }
  
  const requiredBuildFiles = [
    'dist/manifest.json',
    'dist/background.bundle.js',
    'dist/content.bundle.js',
    'dist/content-vendor.bundle.js',
    'dist/popup.bundle.js',
    'dist/popup-vendor.bundle.js',
    'dist/popup/popup.html',
    'dist/content/assistant-panel.html',
    'dist/content/assistant-panel.css',
    'dist/popup/popup.css'
  ];
  
  let allGood = true;
  
  for (const file of requiredBuildFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ 缺少构建文件: ${file}`);
      allGood = false;
    } else {
      const stats = fs.statSync(file);
      console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
    }
  }
  
  return allGood;
}

/**
 * 检查文档完整性
 */
function checkDocumentation() {
  console.log('\n📚 检查文档完整性...');
  
  let allGood = true;
  
  // 检查README.md
  const readme = fs.readFileSync('README.md', 'utf8');
  if (readme.length < 1000) {
    console.error('❌ README.md内容过少');
    allGood = false;
  } else {
    console.log(`✅ README.md (${(readme.length / 1024).toFixed(1)}KB)`);
  }
  
  // 检查隐私政策
  const privacy = fs.readFileSync('PRIVACY.md', 'utf8');
  if (privacy.length < 500) {
    console.error('❌ PRIVACY.md内容过少');
    allGood = false;
  } else {
    console.log(`✅ PRIVACY.md (${(privacy.length / 1024).toFixed(1)}KB)`);
  }
  
  // 检查商店信息
  const storeInfo = fs.readFileSync('store/chrome-web-store-info.md', 'utf8');
  if (storeInfo.length < 1000) {
    console.error('❌ chrome-web-store-info.md内容过少');
    allGood = false;
  } else {
    console.log(`✅ chrome-web-store-info.md (${(storeInfo.length / 1024).toFixed(1)}KB)`);
  }
  
  return allGood;
}

/**
 * 检查发布包
 */
function checkReleasePackage() {
  console.log('\n📦 检查发布包...');
  
  const zipFile = `weread-deepreading-v${packageJson.version}.zip`;
  
  if (!fs.existsSync(zipFile)) {
    console.error(`❌ 发布包不存在: ${zipFile}`);
    console.log('💡 请运行: npm run package');
    return false;
  }
  
  const stats = fs.statSync(zipFile);
  const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
  
  if (stats.size > 128 * 1024 * 1024) { // 128MB限制
    console.error(`❌ 发布包过大: ${sizeInMB}MB (限制: 128MB)`);
    return false;
  }
  
  console.log(`✅ ${zipFile} (${sizeInMB}MB)`);
  return true;
}

/**
 * 生成发布清单
 */
function generateReleaseChecklist() {
  console.log('\n📋 生成发布清单...');
  
  const checklist = `
# Chrome Web Store 发布清单

## 技术准备 ✅
- [x] 项目结构完整
- [x] 图标文件齐全
- [x] manifest.json正确
- [x] 构建文件完整
- [x] 发布包生成

## 文档准备 ✅
- [x] README.md完整
- [x] 隐私政策完整
- [x] 商店信息准备

## 待完成项目 ⏳
- [ ] 准备截图 (1280x800)
  - [ ] 主界面截图
  - [ ] 解释功能演示
  - [ ] 消化功能演示
  - [ ] 兼听功能演示
  - [ ] 设置界面截图
- [ ] 确认支持邮箱
- [ ] 上传到GitHub并确保隐私政策URL可访问

## 发布步骤
1. 访问: https://chrome.google.com/webstore/developer/dashboard
2. 点击"新增项目"
3. 上传: weread-deepreading-v${packageJson.version}.zip
4. 填写商店信息 (参考: store/chrome-web-store-info.md)
5. 上传截图
6. 提交审核

## 发布后
- [ ] 监控审核状态
- [ ] 准备用户反馈处理
- [ ] 计划后续更新

---
生成时间: ${new Date().toISOString()}
版本: ${packageJson.version}
`;
  
  fs.writeFileSync('RELEASE_CHECKLIST.md', checklist);
  console.log('✅ 发布清单已生成: RELEASE_CHECKLIST.md');
}

/**
 * 主函数
 */
function main() {
  console.log(`🚀 微信读书深度阅读助手 v${packageJson.version} 发布前检查\n`);
  
  const checks = [
    checkProjectStructure,
    checkIcons,
    checkManifest,
    checkBuildFiles,
    checkDocumentation,
    checkReleasePackage
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 所有检查通过！准备发布到Chrome Web Store');
    generateReleaseChecklist();
    
    console.log('\n📋 下一步操作:');
    console.log('1. 准备5张截图 (1280x800)');
    console.log('2. 确认支持邮箱地址');
    console.log('3. 访问 Chrome Web Store 开发者控制台');
    console.log('4. 上传发布包并填写信息');
    console.log('5. 提交审核');
  } else {
    console.log('❌ 检查未通过，请修复上述问题后重试');
    process.exit(1);
  }
}

// 运行检查
main(); 
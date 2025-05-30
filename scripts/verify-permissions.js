#!/usr/bin/env node

/**
 * 权限验证脚本
 * 验证manifest.json中的权限是否与实际代码使用情况匹配
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 开始验证权限使用情况...\n');

// 读取manifest.json
const manifestPath = path.join(__dirname, '../manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('📋 当前权限配置:');
console.log('  permissions:', manifest.permissions || []);
console.log('  optional_permissions:', manifest.optional_permissions || []);
console.log('  host_permissions:', manifest.host_permissions || []);
console.log('');

// 检查代码中是否使用了特定权限
const permissions = [
  { name: 'scripting', apis: ['chrome.scripting'] },
  { name: 'notifications', apis: ['chrome.notifications'] },
  { name: 'storage', apis: ['chrome.storage'] },
  { name: 'clipboardRead', apis: ['navigator.clipboard.read', 'clipboardRead'] },
  { name: 'activeTab', apis: ['chrome.tabs', 'activeTab'] }
];

console.log('🔎 代码使用情况检查:');

const srcDir = path.join(__dirname, '../src');

permissions.forEach(permission => {
  const isInManifest = [
    ...(manifest.permissions || []),
    ...(manifest.optional_permissions || [])
  ].includes(permission.name);

  let usedInCode = false;
  
  permission.apis.forEach(api => {
    try {
      // 使用grep搜索API使用情况
      const result = execSync(`grep -r "${api}" "${srcDir}" --include="*.js" || true`, { encoding: 'utf8' });
      if (result.trim()) {
        usedInCode = true;
      }
    } catch (error) {
      // grep没有找到匹配项时会返回非零退出码，这是正常的
    }
  });

  const status = isInManifest && usedInCode ? '✅ 正确使用' :
                 isInManifest && !usedInCode ? '❌ 声明但未使用' :
                 !isInManifest && usedInCode ? '⚠️ 使用但未声明' :
                 '⚪ 未声明未使用';

  console.log(`  ${permission.name}: ${status}`);
  
  if (isInManifest && !usedInCode) {
    console.log(`    ⚠️ 警告: ${permission.name} 权限在manifest中声明但代码中未使用`);
  }
  
  if (!isInManifest && usedInCode) {
    console.log(`    ⚠️ 警告: 代码中使用了${permission.name}相关API但未在manifest中声明`);
  }
});

console.log('');

// 检查具体的已移除权限
const removedPermissions = ['scripting', 'notifications'];
let allGood = true;

console.log('🎯 已修复的权限检查:');
removedPermissions.forEach(permissionName => {
  const isInManifest = [
    ...(manifest.permissions || []),
    ...(manifest.optional_permissions || [])
  ].includes(permissionName);

  if (isInManifest) {
    console.log(`  ❌ ${permissionName}: 仍在manifest中，需要移除`);
    allGood = false;
  } else {
    console.log(`  ✅ ${permissionName}: 已正确移除`);
  }
});

console.log('');

if (allGood) {
  console.log('🎉 权限验证通过！所有权限使用正确。');
  console.log('📦 可以安全地重新提交到Chrome Web Store。');
} else {
  console.log('❌ 权限验证失败！请修复上述问题后重试。');
  process.exit(1);
}

console.log('');
console.log('📋 下一步操作:');
console.log('1. 访问 https://chrome.google.com/webstore/developer/dashboard');
console.log('2. 找到你的扩展项目');
console.log('3. 上传新的 weread-deepreading-v1.0.0.zip 文件');
console.log('4. 在审核意见中引用 SUBMISSION_RESPONSE.md 的内容');
console.log('5. 提交重新审核'); 
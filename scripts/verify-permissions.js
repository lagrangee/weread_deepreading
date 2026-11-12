#!/usr/bin/env node

/** 本项目的最小权限约定：storage + 实际 AI API 域名 + 微信读书设置通知。 */
const fs = require('fs');
const path = require('path');

function validatePermissions(manifest, endpoints) {
  const errors = [];
  const permissions = manifest.permissions || [];
  if (permissions.length !== 1 || permissions[0] !== 'storage') {
    errors.push('仅需 storage；chrome.tabs.query/sendMessage 不代表需要 activeTab 或 tabs');
  }
  if ((manifest.optional_permissions || []).length > 0) {
    errors.push('当前功能不需要 optional_permissions');
  }
  if ((manifest.optional_host_permissions || []).length > 0) {
    errors.push('当前功能不需要 optional_host_permissions');
  }

  const requiredHosts = new Set([
    ...Object.values(endpoints).map(config => `${new URL(config.url).origin}/*`),
    'https://weread.qq.com/*',
  ]);
  const declaredHosts = new Set(manifest.host_permissions || []);
  for (const host of requiredHosts) {
    if (!declaredHosts.has(host)) {
      errors.push(`缺少功能所需的精确域名：${host}`);
    }
  }
  for (const host of declaredHosts) {
    if (!requiredHosts.has(host)) {
      errors.push(`移除未使用或范围过大的域名：${host}`);
    }
  }

  return errors;
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  // 配置文件只有静态导出；data URL 允许 Node 18+ 读取该 ESM，无需修改项目模块类型。
  const configSource = fs.readFileSync(path.join(root, 'src/shared/config.js'));
  const { CONFIG } = await import(`data:text/javascript;base64,${configSource.toString('base64')}`);
  const errors = validatePermissions(manifest, CONFIG.API_ENDPOINTS);
  if (errors.length) {
    for (const error of errors) {
      console.error(`权限检查失败：${error}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `v${manifest.version} 权限检查通过：storage，${manifest.host_permissions.length} 个精确域名`
  );
}

module.exports = { validatePermissions };
if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

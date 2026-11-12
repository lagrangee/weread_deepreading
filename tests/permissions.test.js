import fs from 'fs';
import path from 'path';
import { CONFIG } from '../src/shared/config.js';
import { validatePermissions } from '../scripts/verify-permissions.js';

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8'));

test('只声明实际使用的 storage，不再声明 activeTab', () => {
  expect(manifest.permissions).toEqual(['storage']);
  expect(manifest.optional_permissions || []).toEqual([]);
});

test('主机授权只覆盖实际 API 域名和设置通知所需的微信读书域名', () => {
  const expected = new Set([
    ...Object.values(CONFIG.API_ENDPOINTS).map(config => `${new URL(config.url).origin}/*`),
    'https://weread.qq.com/*',
  ]);
  expect(new Set(manifest.host_permissions)).toEqual(expected);
  expect(manifest.host_permissions.every(pattern => !pattern.includes('*.'))).toBe(true);
});

test('权限验证器拦截 activeTab 回归和通配域名', () => {
  expect(validatePermissions(manifest, CONFIG.API_ENDPOINTS)).toEqual([]);
  const excessive = {
    ...manifest,
    permissions: ['storage', 'activeTab'],
    host_permissions: [...manifest.host_permissions, 'https://*.volces.com/*'],
  };
  expect(validatePermissions(excessive, CONFIG.API_ENDPOINTS)).toHaveLength(2);
});

test('权限验证器不会漏掉缺失的功能所需域名', () => {
  const missing = { ...manifest, host_permissions: ['https://weread.qq.com/*'] };
  expect(validatePermissions(missing, CONFIG.API_ENDPOINTS)).toHaveLength(6);
});

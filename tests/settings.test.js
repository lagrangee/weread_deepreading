import { SettingsService } from '../src/shared/settings-service.js';

function storageArea(values = {}) {
  return {
    values,
    get: jest.fn(async key => ({ [key]: values[key] })),
    set: jest.fn(async update => Object.assign(values, update)),
    remove: jest.fn(async keys => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete values[key];
      }
    }),
  };
}

let service;
beforeEach(() => {
  chrome.storage.local = storageArea();
  chrome.storage.sync = storageArea();
  service = new SettingsService();
});

test('关闭面板后，保存的 false 不被默认 true 覆盖', async () => {
  await service.saveShowing(false);
  expect(await service.loadShowing()).toBe(false);
});

test('保留旧版已同步的 API Key，不迁移或删除', async () => {
  chrome.storage.sync.values.apiKeys = { qianwen: 'test-only-key' };
  expect(await service.loadAPIKeys()).toEqual({ qianwen: 'test-only-key' });
  expect(chrome.storage.sync.values.apiKeys).toEqual({ qianwen: 'test-only-key' });
  expect(chrome.storage.sync.remove).not.toHaveBeenCalled();
  expect(chrome.storage.local.set).not.toHaveBeenCalled();
});

test('新密钥和偏好继续保存到 Chrome 同步区', async () => {
  await service.saveAPIKeys({ kimi: 'new-test-key' });
  await service.saveProvider('kimi');
  expect(chrome.storage.sync.values.apiKeys).toEqual({ kimi: 'new-test-key' });
  expect(chrome.storage.sync.values.provider).toBe('kimi');
  expect(chrome.storage.local.set).not.toHaveBeenCalled();
});

test('用户清除设置时同步区密钥也会清除', async () => {
  chrome.storage.sync.values.apiKeys = { kimi: 'test-only-key' };
  await service.clearAllSettings();
  expect(chrome.storage.sync.values.apiKeys).toBeUndefined();
});

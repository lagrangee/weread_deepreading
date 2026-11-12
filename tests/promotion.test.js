import fs from 'fs';
import path from 'path';
import { initAppPromotion } from '../src/shared/app-promotion.js';

const panelHTML = fs.readFileSync(
  path.join(__dirname, '../src/content/assistant-panel.html'),
  'utf8'
);
let saved;
beforeEach(() => {
  saved = {};
  chrome.storage.local.get.mockImplementation(async key => ({ [key]: saved[key] }));
  chrome.storage.local.set.mockImplementation(async update => Object.assign(saved, update));
  document.body.innerHTML = panelHTML;
});

test('入口链接直达 App Store，二维码使用打包资源，不发跟踪请求', async () => {
  await initAppPromotion(document);
  const promotion = document.querySelector('[data-app-promotion]');
  expect(promotion.hidden).toBe(false);
  expect(promotion.querySelector('img').src).toBe(
    'chrome-extension://mock-extension-id/assets/promotion/deepreading-app-store.png'
  );
  for (const link of promotion.querySelectorAll('a')) {
    expect(link.href).toBe('https://apps.apple.com/app/id6827442865');
    expect(link.rel).toBe('noopener noreferrer');
  }
});

test('隐藏推荐后刷新页面仍隐藏；设置页入口仍存在', async () => {
  await initAppPromotion(document);
  document.querySelector('[data-dismiss-promotion]').click();
  await Promise.resolve();
  expect(saved.deepreadingPromotionDismissed).toBe(true);
  document.body.innerHTML = panelHTML;
  await initAppPromotion(document);
  expect(document.querySelector('[data-app-promotion]').hidden).toBe(true);
  document.body.innerHTML = fs.readFileSync(
    path.join(__dirname, '../src/popup/popup.html'),
    'utf8'
  );
  await initAppPromotion(document);
  expect(document.querySelector('[data-app-promotion]').hidden).toBe(false);
});

test('无法保存隐藏偏好时给出可重试状态', async () => {
  await initAppPromotion(document);
  chrome.storage.local.set.mockRejectedValue(new Error('storage failed'));
  const dismiss = document.querySelector('[data-dismiss-promotion]');
  dismiss.click();
  await Promise.resolve();
  expect(dismiss.disabled).toBe(false);
  expect(dismiss.textContent).toBe('重试隐藏');
});

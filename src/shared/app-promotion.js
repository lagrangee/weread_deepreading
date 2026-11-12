/** 初始化插件自有界面内的深读入口；仅使用本地图片和本机关闭偏好。 */
export async function initAppPromotion(root) {
  const promotion = root.querySelector('[data-app-promotion]');
  if (!promotion) {
    return;
  }
  const image = promotion.querySelector('[data-app-qr]');
  image.src = chrome.runtime.getURL('assets/promotion/deepreading-app-store.png');
  const dismiss = promotion.querySelector('[data-dismiss-promotion]');
  if (!dismiss) {
    return;
  }
  const key = 'deepreadingPromotionDismissed';
  dismiss.addEventListener('click', async () => {
    dismiss.disabled = true;
    try {
      await chrome.storage.local.set({ [key]: true });
      promotion.hidden = true;
    } catch {
      dismiss.disabled = false;
      dismiss.textContent = '重试隐藏';
    }
  });
  try {
    const saved = await chrome.storage.local.get(key);
    promotion.hidden = saved[key] === true;
  } catch {
    promotion.hidden = false;
  }
}

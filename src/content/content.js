/**
 * @file content.js
 * @description 微信读书助手内容脚本，处理页面交互和AI功能调用
 * @author lagrangee
 * @version 1.0.0
 */

/** @type {string} 当前阅读书籍名称 */
let bookName;
/** @type {string} 当前阅读书籍作者 */
let authorName;
/** @type {AIService} AI服务单例实例 */
let AIService;

/**
 * 初始化内容脚本
 * @async
 * @throws {Error} AI服务初始化失败时抛出错误
 */
async function initContentScript() {
  try {
    const pageTitle = document.title;
    const parts = pageTitle.split('-').map(part => part.trim());
    if (parts.length >= 3) {
      bookName = parts[0];
      authorName = parts.length === 3 ? parts[1] : parts[2];
      console.log(`${window.CONFIG.LOG_PREFIX} 初始化成功 - 书名: ${bookName}, 作者: ${authorName}`);
    } else {
      console.warn(`${window.CONFIG.LOG_PREFIX} 无法解析页面标题: ${pageTitle}`);
    }

    if (!isInCoverPage()) {
      FloatingMenu.create(bookName, authorName);
    }
    setupCoverPageListener();

    const { currentProvider = 'wenxin' } = await chrome.storage.sync.get('currentProvider');
    ({ AIService } = await import(chrome.runtime.getURL('src/ai/service.js')));
    window.AIService = AIService;
    AIService.getInstance(currentProvider);
    console.log(`${window.CONFIG.LOG_PREFIX} AI服务初始化成功: ${currentProvider}`);

    setupMessageListener();
  } catch (error) {
    console.error(`${window.CONFIG.LOG_PREFIX} 初始化失败:`, error);
    throw new Error(`初始化失败: ${error.message}`);
  }
}

/**
 * 设置消息监听器
 */
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_SETTINGS') {
      console.log(`${window.CONFIG.LOG_PREFIX} 更新AI设置:`, message.settings);
      AIService.getInstance().updateSettings(message.settings);
      sendResponse({ success: true });
    }
    return true;
  });
}

/**
 * 判断节点是否为有效的复制按钮
 * @param {Node} node - DOM节点
 * @returns {boolean} 是否为有效的复制按钮
 */
function isValidCopyButton(node) {
  return (
    node?.nodeType === Node.ELEMENT_NODE &&
    node.classList?.contains(window.CONFIG.COPY_BUTTON_CLASS) &&
    !node.hasListener
  );
}

/**
 * 处理复制按钮点击事件
 * @async
 * @throws {Error} 剪贴板访问失败时抛出错误
 */
async function handleCopyClick() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text?.trim()) {
      console.warn(`${window.CONFIG.LOG_PREFIX} 剪贴板内容为空`);
      return;
    }
    
    FloatingMenu.getInstance().show({ text });
  } catch (error) {
    console.error(`${window.CONFIG.LOG_PREFIX} 剪贴板访问错误:`, error);
    if (error.name === 'NotAllowedError') {
      throw new Error('需要剪贴板访问权限，请在浏览器设置中允许访问');
    }
    throw new Error(`剪贴板访问失败: ${error.message}`);
  }
}

/**
 * 在复制按钮上设置点击事件监听
 * @param {HTMLElement} button - 复制按钮节点
 */
function setupCopyButton(button) {
  if (!button) return;
  button.addEventListener('click', handleCopyClick);
  button.hasListener = true;
  console.log(`${window.CONFIG.LOG_PREFIX} 复制按钮监听已设置`);
}

/**
 * 监听动态生成的复制按钮
 */
function setupCopyButtonListener() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (!mutation.addedNodes.length) continue;

      for (const node of mutation.addedNodes) {
        if (isValidCopyButton(node)) {
          setupCopyButton(node);
          observer.disconnect();
          break;
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * 检查是否在封面页
 * @returns {boolean} 是否在封面页
 */
function isInCoverPage() {
  const coverPage = document.querySelector('.horizontalReaderCoverPage');
  return coverPage && window.getComputedStyle(coverPage).display !== 'none';
}

/**
 * 监听封面页状态变化
 */
function setupCoverPageListener() {
  const coverPage = document.querySelector('.horizontalReaderCoverPage');
  if (!coverPage) return;

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const displayValue = window.getComputedStyle(coverPage).display;
        const floatingMenu = FloatingMenu.getInstance();

        if (displayValue === 'none') {
          if (floatingMenu) {
            floatingMenu.setInitialPosition();
          } else {
            FloatingMenu.create(bookName, authorName);
          }
        } else {
          floatingMenu?.hide({ needSaveSettings: false });
        }
      }
    });
  });
  
  // 配置观察选项
  observer.observe(coverPage, {
    attributes: true,
    attributeFilter: ['style'], // 只观察style属性
  });
}

/**
 * 初始化函数
 */
function initialize() {
  initContentScript().catch(error => {
    console.error(`${window.CONFIG.LOG_PREFIX} 初始化错误:`, error);
  });
  setupCopyButtonListener();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  setTimeout(initialize, 500); //even 0 works, but directly call initialize() does not work on coverpagelistener!
}
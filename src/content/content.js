/**
 * @file content.js
 * @description 微信读书助手内容脚本，处理页面交互和AI功能调用
 * @author WeRead Assistant Team
 * @version 1.0.0
 */

/** @type {string} 当前阅读书籍名称 */
let bookName;
/** @type {string} 当前阅读书籍作者 */
let authorName;
// 单例 AIService 实例，无需局部变量
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
      console.log(`${window.CONFIG.LOG_PREFIX} 书名: ${bookName}, 作者: ${authorName}`);
    } else {
      console.warn(`${window.CONFIG.LOG_PREFIX} 标题格式不符合预期: ${pageTitle}`);
    }
    // 创建或获取浮动菜单实例
    if ( !isInCoverPage() ) {
      FloatingMenu.create(bookName, authorName);
    } else {
    }
    setupCoverPageListener();

    // 初始化 AI 服务
    const { currentProvider = 'wenxin' } = await chrome.storage.sync.get('currentProvider');
    
    // 导入 AIService 类
    ({ AIService } = await import(chrome.runtime.getURL('src/ai/service.js')));
    // 通过单例初始化或获取 AIService
    window.AIService = AIService;
    AIService.getInstance(currentProvider);
    console.log(`${window.CONFIG.LOG_PREFIX} AI 服务初始化成功`, currentProvider);

    // 监听设置更新消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'UPDATE_SETTINGS') {
        console.log(`${window.CONFIG.LOG_PREFIX} 收到 AI 设置更新:`, message.settings);
        AIService.getInstance().updateSettings(message.settings);
        sendResponse({ success: true });
      }
      return true; // 保持消息通道开启
    });
  } catch (error) {
    throw new Error(`初始化失败: ${error.message}`);
  }
}

/**
 * 判断节点是否为有效的复制按钮
 * @param {Node} node - DOM节点
 * @returns {boolean} 是否为有效的复制按钮
 */
function isValidCopyButton(node) {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
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
    if (!text) return; 
    
    FloatingMenu.getInstance().show({text:text});

  } catch (error) {
    console.error(`${window.CONFIG.LOG_PREFIX} 剪贴板访问错误:`, error);
    if (error.name === 'NotAllowedError') {
      throw new Error('请允许访问剪贴板权限');
    }
    throw new Error(`剪贴板访问失败: ${error.message}`);
  }
}

/**
 * 在复制按钮上设置点击事件监听
 * @param {HTMLElement} node - 复制按钮节点
 */
function setupCopyButton(node) {
  console.log(`${window.CONFIG.LOG_PREFIX} 复制按钮监听成功`);
  node.addEventListener('click', handleCopyClick);
  node.hasListener = true;
}

/**
 * 监听动态生成的复制按钮
 */
function setupCopyButtonListener() {

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (!mutation.addedNodes.length) return;

      mutation.addedNodes.forEach((node) => {
        if (isValidCopyButton(node)) {
          setupCopyButton(node);
          observer.disconnect();
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function isInCoverPage() {
  const coverPage = document.querySelector('.horizontalReaderCoverPage');
  return coverPage && window.getComputedStyle(coverPage).display !== 'none';
}

/**
 * 监听封面页状态
 */
function setupCoverPageListener() {
  const coverPage = document.querySelector('.horizontalReaderCoverPage');
  if (!coverPage) return;

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const displayValue = window.getComputedStyle(coverPage).display;
        if (displayValue === 'none') {  // 翻到正文页
          if ( FloatingMenu.getInstance() )
            FloatingMenu.getInstance().setInitialPosition()
          else
            FloatingMenu.create(bookName, authorName);
        } else {  // 翻到封面页
          FloatingMenu.getInstance().hide({needSaveSettings:false});
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

function initialize() {
  initContentScript().catch(error => {
    console.error(`${window.CONFIG.LOG_PREFIX} 初始化错误:`, error);
  });

  // 初始化按钮监听
  setupCopyButtonListener();
}

/**
 * 初始化内容脚本
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  setTimeout(initialize, 100); //even 0 works, but directly call initialize() does not work on coverpagelistener!
}
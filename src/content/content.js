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
    const parts = pageTitle.split(' - ');
    if (parts.length >= 3) {
      bookName = parts[0];
      authorName = parts[2];
      console.log(`${window.CONFIG.LOG_PREFIX} 书名: ${bookName}`);
      console.log(`${window.CONFIG.LOG_PREFIX} 作者名: ${authorName}`);
    } else {
      console.warn(`${window.CONFIG.LOG_PREFIX} 标题格式不符合预期: ${pageTitle}`);
    }

    // 初始化 AI 服务
    const { currentProvider = 'wenxin' } = await chrome.storage.sync.get('currentProvider');
    
    // 导入 AIService 类
    ({ AIService } = await import(chrome.runtime.getURL('src/ai/service.js')));
    // 通过单例初始化或获取 AIService
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

// 在脚本加载时立即执行初始化
initContentScript().catch(error => {
  console.error(`${window.CONFIG.LOG_PREFIX} 初始化错误:`, error);
});

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
    if (!text) {
      console.warn(`${window.CONFIG.LOG_PREFIX} 剪贴板内容为空`);
      return;
    }
    
    FloatingMenu.show(text);
    chrome.runtime.sendMessage(
      { type: 'CLIPBOARD_CHANGE', content: text },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log(`${window.CONFIG.LOG_PREFIX} 后台已接收，popup未打开`);
        }
      }
    );
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

// 初始化按钮监听
setupCopyButtonListener();

/**
 * 浮动菜单单例管理器
 * @namespace
 */
const FloatingMenu = (() => {
  /** @type {HTMLElement} 菜单实例 */
  let instance = null;
  /** @type {string} 当前选中的文本 */
  let currentText = '';

  /**
   * 创建浮动菜单
   * @async
   * @returns {Promise<HTMLElement>} 菜单DOM元素
   * @throws {Error} 菜单创建失败时抛出错误
   */
  async function createMenu() {
    try {
      const menuUrl = chrome.runtime.getURL('src/content/floating-menu.html');
      const response = await fetch(menuUrl);
      const html = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const menu = doc.body.firstElementChild;

      // 事件绑定
      menu.querySelector('.menu-close').addEventListener('click', () => {
        FloatingMenu.hide();
      });

      if (!AIService) {
        try {
          AIService.getInstance();
        } catch {
          throw new Error('AI 服务未初始化');
        }
      }
      
      // 绑定AI功能按钮事件
      bindAIButtons(menu);

      document.body.appendChild(menu);
      return menu;
    } catch (error) {
      console.error(`${window.CONFIG.LOG_PREFIX} 加载菜单模板失败:`, error);
      throw new Error(`加载菜单失败: ${error.message}`);
    }
  }

  /**
   * 绑定AI功能按钮事件
   * @param {HTMLElement} menu - 菜单DOM元素
   */
  function bindAIButtons(menu) {
    const buttons = [
      { selector: '.explain', method: 'explain', loadingText: '正在解释...' },
      { selector: '.digest', method: 'digest', loadingText: '正在消化...' },
      { selector: '.multi-view', method: 'analyze', loadingText: '正在分析...' }
    ];

    buttons.forEach(({ selector, method, loadingText }) => {
      const button = menu.querySelector(`.menu-button${selector}`);
      button.addEventListener('click', async () => {
        const originalText = button.textContent;
        const service = AIService.getInstance();
        try {
          button.textContent = loadingText;
          button.disabled = true;
          const result = await service[method](currentText, authorName, bookName);
          FloatingMenu.showResult(result);
        } catch (error) {
          FloatingMenu.showError(error.message);
        } finally {
          button.textContent = originalText;
          button.disabled = false;
        }
      });
    });
  }

  /**
   * 显示/更新浮动菜单
   * @async
   * @param {string} text - 要显示的文本内容
   * @throws {Error} 菜单创建或更新失败时抛出错误
   */
  async function show(text) {
    try {
      if (!instance) {
        instance = await createMenu();
        if (!instance) {
          throw new Error('菜单创建失败');
        }
      }
      
      currentText = text;
      
      // 更新内容
      const previewElement = instance.querySelector('.text-preview');
      const bookTitleElement = instance.querySelector('.book-title');
      const bookAuthorElement = instance.querySelector('.book-author');
      const resultElement = instance.querySelector('.ai-result');
      
      if (resultElement) {
        resultElement.remove(); // 清除之前的结果
      }
      
      if (previewElement) {
        previewElement.textContent = text.length > 100 ? text.slice(0, 100) + '...' : text;
      }
      
      if (bookTitleElement) {
        bookTitleElement.textContent = bookName || '未知书籍';
      }
      
      if (bookAuthorElement) {
        bookAuthorElement.textContent = authorName || '未知作者';
      }
      
      // 显示菜单
      instance.style.display = 'block';

    } catch (error) {
      console.error(`${window.CONFIG.LOG_PREFIX} 显示菜单失败:`, error);
      throw new Error(`显示菜单失败: ${error.message}`);
    }
  }

  /**
   * 显示AI处理结果
   * @param {string} result - AI处理的结果文本
   */
  function showResult(result) {
    try {
      if (!instance) return;

      // 移除旧的结果
      const oldResult = instance.querySelector('.ai-result');
      if (oldResult) {
        oldResult.remove();
      }

      // 创建新的结果显示区域
      const resultElement = document.createElement('div');
      resultElement.className = 'ai-result';
      resultElement.innerHTML = `
        <div class="result-content">${result}</div>
        <button class="copy-result">复制结果</button>
      `;

      // 绑定复制结果按钮事件
      resultElement.querySelector('.copy-result').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(result);
          showMessage('复制成功');
        } catch (error) {
          console.error(`${window.CONFIG.LOG_PREFIX} 复制结果失败:`, error);
          showMessage('复制失败，请重试');
        }
      });

      instance.appendChild(resultElement);
    } catch (error) {
      console.error(`${window.CONFIG.LOG_PREFIX} 显示结果失败:`, error);
      showError('显示结果失败，请重试');
    }
  }

  /**
   * 显示错误信息
   * @param {string} message - 错误信息
   */
  function showError(message) {
    try {
      if (!instance) return;

      const errorElement = document.createElement('div');
      errorElement.className = 'ai-result error';
      errorElement.textContent = message;
      
      // 移除旧的结果
      const oldResult = instance.querySelector('.ai-result');
      if (oldResult) {
        oldResult.remove();
      }

      instance.appendChild(errorElement);
      
      // 3秒后自动移除错误提示
      setTimeout(() => {
        if (errorElement.parentNode === instance) {
          errorElement.remove();
        }
      }, 3000);
    } catch (error) {
      console.error(`${window.CONFIG.LOG_PREFIX} 显示错误信息失败:`, error);
    }
  }

  /**
   * 显示临时消息
   * @param {string} message - 消息内容
   * @param {number} [duration=2000] - 显示时长(毫秒)
   */
  function showMessage(message, duration = 2000) {
    try {
      if (!instance) return;

      const messageElement = document.createElement('div');
      messageElement.className = 'floating-message';
      messageElement.textContent = message;
      
      instance.appendChild(messageElement);
      
      setTimeout(() => {
        if (messageElement.parentNode === instance) {
          messageElement.remove();
        }
      }, duration);
    } catch (error) {
      console.error(`${window.CONFIG.LOG_PREFIX} 显示消息失败:`, error);
    }
  }

  /**
   * 隐藏浮动菜单
   */
  function hide() {
    if (instance) {
      instance.style.display = 'none';
      
      // 清除结果内容
      const resultElement = instance.querySelector('.ai-result');
      if (resultElement) {
        resultElement.remove();
      }
    }
  }

  return {
    show,
    showResult,
    showError,
    showMessage,
    hide
  };
})(); 
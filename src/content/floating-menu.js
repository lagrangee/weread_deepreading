/**
 * 浮动菜单的交互逻辑
 */

class FloatingMenu {
  /** @type {FloatingMenu} 单例实例 */
  static instance = null;
  
  /** @type {string} 当前选中的文本 */
  #currentText = '';
  /** @type {string} 当前书名 */
  #bookName = '';
  /** @type {string} 当前作者 */
  #authorName = '';
  /** @type {boolean} 是否正在拖拽 */
  #isDragging = false;
  /** @type {boolean} 是否正在调整大小 */
  #isResizing = false;
  /** @type {boolean} 是否为内嵌模式 */
  #isInlineMode = null;
  /** @type {string|null} 调整方向 */
  #resizeDirection = null;
  /** @type {number} 拖拽起始X坐标 */
  #startX = 0;
  /** @type {number} 拖拽起始Y坐标 */
  #startY = 0;
  /** @type {number} 元素起始X坐标 */
  #elementX = 0;
  /** @type {number} 元素起始Y坐标 */
  #elementY = 0;
  /** @type {number} 元素起始宽度 */
  #elementWidth = 0;
  /** @type {number} 元素起始高度 */
  #elementHeight = 0;
  /** @type {number} 防抖计时器ID */
  #resizeTimeout = null;
  /** @type {number} 消息防抖计时器ID */
  #messageTimeout = null;
  /**
   * 获取单例实例
   * @returns {FloatingMenu}
   */
  static getInstance() {
    return FloatingMenu.instance;
  }

  /**
   * 创建浮动菜单
   * @param {string} bookName - 书名
   * @param {string} authorName - 作者名
   * @returns {Promise<FloatingMenu>}
   */
  static async create(bookName, authorName) {
    if (!FloatingMenu.instance) {
      const menuUrl = chrome.runtime.getURL('src/content/floating-menu.html');
      const response = await fetch(menuUrl);
      const html = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const menu = doc.body.firstElementChild;
      
      document.body.appendChild(menu);
      FloatingMenu.instance = new FloatingMenu(menu, bookName, authorName);
    }
    return FloatingMenu.instance;
  }

  /**
   * 构造函数
   * @param {HTMLElement} element - 菜单元素
   * @param {string} bookName - 书名
   * @param {string} authorName - 作者名
   */
  constructor(element, bookName, authorName) {
    this.element = element;
    this.#bookName = bookName;
    this.#authorName = authorName;

    // 初始化各项功能
    this.initDrag();
    this.initShortcuts();
    this.initMarkdown();
    this.initChat();
    this.initResizeHandler();
    this.bindEvents();

    // 设置初始位置
    this.setInitialPosition();
  }

  /**
   * 设置初始位置
   */
  setInitialPosition() {

    if( this.loadLastMode() === 'inline') {
      this.switchToInline();
    } else {
      this.switchToFloating();
    }
  }

  /**
   * 初始化拖拽功能
   */
  initDrag() {
    const header = this.element.querySelector('.menu-header');
    
    header.addEventListener('mousedown', this.handleDragStart);
  }

  /**
   * 处理拖拽开始
   * @param {MouseEvent} e 
   */
  handleDragStart = (e) => {
    // 如果点击的是关闭按钮，不触发拖拽
    if (e.target.closest('.menu-close')) return;

    document.addEventListener('mousemove', this.handleDragMove);
    document.addEventListener('mouseup', this.handleDragEnd);

    this.#isDragging = true;
    const rect = this.element.getBoundingClientRect();
    
    this.#startX = e.clientX;
    this.#startY = e.clientY;
    this.#elementX = rect.left;
    this.#elementY = rect.top;
    
    // 添加拖拽时的样式
    // this.element.style.transition = 'none';
    this.element.style.cursor = 'grabbing';
  }

  /**
   * 处理拖拽移动
   * @param {MouseEvent} e 
   */
  handleDragMove = (e) => {
    if (!this.#isDragging) return;
    
    const deltaX = e.clientX - this.#startX;
    const deltaY = e.clientY - this.#startY;
    
    // 计算新位置
    let newX = this.#elementX + deltaX;
    let newY = this.#elementY + deltaY;
    
    // 获取视口和元素尺寸
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const rect = this.element.getBoundingClientRect();
    
    // 边界检查
    newX = Math.min(Math.max(newX, 0), vw - rect.width);
    newY = Math.min(Math.max(newY, 0), vh - rect.height);
    
    // 使用 transform 进行移动以提高性能
    this.element.style.left = `${newX}px`;
    this.element.style.top = `${newY}px`;
  }

  /**
   * 处理拖拽结束
   */
  handleDragEnd = () => {
    if (!this.#isDragging) return;
    
    this.#isDragging = false;
    this.element.style.cursor = '';
    // this.element.style.transition = 'all 0.2s';

    document.removeEventListener('mousemove', this.handleDragMove);
    document.removeEventListener('mouseup', this.handleDragEnd);

    this.saveSettings();
  }

  /**
   * 初始化窗口大小调整功能
   */
  initResizeHandler() {
    // 创建四个调整手柄：左、右、左下、右下
    const resizeHandleSE = document.createElement('div');
    resizeHandleSE.className = 'resize-handle se';
    this.element.appendChild(resizeHandleSE);

    const resizeHandleSW = document.createElement('div');
    resizeHandleSW.className = 'resize-handle sw';
    this.element.appendChild(resizeHandleSW);

    const resizeHandleE = document.createElement('div');
    resizeHandleE.className = 'resize-handle e';
    this.element.appendChild(resizeHandleE);

    const resizeHandleW = document.createElement('div');
    resizeHandleW.className = 'resize-handle w';
    this.element.appendChild(resizeHandleW);

    // 绑定调整大小事件
    [resizeHandleSE, resizeHandleSW, resizeHandleE, resizeHandleW].forEach(handle => {
      handle.addEventListener('mousedown', this.handleResizeStart);
    });

    // 监听窗口大小变化，确保菜单始终在视口内
    window.addEventListener('resize', () => {
      if (this.#resizeTimeout) {
        clearTimeout(this.#resizeTimeout);
      }
      
      this.#resizeTimeout = setTimeout(() => {
        const rect = this.element.getBoundingClientRect();
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        
        // 确保调整后的位置在视口内
        const x = Math.min(rect.left, vw - rect.width);
        const y = Math.min(rect.top, vh - rect.height);
        
        this.element.style.left = `${Math.max(0, x)}px`;
        this.element.style.top = `${Math.max(0, y)}px`;
      }, 100);
    });
  }

  /**
   * 处理开始调整大小
   * @param {MouseEvent} e 
   */
  handleResizeStart = (e) => {
    e.stopPropagation();
    // 添加移动和结束事件监听
    document.addEventListener('mousemove', this.handleResizeMove);
    document.addEventListener('mouseup', this.handleResizeEnd);

    this.#isResizing = true;
    this.#resizeDirection = e.target.classList.contains('se') ? 'se' :
                          e.target.classList.contains('sw') ? 'sw' :
                          e.target.classList.contains('e') ? 'e' : 'w';
    
    // 记录初始状态
    this.#startX = e.clientX;
    this.#startY = e.clientY;
    this.#elementWidth = this.element.offsetWidth;
    this.#elementHeight = this.element.offsetHeight;
    this.#elementX = this.element.offsetLeft;
  }

  /**
   * 处理调整大小移动
   * @param {MouseEvent} e 
   */
  handleResizeMove = (e) => {
    if (!this.#isResizing) return;

    const dx = e.clientX - this.#startX;
    const dy = e.clientY - this.#startY;

    // 获取视口尺寸
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    switch (this.#resizeDirection) {
      case 'se':
        // 右下角调整：直接改变宽度和高度
        const seWidth = Math.min(this.#elementWidth + dx, vw - this.#elementX);
        const seHeight = Math.min(this.#elementHeight + dy, vh - this.element.offsetTop);
        
        this.element.style.width = `${seWidth}px`;
        this.element.style.height = `${seHeight}px`;
        break;

      case 'sw':
        // 左下角调整：直接改变宽度和高度
        const swWidth = Math.min(this.#elementWidth - dx, this.#elementX + this.#elementWidth);
        const swHeight = Math.min(this.#elementHeight + dy, vh - this.element.offsetTop);
        
        this.element.style.left = `${this.#elementX - swWidth + this.#elementWidth}px`;
        this.element.style.width = `${swWidth}px`;
        this.element.style.height = `${swHeight}px`;
        break;

      case 'e':
        // 右边调整：只改变宽度
        const eWidth = Math.min(this.#elementWidth + dx, vw - this.#elementX);
        this.element.style.width = `${eWidth}px`;
        break;

      case 'w':
        // 左边调整：改变宽度和位置
        const wWidth = Math.min(this.#elementWidth - dx, this.#elementX + this.#elementWidth);
        this.element.style.left = `${this.#elementX - wWidth + this.#elementWidth}px`;
        this.element.style.width = `${wWidth}px`;
        break;
    }
  }

  /**
   * 处理结束调整大小
   */
  handleResizeEnd = () => {
    if (!this.#isResizing) return;
    this.#isResizing = false;

    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.handleResizeEnd);

    this.resizeBodyWidth();
    this.saveSettings();
  }

  initShortcuts() {
    document.addEventListener('keydown', (e) => {
      // 如果是在输入框中，不触发快捷键
      if (e.target.matches('input, textarea')) return;

      switch(e.key.toLowerCase()) {
        case 'e':
          this.element.querySelector('.menu-button.explain').click();
          break;
        case 'd':
          this.element.querySelector('.menu-button.digest').click();
          break;
        case 'm':
          this.element.querySelector('.menu-button.analyze').click();
          break;
        case 't':
          this.element.querySelector('.menu-button.toggle-mode').click();
          break;
        case 'escape':
          this.hide();
          break;
      }
    });
  }

  /**
   * 初始化 Markdown 渲染
   */
  initMarkdown() {
    marked.setOptions({
      renderer: new marked.Renderer(),
      highlight: function(code, lang) {
        return code;
      },
      pedantic: false,
      gfm: true,
      breaks: true,
      sanitize: false,
      smartLists: true,
      smartypants: false,
      xhtml: false
    });
  }

  /**
   * 初始化聊天功能
   */
  initChat() {
    const input = this.element.querySelector('.chat-input');
    const sendButton = this.element.querySelector('.menu-button.send');

    const sendMessage = async () => {
      const text = input.value.trim();
      if (!text) return;

      // 清空输入框并调整高度
      input.value = '';
      input.style.height = 'auto';

      const context = [];
      this.element.querySelectorAll('.chat-container .message').forEach(element => {
        if (element.classList.contains('user')) {
          context.push(`我问：${element.innerHTML}`);
        }
        if(element.classList.contains('ai')) {
          context.push(`你的回答：${element.innerHTML}`);
        }
      });

      // 显示用户消息
      this.appendMessage(text, 'user');

      try {
        const result = await AIService.getInstance().chat(text, this.#authorName, this.#bookName, context.join('\n').slice(-CONFIG.MAX_CONTEXT_LENGTH));
        this.appendMessage(result, 'ai');
      } catch (error) {
        console.error('发送消息失败:', error);
        this.showError('发送消息失败，请重试');
      }
    };

    // 绑定发送事件
    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // 自动调整输入框高度
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    });
  }

  /**
   * 添加消息到聊天容器
   * @param {string} content - 消息内容
   * @param {'user' | 'ai'} type - 消息类型
   */
  appendMessage(content, type) {
    const container = this.element.querySelector('.chat-container');
    const message = document.createElement('div');
    message.className = `message ${type}`;
    
    // 使用 Markdown 渲染 AI 消息
    message.innerHTML = type === 'ai' ? marked.parse(content) : content; 
    
    container.appendChild(message);
    container.scrollTop = container.scrollHeight;
  }

  /**
   * 绑定事件处理器
   */
  bindEvents() {
    // 关闭按钮
    const closeButton = this.element.querySelector('.menu-close');
    closeButton.addEventListener('click', () => this.hide());

    // 切换模式按钮
    const toggleButton = this.element.querySelector('.menu-button.toggle-mode');
    toggleButton.addEventListener('click', () => {
      if (this.#isInlineMode) {
        this.switchToFloating();
      } else {
        this.switchToInline();
      }
    });

    // 功能按钮
    const explainButton = this.element.querySelector('.menu-button.explain');
    const digestButton = this.element.querySelector('.menu-button.digest');
    const analyzeButton = this.element.querySelector('.menu-button.analyze');

    explainButton.addEventListener('click', async () => {
      try {
        const result = await AIService.getInstance().explain(
          this.#currentText,
          this.#authorName,
          this.#bookName
        );
        this.showResult({ content: result });
      } catch (error) {
        console.error('解释失败:', error);
        this.showError('解释失败，请重试');
      }
    });

    digestButton.addEventListener('click', async () => {
      try {
        const result = await AIService.getInstance().digest(
          this.#currentText,
          this.#authorName,
          this.#bookName
        );
        this.showResult({ content: result });
      } catch (error) {
        console.error('消化失败:', error);
        this.showError('消化失败，请重试');
      }
    });

    analyzeButton.addEventListener('click', async () => {
      try {
        const result = await AIService.getInstance().analyze(
          this.#currentText,
          this.#authorName,
          this.#bookName
        );
        this.showResult({ content: result });
      } catch (error) {
        console.error('兼听失败:', error);
        this.showError('兼听失败，请重试');
      }
    });
  }

  /**
   * 显示菜单
   * @param {string} text - 选中的文本
   */
  show(text) {
    this.#currentText = text;
    
    // 更新预览文本
    const preview = this.element.querySelector('.text-preview');
    preview.textContent = text;
    
    // 更新书籍信息
    const bookTitle = this.element.querySelector('.book-title');
    const bookAuthor = this.element.querySelector('.book-author');
    bookTitle.textContent = this.#bookName;
    bookAuthor.textContent = this.#authorName;
    
    // 显示菜单
    this.element.style.display = 'flex';
    
    // 聚焦输入框
    const input = this.element.querySelector('.chat-input');
    input.focus();
  }

  /**
   * 显示结果
   * @param {Object} result - 处理结果
   */
  showResult(result) {
    if (!result || !result.content) {
      this.showError('处理失败，请重试');
      return;
    }
    this.appendMessage(result.content, 'ai');
  }

  /**
   * 显示错误消息
   * @param {string} message - 错误消息
   */
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // 2秒后自动移除
    setTimeout(() => {
      errorDiv.remove();
    }, 2000);
  }

  /**
   * 显示临时消息
   * @param {string} message - 消息内容
   * @param {number} duration - 显示时长（毫秒）
   */
  showMessage(message, duration = 2000) {
    if (this.#messageTimeout) {
      clearTimeout(this.#messageTimeout);
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'floating-message';
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    this.#messageTimeout = setTimeout(() => {
      messageDiv.remove();
    }, duration);
  }

  /**
   * 隐藏菜单
   */
  hide() {
    this.element.style.display = 'none';
    this.#currentText = '';
  }

  /**
   * 切换到悬浮模式
   */
  switchToFloating() {
    if (this.#isInlineMode === false) return;

    this.#isInlineMode = false;
    
    this.element.classList.remove('inline');
    this.element.classList.add('floating');

    this.resetBodyWidth();
    this.loadSettings('floating');
    
    // 更新按钮文本
    const toggleButton = this.element.querySelector('.menu-button.toggle-mode');
    const toggleText = toggleButton.querySelector('.toggle-text');
    toggleText.textContent = '内嵌模式(T)';

    this.saveSettings();
  }

  /**
   * 切换到内嵌模式
   */
  switchToInline() {
      if (this.#isInlineMode) return;

      this.#isInlineMode = true;
      
      this.element.classList.remove('floating');
      this.element.classList.add('inline');

      this.loadSettings('inline');
      this.resizeBodyWidth();
      
      // 更新按钮文本
      const toggleButton = this.element.querySelector('.menu-button.toggle-mode');
      const toggleText = toggleButton.querySelector('.toggle-text');
      toggleText.textContent = '悬浮模式(T)';

      this.saveSettings();
  }

  /**
   * resize body width in inline mode
   */
  resizeBodyWidth() {
    if(this.#isInlineMode) {
      document.body.style.width = window.innerWidth - this.element.offsetWidth + 'px';
      window.dispatchEvent(new Event('resize'));
    }
  }

  /**
   * reset body width in floating mode
   */
  resetBodyWidth() {
    if(!this.#isInlineMode) {
      document.body.style.width = '100vw';
      window.dispatchEvent(new Event('resize'));
    }
  }

  /**
   * 将当前设置信息保存到本地存储
   * isInlineMode: 是否为内嵌模式
   * inlineMenuWidth: 内嵌模式菜单宽度
   * inlineMenuHeight: 内嵌模式菜单高度
   * inlineMenuTop: 内嵌模式菜单顶部位置
   * floatingMenuWidth: 悬浮模式菜单宽度
   * floatingMenuHeight: 悬浮模式菜单高度
   * floatingMenuTop: 悬浮模式菜单顶部位置
   * floatingMenuLeft: 悬浮模式菜单左侧位置
   */
  saveSettings() {
    let settings = JSON.parse(localStorage.getItem('floatingMenuSettings'));
    if (!settings) {
      settings = {
        isInlineMode: false,
        inlineMenuWidth: 0,
        inlineMenuHeight: 0,
        inlineMenuTop: 0,
        floatingMenuWidth: 0,
        floatingMenuHeight: 0,
        floatingMenuTop: 0, 
        floatingMenuLeft: 0,
      };
    }
    settings.isInlineMode = this.#isInlineMode;
    if (this.#isInlineMode) {
      settings.inlineMenuWidth = this.element.offsetWidth;
      settings.inlineMenuHeight = this.element.offsetHeight;
      settings.inlineMenuTop = this.element.offsetTop;
    } else {
      settings.floatingMenuWidth = this.element.offsetWidth;
      settings.floatingMenuHeight = this.element.offsetHeight;
      settings.floatingMenuTop = this.element.offsetTop;
      settings.floatingMenuLeft = this.element.offsetLeft;
    }
    localStorage.setItem('floatingMenuSettings', JSON.stringify(settings));
  }


  /**
   * 从本地存储中获取上一次的模式
   * @returns {'inline' | 'floating'}
   */
  loadLastMode() {
    const settings = JSON.parse(localStorage.getItem('floatingMenuSettings'));
    if(!settings) {
      return 'floating';
    }
    return settings.isInlineMode ? 'inline' : 'floating';
  }
  /**
   * 从本地存储中获取设置信息
   */
  loadSettings(mode='floating') {
    const settings = JSON.parse(localStorage.getItem('floatingMenuSettings'));
    if(!settings) { // 如果本地存储中没有设置信息，则默认设置为悬浮模式
      return;
    };

    if (mode === 'inline') {
      this.element.style.width = settings.inlineMenuWidth + 'px';
      this.element.style.height = settings.inlineMenuHeight + 'px';
      this.element.style.top = settings.inlineMenuTop + 'px';
      this.element.style.left = 'auto';
    } else {
      this.element.style.width = settings.floatingMenuWidth + 'px';
      this.element.style.height = settings.floatingMenuHeight + 'px';
      this.element.style.top = settings.floatingMenuTop + 'px';
      this.element.style.left = settings.floatingMenuLeft + 'px';
    }
  }
}
// 导出
window.FloatingMenu = FloatingMenu; 
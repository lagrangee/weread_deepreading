/**
 * 浮动菜单的交互逻辑
 */

class FloatingMenu {
  /** @type {FloatingMenu} 单例实例 */
  static instance = null;
  
  /** @type {Object} 服务商配置 */
  static providers = {
    wenxin: '文心一言',
    qianwen: '通义千问',
    doubao: '豆包',
    deepseek: 'DeepSeek'
  };

  /** @type {string[]} 服务商列表 */
  static providerList = Object.keys(FloatingMenu.providers);
  
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
  /** @type {boolean} 是否显示 */
  #isShowing = false;
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
  /** @type {number} 移动阈值 */
  #moveThreshold = 5;
  /** @type {boolean} 是否超过移动阈值 */
  #hasMoved = false;

  /**
   * 获取单例实例
   * @returns {FloatingMenu}
   */
  static getInstance() { // ugly, need to be refactored
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
    if (FloatingMenu.instance) {
      return FloatingMenu.instance;
    }
    FloatingMenu.instance = this;

    this.wrapperElement = element;
    this.contentElement = element.children[0];
    this.helpElement = element.children[1];
    this.pinElement = element.children[2];
    this.#bookName = bookName;
    this.#authorName = authorName;

    // 初始化各项功能
    this.initLocalSettings(); // 初始化本地参数
    this.initDrag(); // 初始化拖拽功能
    this.initPinDrag(); // 初始化 pin 拖拽功能
    this.initShortcuts(); // 初始化快捷键
    this.initMarkdown(); // 初始化 Markdown 渲染
    this.initChat(); // 初始化聊天功能
    this.initResizeHandler(); // 初始化窗口大小调整功能
    this.bindEvents(); // 绑定事件处理器
    this.interceptEvents(); // 拦截必要事件, 实现正常的文字选中和复制
    this.setInitialPosition(); // 设置初始位置
    
    // 初始化帮助弹窗
    this._initHelpModal();
  }

  /**
   * 初始化 pin 拖拽功能
   */
  initPinDrag() {
    this.pinElement.addEventListener('mousedown', this.handlePinDragStart);
  }

  /**
   * 处理 pin 拖拽开始
   * @param {MouseEvent} e 
   */
  handlePinDragStart = (e) => {

    document.addEventListener('mousemove', this.handlePinDragMove);
    document.addEventListener('mouseup', this.handlePinDragEnd);

    this.#isDragging = true;
    this.#hasMoved = false;
    const rect = this.pinElement.getBoundingClientRect();
    
    this.#startX = e.clientX;
    this.#startY = e.clientY;
    this.#elementX = rect.left;
    this.#elementY = rect.top;
    
    this.pinElement.classList.add('dragging');
  }

  /**
   * 处理 pin 拖拽移动
   * @param {MouseEvent} e 
   */
  handlePinDragMove = (e) => {
    if (!this.#isDragging) return;
    
    const deltaX = e.clientX - this.#startX;
    const deltaY = e.clientY - this.#startY;
    
    // 检查是否超过移动阈值
    if (!this.#hasMoved && (Math.abs(deltaX) > this.#moveThreshold || Math.abs(deltaY) > this.#moveThreshold)) {
      this.#hasMoved = true;
    }
    
    // 如果没有超过移动阈值，不进行移动
    if (!this.#hasMoved) return;
    
    // 计算新位置
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const rect = this.pinElement.getBoundingClientRect();
    
    // 计算相对于右边和底部的距离
    const right = vw - (this.#elementX + deltaX + rect.width);
    const bottom = vh - (this.#elementY + deltaY + rect.height);
    
    // 边界检查
    const minRight = 0;
    const minBottom = 0;
    const maxRight = vw - rect.width;
    const maxBottom = vh - rect.height;
    
    this.pinElement.style.right = `${Math.min(Math.max(right, minRight), maxRight)}px`;
    this.pinElement.style.bottom = `${Math.min(Math.max(bottom, minBottom), maxBottom)}px`;
    this.pinElement.style.left = 'auto';
    this.pinElement.style.top = 'auto';
  }

  /**
   * 处理 pin 拖拽结束
   */
  handlePinDragEnd = (e) => {
    if (!this.#isDragging) return;

    // 如果超过了移动阈值，说明是拖拽操作
    if (this.#hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      // 保存 pin 位置
      this.savePinPosition();
    } else {
      // 如果没有超过移动阈值，触发点击事件
      this.show({});
    }
    
    this.#isDragging = false;
    this.#hasMoved = false;
    this.pinElement.classList.remove('dragging');

    document.removeEventListener('mousemove', this.handlePinDragMove);
    document.removeEventListener('mouseup', this.handlePinDragEnd);
  }

  /**
   * 保存 pin 位置到本地存储
   */
  savePinPosition() {
    const rect = this.pinElement.getBoundingClientRect();
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    
    this._saveSettings({pinPosition:{
      right: vw - rect.right,
      bottom: vh - rect.bottom
    }});
  }

  /**
   * 从本地存储加载 pin 位置
   */
  loadPinPosition() {
    const settings = this._loadSettings();
    if (settings.pinPosition) {
      this.pinElement.style.right = `${settings.pinPosition.right}px`;
      this.pinElement.style.bottom = `${settings.pinPosition.bottom}px`;
      this.pinElement.style.left = 'auto';
      this.pinElement.style.top = 'auto';
    }
  }

  /**
   * 初始化本地参数
   */
  initLocalSettings() {
    const settings = this._loadSettings();
    
    // 应用暗色模式设置
    if (settings.isDarkMode) {
      this.contentElement.classList.add('dark-mode');
    }

    // 加载 pin 位置
    this.loadPinPosition();
    this.loadFontSettings();
  }

  /**
   * 设置初始位置
   */
  setInitialPosition() {
    const settings = this._loadSettings();
    let mode = settings.isInlineMode ? 'inline' : 'floating';
    if( settings.isLastTimeShowing ) {
      this.show({mode:mode});
    }
  }

  /**
   * 初始化拖拽功能
   */
  initDrag() {
    const bar = this.contentElement.querySelector('.bar');
    bar.addEventListener('mousedown', this.handleDragStart);
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
    const rect = this.contentElement.getBoundingClientRect();
    
    this.#startX = e.clientX;
    this.#startY = e.clientY;
    this.#elementX = rect.left;
    this.#elementY = rect.top;
    
    // 添加拖拽时的样式
    // this.contentElement.style.transition = 'none';
    this.contentElement.style.cursor = 'grabbing';
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
    const rect = this.contentElement.getBoundingClientRect();
    
    // 边界检查
    newX = Math.min(Math.max(newX, 0), vw - rect.width);
    newY = Math.min(Math.max(newY, 0), vh - rect.height);
    
    // 使用 transform 进行移动以提高性能
    this.contentElement.style.left = `${newX}px`;
    this.contentElement.style.top = `${newY}px`;
  }

  /**
   * 处理拖拽结束
   */
  handleDragEnd = () => {
    if (!this.#isDragging) return;
    
    this.#isDragging = false;
    this.contentElement.style.cursor = '';
    // this.contentElement.style.transition = 'all 0.2s';

    document.removeEventListener('mousemove', this.handleDragMove);
    document.removeEventListener('mouseup', this.handleDragEnd);

    this.savePositonSettings();
  }

  /**
   * 初始化窗口大小调整功能
   */
  initResizeHandler() {
    // 创建四个调整手柄：左、右、左下、右下
    const resizeHandleSE = document.createElement('div');
    resizeHandleSE.className = 'resize-handle se';
    this.contentElement.appendChild(resizeHandleSE);

    const resizeHandleSW = document.createElement('div');
    resizeHandleSW.className = 'resize-handle sw';
    this.contentElement.appendChild(resizeHandleSW);

    const resizeHandleE = document.createElement('div');
    resizeHandleE.className = 'resize-handle e';
    this.contentElement.appendChild(resizeHandleE);

    const resizeHandleW = document.createElement('div');
    resizeHandleW.className = 'resize-handle w';
    this.contentElement.appendChild(resizeHandleW);

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
        const rect = this.contentElement.getBoundingClientRect();
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        
        // 确保调整后的位置在视口内
        const x = Math.min(rect.left, vw - rect.width);
        const y = Math.min(rect.top, vh - rect.height);
        
        this.contentElement.style.left = `${Math.max(0, x)}px`;
        this.contentElement.style.top = `${Math.max(0, y)}px`;
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
    this.#elementWidth = this.contentElement.offsetWidth;
    this.#elementHeight = this.contentElement.offsetHeight;
    this.#elementX = this.contentElement.offsetLeft;
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
        const seHeight = Math.min(this.#elementHeight + dy, vh - this.contentElement.offsetTop);
        
        this.contentElement.style.width = `${seWidth}px`;
        this.contentElement.style.height = `${seHeight}px`;
        break;

      case 'sw':
        // 左下角调整：直接改变宽度和高度
        const swWidth = Math.min(this.#elementWidth - dx, this.#elementX + this.#elementWidth);
        const swHeight = Math.min(this.#elementHeight + dy, vh - this.contentElement.offsetTop);
        
        this.contentElement.style.left = `${this.#elementX - swWidth + this.#elementWidth}px`;
        this.contentElement.style.width = `${swWidth}px`;
        this.contentElement.style.height = `${swHeight}px`;
        break;

      case 'e':
        // 右边调整：只改变宽度
        const eWidth = Math.min(this.#elementWidth + dx, vw - this.#elementX);
        this.contentElement.style.width = `${eWidth}px`;
        break;

      case 'w':
        // 左边调整：改变宽度和位置
        const wWidth = Math.min(this.#elementWidth - dx, this.#elementX + this.#elementWidth);
        this.contentElement.style.left = `${this.#elementX - wWidth + this.#elementWidth}px`;
        this.contentElement.style.width = `${wWidth}px`;
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

    if (this.#isInlineMode) this.resizeBodyWidth();
    this.savePositonSettings();
  }

  /**
   * 初始化快捷键
   */
  initShortcuts() {
    document.addEventListener('keydown', (e) => {
      // 如果未显示，不触发快捷键
      if (!this.#isShowing) return;
      // 如果是在输入框中，不触发快捷键
      if (e.target.matches('input, textarea')) return;

      switch(e.key.toLowerCase()) {
        case 'a':
          if (e.key === 'a') {
            this.contentElement.querySelector('.menu-button.font-adjust.decrease').click();
          } else {
            this.contentElement.querySelector('.menu-button.font-adjust.increase').click();
          }
          break;
        case 'd':
          this.contentElement.querySelector('.menu-button.theme-toggle').click();
          break;
        case 'e':
          this.contentElement.querySelector('.menu-button.explain').click();
          break;
        case 'x':
          this.contentElement.querySelector('.menu-button.digest').click();
          break;
        case 'm':
          this.contentElement.querySelector('.menu-button.analyze').click();
          break;
        case 't':
          this.contentElement.querySelector('.menu-button.toggle-mode').click();
          break;
        case '?':
          this.contentElement.querySelector('.menu-button.help').click();
          break;
        case 'escape':
          const helpModal = this.helpElement;
          if (!helpModal.classList.contains('hide')) {
            helpModal.classList.add('hide');
          } else if (!this.#isInlineMode) {
            this.hide();
          }
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
    const input = this.contentElement.querySelector('.chat-input');
    const sendButton = this.contentElement.querySelector('.menu-button.send');

    const sendMessage = async () => {
      const text = input.value.trim();
      if (!text) return;

      // 清空输入框并调整高度
      input.value = '';
      input.style.height = 'auto';

      const context = [];
      this.contentElement.querySelectorAll('.chat-container .message').forEach(element => {
        if (element.classList.contains('user')) {
          context.push(`我问：${element.innerHTML}`);
        }
        if(element.classList.contains('ai')) {
          context.push(`你的回答：${element.innerHTML}`);
        }
      });

      // 显示用户消息
      this.appendMessage(text, 'user');
      this.showLoading();

      try {
        const result = await AIService.getInstance().chat(text, this.#authorName, this.#bookName, context.join('\n').slice(-CONFIG.MAX_CONTEXT_LENGTH));
        this.hideLoading();
        this.appendMessage(result, 'ai');
      } catch (error) {
        console.error('发送消息失败:', error);
        this.showError('发送消息失败', error);
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
    const container = this.contentElement.querySelector('.chat-container');
    const message = document.createElement('div');
    message.className = `message ${type}`;
    
    // 使用 Markdown 渲染 AI 消息
    message.innerHTML = type === 'ai' ? marked.parse(content) : content; 
    
    container.appendChild(message);
    container.scrollTop = container.scrollHeight;
  }


  /**
   * 拦截网站防御事件以正常实现文本选择和复制操作
   */
  interceptEvents() {
    /* 拦截选中文本 */
    this.wrapperElement.addEventListener('selectstart', (e) => {
        e.stopPropagation();
    });
    /* 拦截右键菜单 */
    this.wrapperElement.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
    });
    /* 拦截 ctrl+c */
    this.wrapperElement.addEventListener('keydown', (e) => {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'a')) {
        e.stopPropagation();
      }
    });
    // 处理复制事件
    document.addEventListener('copy', function(e) {
      const selection = window.getSelection();
      const selectedText = selection.toString();
      
      if (selectedText && e.target.closest('.floating-menu')) {
        e.preventDefault(); // 阻止默认复制行为
        e.clipboardData.setData('text/plain', selectedText); // 手动设置剪贴板内容
        e.stopPropagation(); // 阻止第三方代码修改
      }
    }, true);
  }

  /**
   * 绑定事件处理器
   */ 
  bindEvents() {
    // 关闭按钮
    const closeButton = this.contentElement.querySelector('.menu-close');
    closeButton.addEventListener('click', () => this.hide());

    // 切换模式按钮
    const toggleButton = this.contentElement.querySelector('.menu-button.toggle-mode');
    toggleButton.addEventListener('click', () => {
      if (this.#isInlineMode) {
        this.switchToFloating();
      } else {
        this.switchToInline();
      }
    });

    // 功能按钮
    const explainButton = this.contentElement.querySelector('.menu-button.explain');
    const digestButton = this.contentElement.querySelector('.menu-button.digest');
    const analyzeButton = this.contentElement.querySelector('.menu-button.analyze');

    explainButton.addEventListener('click', async () => {
      try {
        this.showLoading();
        explainButton.classList.add('loading');
        explainButton.disabled = true;
        const result = await AIService.getInstance().explain(
          this.#currentText,
          this.#authorName,
          this.#bookName
        );
        this.showResult({ content: result });
      } catch (error) {
        console.error('解释失败:', error);
        this.showError('解释失败', error);
      } finally {
        explainButton.classList.remove('loading');
        explainButton.disabled = false;
      }
    });

    digestButton.addEventListener('click', async () => {
      try {
        this.showLoading();
        digestButton.classList.add('loading');
        digestButton.disabled = true;
        const result = await AIService.getInstance().digest(
          this.#currentText,
          this.#authorName,
          this.#bookName
        );
        this.showResult({ content: result });
      } catch (error) {
        console.error('消化失败:', error);
        this.showError('消化失败', error);
      } finally {
        digestButton.classList.remove('loading');
        digestButton.disabled = false;
      }
    });

    analyzeButton.addEventListener('click', async () => {
      try {
        this.showLoading();
        analyzeButton.classList.add('loading');
        analyzeButton.disabled = true;
        const result = await AIService.getInstance().analyze(
          this.#currentText,
          this.#authorName,
          this.#bookName
        );
        this.showResult({ content: result });
      } catch (error) {
        console.error('兼听失败:', error);
        this.showError('兼听失败', error);
      } finally {
        analyzeButton.classList.remove('loading');
        analyzeButton.disabled = false;
      }
    });

    // 字体调节按钮
    const increaseButton = this.contentElement.querySelector('.menu-button.font-adjust.increase');
    const decreaseButton = this.contentElement.querySelector('.menu-button.font-adjust.decrease');
    
    increaseButton.addEventListener('click', () => {
      let fontSize = parseFloat(this.wrapperElement.style.fontSize);
      if (fontSize < 24) { // 最大字体限制
        fontSize += 1;
        this.wrapperElement.style.fontSize = fontSize + 'px';
        this.saveFontSettings(fontSize);
      }
    });

    decreaseButton.addEventListener('click', () => {
      let fontSize = parseFloat(this.wrapperElement.style.fontSize);
      if (fontSize > 12) { // 最小字体限制
        fontSize -= 1;
        this.wrapperElement.style.fontSize = fontSize + 'px';
        this.saveFontSettings(fontSize);
      }
    });

    // 暗色模式切换
    const themeToggle = this.contentElement.querySelector('.menu-button.theme-toggle');
    themeToggle.addEventListener('click', () => {
      this.wrapperElement.classList.toggle('dark-mode');
      this._saveSettings({isDarkMode:this.wrapperElement.classList.contains('dark-mode')});
    });

    // 帮助按钮
    this.helpButton = this.contentElement.querySelector('.menu-button.help');
    this.helpModal = this.helpElement;
    this.helpCloseButton = this.helpModal.querySelector('.help-close');

    this._initModelConfig();

    const showHelp = () => {
      this.helpModal.classList.remove('hide');
      this._loadModelConfig();
    };

    const hideHelp = () => {
      this.helpModal.classList.add('hide');
    };

    this.helpButton.addEventListener('click', showHelp);
    this.helpCloseButton.addEventListener('click', hideHelp);
    this.helpModal.addEventListener('click', (e) => {
      if (e.target === this.helpModal) {
        hideHelp();
      }
    });
  }

  /**
   * 显示菜单
   * @param {Object} options - 选项
   * @param {string} options.text - 选中的文本
   * @param {string} options.mode - 模式
   */
  show(options) {
    if(options && options.text) this.#currentText = options.text;

    // 更新预览文本
    const preview = this.contentElement.querySelector('.text-preview');
    preview.textContent = this.#currentText;
    
    // 更新书籍信息
    const bookTitle = this.contentElement.querySelector('.book-title');
    const bookAuthor = this.contentElement.querySelector('.book-author');
    bookTitle.textContent = this.#bookName;
    bookAuthor.textContent = this.#authorName;
    
    // 显示菜单
    this.wrapperElement.classList.remove('hide');
    this.wrapperElement.classList.add('show');

    let mode;
    if(options.mode) {
      mode = options.mode;
    } else { // 如果未指定模式，则根据本地存储中的设置
      const settings = this.loadModeSettings();
      mode = settings.isInlineMode ? 'inline' : 'floating';
    }

    if( mode === 'inline') {
      this.switchToInline({resize:!this.#isShowing});
    } else {
      this.switchToFloating({resize:false});
    }

    this.#isShowing = true;
  }
  
  showLoading(){
    let loadingDiv = this.contentElement.querySelector('.message.loading');
    if(loadingDiv) loadingDiv.remove();
    loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading message';
    loadingDiv.textContent = '加载中...';
    this.contentElement.querySelector('.chat-container').appendChild(loadingDiv); 
  }
  
  hideLoading(){
    let loadingDiv = this.contentElement.querySelector('.message.loading');
    if(loadingDiv) loadingDiv.remove();
  }

  /**
   * 显示结果
   * @param {Object} result - 处理结果
   */
  showResult(result) {
    if (!result || !result.content) {
      this.showError('处理失败');
      return;
    }
    this.hideLoading();
    this.appendMessage(result.content, 'ai');
  }

  /**
   * 显示错误消息
   * @param {string} message - 错误消息
   */
  showError(tip, error = new Error()) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error message';
    errorDiv.textContent = `${tip} ${error.message}`;
    
    this.hideLoading();
    this.contentElement.querySelector('.chat-container').appendChild(errorDiv);
    
    // 2秒后自动移除
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  /**
   * 隐藏菜单
   * @param {Object} options - 选项
   * @param {boolean} options.needSaveSettings - 是否保存设置
   */
  hide(options) {
    const defaults = {needSaveSettings:true};
    const settings = Object.assign({}, defaults, options);

    this.#isShowing = false;
    this.wrapperElement.classList.remove('show');
    this.wrapperElement.classList.add('hide');
    if (settings.needSaveSettings) this.saveModeSettings({closed:true, isInlineMode:this.#isInlineMode});
    if (this.#isInlineMode)  this.resetBodyWidth();
  }

  /**
   * 切换到悬浮模式
   * @param {Object} options - 选项
   * @param {boolean} options.resize - 是否调整 body 宽度
   */
  switchToFloating(options) {
    const defaults = {resize:true};
    const settings = Object.assign({}, defaults, options);

    this.#isInlineMode = false;
    
    this.contentElement.classList.remove('inline');
    this.contentElement.classList.add('floating');

    if(settings.resize) this.resetBodyWidth();
    this.loadModeSettings('floating');
    
    // 更新按钮文本
    const toggleButton = this.contentElement.querySelector('.menu-button.toggle-mode');
    const toggleText = toggleButton.querySelector('.toggle-text');
    toggleText.textContent = '内嵌模式(T)';

    this.saveModeSettings({isInlineMode:false});
  }

  /**
   * 切换到内嵌模式
   * @param {Object} options - 选项
   * @param {boolean} options.resize - 是否调整 body 宽度
   */
  switchToInline(options) {
    const defaults = {resize:true};
    const settings = Object.assign({}, defaults, options);

    this.#isInlineMode = true;
    
    this.contentElement.classList.remove('floating');
    this.contentElement.classList.add('inline');

    this.loadModeSettings('inline');
    if(settings.resize) this.resizeBodyWidth();
    
    // 更新按钮文本
    const toggleButton = this.contentElement.querySelector('.menu-button.toggle-mode');
    const toggleText = toggleButton.querySelector('.toggle-text');
    toggleText.textContent = '悬浮模式(T)';

    this.saveModeSettings({isInlineMode:true});
  }

  /**
   * resize body
   */
  resizeBodyWidth() {
    document.body.style.width = window.innerWidth - this.contentElement.offsetWidth + 'px';
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * reset body 
   */
  resetBodyWidth() {
    document.body.style.width = '100vw';
    window.dispatchEvent(new Event('resize'));
  }

  saveFontSettings(fontSize) {
    this._saveSettings({fontSize:fontSize});
  }

  loadFontSettings() {
    this.wrapperElement.style.fontSize = this._loadSettings().fontSize + 'px';
  }

  /**
   * 保存模式设置
   * @param {Object} options - 选项
   * @param {boolean} options.closed - 是否关闭
   * @param {boolean} options.isInlineMode - 是否内嵌模式
   */
  saveModeSettings(options) {
    const defaults = {closed:false, isInlineMode:true};
    let settings = Object.assign({}, defaults, options);
    this._saveSettings({isInlineMode:settings.isInlineMode, isLastTimeShowing:!settings.closed});
  }

  /**
   * 将当前位置信息保存到本地存储
   * inlineMenuWidth: 内嵌模式菜单宽度
   * inlineMenuHeight: 内嵌模式菜单高度
   * inlineMenuTop: 内嵌模式菜单顶部位置
   * floatingMenuWidth: 悬浮模式菜单宽度
   * floatingMenuHeight: 悬浮模式菜单高度
   * floatingMenuTop: 悬浮模式菜单顶部位置
   * floatingMenuLeft: 悬浮模式菜单左侧位置
   */
  savePositonSettings() {
    let settings = {};
    if (this.#isInlineMode) {
      settings.inlineMenuWidth = this.contentElement.offsetWidth;
      settings.inlineMenuHeight = this.contentElement.offsetHeight;
      settings.inlineMenuTop = this.contentElement.offsetTop;
    } else {
      settings.floatingMenuWidth = this.contentElement.offsetWidth;
      settings.floatingMenuHeight = this.contentElement.offsetHeight;
      settings.floatingMenuTop = this.contentElement.offsetTop;
      settings.floatingMenuLeft = this.contentElement.offsetLeft;
    }
    this._saveSettings(settings);
  }


  /**
   * 从本地存储中加载模式设置
   */
  loadModeSettings(mode='inline') {
    const settings = this._loadSettings();
    if (mode === 'inline') {
      if (settings.inlineMenuWidth) {
        this.contentElement.style.width = settings.inlineMenuWidth + 'px';
        this.contentElement.style.height = settings.inlineMenuHeight + 'px';
        this.contentElement.style.top = settings.inlineMenuTop + 'px';
        this.contentElement.style.left = 'auto';
      }
    } else {
      if (settings.floatingMenuWidth) {
        this.contentElement.style.width = settings.floatingMenuWidth + 'px';
        this.contentElement.style.height = settings.floatingMenuHeight + 'px';
        this.contentElement.style.top = settings.floatingMenuTop + 'px';
        this.contentElement.style.left = settings.floatingMenuLeft + 'px';
      }
    }
    return settings;
  }

  _loadSettings() {
    let settings = JSON.parse(localStorage.getItem(window.CONFIG.LOCAL_STORAGE_KEY)) || {
      isInlineMode:true,
      isLastTimeShowing:true,
      fontSize:16,
      isDarkMode:false,
    };
    return settings;
  }
  _saveSettings(settings) {
    let savedSettings = this._loadSettings();
    Object.assign(savedSettings, settings);
    localStorage.setItem(window.CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(savedSettings));
  }

  _updateProviderDisplay(provider) {
    this.contentElement.querySelector('.bar .model').textContent = `(${this._getProviderName(provider)})`;
  }

  /**
   * 初始化帮助弹窗
   * @private
   */
  _initHelpModal() {
    // 动态生成服务商选项和API Key输入框
    this._generateProviderElements();

    // 初始化模型服务配置
    this._initModelConfig();
  }

  /**
   * 动态生成服务商选项和API Key输入框
   * @private
   */
  _generateProviderElements() {
    // 生成服务商选项
    const selectElement = this.helpModal.querySelector('#modalCurrentProvider');
    selectElement.innerHTML = FloatingMenu.providerList
      .map(provider => `<option value="${provider}">${FloatingMenu.providers[provider]}</option>`)
      .join('');

    // 生成API Key输入框
    const apiKeysContainer = this.helpModal.querySelector('.api-keys');
    apiKeysContainer.innerHTML = FloatingMenu.providerList
      .map(provider => {
        const providerName = FloatingMenu.providers[provider];
        const capitalizedProvider = provider.charAt(0).toUpperCase() + provider.slice(1);
        return `
          <div class="api-key-group">
            <label for="modal${capitalizedProvider}Key">${providerName} API Key</label>
            <div class="input-group">
              <input type="text" 
                     class="api-key-input"
                     id="modal${capitalizedProvider}Key" 
                     placeholder="输入 API Key"
                     autocomplete="off"
                     data-lpignore="truespacebetwe
                     data-form-type="other">
              <button class="test-btn" data-provider="${provider}">测试</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * 初始化模型服务配置
   * @private
   */
  _initModelConfig() {
    const modalnurrentProvider = this.helpModal.querySelector('#modalCurrentProvider');
    const modalSaveConfig = this.helpModal.querySelector('#modalSaveConfig');
    const modalStatusMsg = this.helpModal.querySelector('#modalStatusMsg');

    // 测试按钮点击事件
    this.helpModal.querySelectorAll('.test-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const provider = e.target.dataset.provider;
        const key = this.helpModal.querySelector(`#modal${provider.charAt(0).toUpperCase() + provider.slice(1)}Key`).value;
        await this._testApiKey(provider, key, modalStatusMsg);
      });
    });

    // 保存配置按钮点击事件
    modalSaveConfig.addEventListener('click', async () => {
      await this._saveModelConfig(modalCurrentProvider, modalStatusMsg);
    });
  }

  /**
   * 加载模型配置
   * @private
   */
  async _loadModelConfig() {
    try {
      const config = await chrome.storage.sync.get(['currentProvider', 'apiKeys']);
      const modalCurrentProvider = this.helpModal.querySelector('#modalCurrentProvider');
      
      // 设置当前服务商
      if (config.currentProvider) {
        modalCurrentProvider.value = config.currentProvider;
      }

      // 设置 API Keys
      if (config.apiKeys) {
        Object.entries(config.apiKeys).forEach(([provider, key]) => {
          const input = this.helpModal.querySelector(`#modal${provider.charAt(0).toUpperCase() + provider.slice(1)}Key`);
          if (input) {
            input.value = key;
          }
        });
      }
    } catch (error) {
      this._showModalStatus('加载配置失败：' + error.message, 'error');
    }
  }

  /**
   * 保存模型配置
   * @private
   * @param {HTMLSelectElement} modalCurrentProvider - 当前服务商选择元素
   * @param {HTMLElement} modalStatusMsg - 状态消息元素
   */
  async _saveModelConfig(modalCurrentProvider, modalStatusMsg) {
    try {
      const currentProvider = modalCurrentProvider.value;
      const apiKeys = {};

      // 收集所有非空的 API Keys
      FloatingMenu.providerList.forEach(provider => {
        const key = this.helpModal.querySelector(`#modal${provider.charAt(0).toUpperCase() + provider.slice(1)}Key`).value.trim();
        if (key) {
          apiKeys[provider] = key;
        }
      });

      // 验证当前选择的服务商是否有对应的 API Key
      if (!apiKeys[currentProvider]) {
        throw new Error(`请先设置 ${this._getProviderName(currentProvider)} 的 API Key`);
      }

      const settings = { currentProvider, apiKeys };

      // 保存到 storage
      await chrome.storage.sync.set(settings);
      
      // 通知 background script 更新 AIService 设置
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: settings
      });

      if (!response.success) {
        throw new Error(response.error?.message || '更新设置失败');
      }

      this._showModalStatus('设置已保存', 'success');
    } catch (error) {
      console.error('保存设置失败:', error);
      this._showModalStatus(error.message || '保存设置失败', 'error');
    }
  }

  /**
   * 测试 API Key
   * @private
   * @param {string} provider - 服务商标识
   * @param {string} key - API Key
   * @param {HTMLElement} modalStatusMsg - 状态消息元素
   */
  async _testApiKey(provider, key, modalStatusMsg) {
    if (!key) {
      this._showModalStatus(`请输入 ${this._getProviderName(provider)} 的 API Key`, 'error');
      return;
    }

    try {
      // 显示测试中状态
      const testBtn = this.helpModal.querySelector(`[data-provider="${provider}"]`);
      const originalText = testBtn.textContent;
      testBtn.textContent = '测试中...';
      testBtn.disabled = true;

      // 发送测试请求
      const response = await AIService.getInstance().test(provider, key);

      if (response.success) {
        this._showModalStatus(`${this._getProviderName(provider)} API Key 测试成功`, 'success');
      } else {
        console.log("test api key response: ", response);
        this._showModalStatus(`${this._getProviderName(provider)} API Key 测试失败: ${response.error.message}`, 'error');
      }

      // 恢复按钮状态
      testBtn.textContent = originalText;
      testBtn.disabled = false;
    } catch (error) {
      this._showModalStatus(`${error.message}`, 'error');
    }
  }

  /**
   * 显示模态框状态消息
   * @private
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型（success/error）
   */
  _showModalStatus(message, type) {
    const statusEl = this.helpModal.querySelector('#modalStatusMsg');
    statusEl.textContent = message;
    statusEl.classList.remove('error', 'success');
    statusEl.classList.add(type);
    
    // 3秒后自动清除成功消息，错误消息需要手动关闭
    if (type === 'success') {
      setTimeout(() => {
        if (statusEl.textContent === message) {
          statusEl.textContent = '';
          statusEl.classList.remove('success');
        }
      }, 3000);
    }
  }

  /**
   * 获取服务商名称
   * @private
   * @param {string} provider - 服务商标识
   * @returns {string} 服务商名称
   */
  _getProviderName(provider) {
    return FloatingMenu.providers[provider] || provider;
  }
}
// 导出
window.FloatingMenu = FloatingMenu; 
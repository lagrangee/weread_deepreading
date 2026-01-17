/**
 * @file assistant-panel.js
 * @description 主面板组件，整合所有子组件和服务
 */

import { CONFIG } from '../../shared/config.js';
import { BridgeService } from '../../shared/bridge-service.js';
import { POPUP_MESSAGES } from '../../shared/message-types.js';
import { MenuDrag } from './interactive/drag/menu-drag.js';
import { PinDrag } from './interactive/drag/pin-drag.js';
import { MenuResize } from './interactive/resize/menu-resize.js';
import { ChatComponent } from './chat/chat-component.js';
import { ChatService } from '../services/chat-service.js';
import { SettingsService } from '../../shared/settings-service.js';
import { DOMUtils, EventUtils } from '../utils/index.js';

const MODE_HANDLERS = {
  inline: 'switchToInline',
  floating: 'switchToFloating',
};

export class AssistantPanel {
  /** @type {AssistantPanel|null} 单例实例 */
  static #instance = null;

  /** @type {Promise<AssistantPanel>|null} 静态初始化Promise */
  static #initializationPromise = null;

  /** @type {HTMLElement} 面板容器元素 */
  #wrapperElement;

  /** @type {HTMLElement} 内容元素 */
  #contentElement;

  /** @type {HTMLElement} Pin按钮元素 */
  #pinElement;

  /** @type {string} 当前选中的文本 */
  #currentText = '';

  /** @type {string} 书名 */
  #bookName = '';

  /** @type {string} 作者名 */
  #authorName = '';

  /** @type {string} 模式 */
  #mode = null;

  /** @type {boolean} 是否显示中 */
  #isShowing = false;

  #provider = null;

  /** @type {string|null} 当前活跃的流式请求ID */
  #activeRequestId = null;

  /** @type {string} 当前对话ID */
  #currentConversationId = 'default';

  /** @type {ChatComponent} 聊天组件 */
  #chatComponent;

  /** @type {HTMLElement|null} 快捷切换菜单 */
  #providerMenu = null;

  /** @type {ChatService} 聊天服务 */
  #chatService;

  /** @type {SettingsService} 设置服务 */
  #settingsService;

  /** @type {BridgeService} 桥接服务 */
  #bridge;

  /**
   * 获取单例t例
   * @returns {Promise<AssistantPanel>} 面板实例
   */
  static async getInstance(bookName, authorName) {
    if (!AssistantPanel.#instance && !AssistantPanel.#initializationPromise) {
      AssistantPanel.#initializationPromise = (async () => {
        try {
          const menuUrl = chrome.runtime.getURL('content/assistant-panel.html');
          const response = await fetch(menuUrl);
          const html = await response.text();

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const menu = doc.body.firstElementChild;

          document.body.appendChild(menu);
          AssistantPanel.#instance = new AssistantPanel(menu, bookName, authorName);

          // 等待实例完全初始化
          await AssistantPanel.#instance.#initialize();

          console.log(`${CONFIG.LOG_PREFIX} 助手面板创建成功`);
          return AssistantPanel.#instance;
        } catch (error) {
          console.error(`${CONFIG.LOG_PREFIX} 助手面板创建失败:`, error);
          // 重置Promise，允许重试
          AssistantPanel.#initializationPromise = null;
          throw new Error(`助手面板创建失败: ${error.message}`);
        }
      })();
    }

    // 所有调用都等待同一个初始化Promise
    return await AssistantPanel.#initializationPromise;
  }

  /**
   * 私有构造函数
   * @param {HTMLElement} element - 面板元素
   * @param {string} bookName - 书名
   * @param {string} authorName - 作者名
   * @private
   */
  constructor(element, bookName, authorName) {
    this.#wrapperElement = element;
    this.#contentElement = element.querySelector('.assistant-panel');
    this.#pinElement = element.querySelector('.fixed-pin');
    this.#bookName = bookName;
    this.#authorName = authorName;
  }

  /**
   * 初始化面板
   * @private
   */
  async #initialize() {
    this.#settingsService = new SettingsService();
    this.#chatService = new ChatService(this.#bookName, this.#authorName);
    this.#bridge = new BridgeService('content-panel');

    this.#initComponents();
    this.#initInteractive();
    await this.#loadSettings();
    this.#bindEvents();
    this.#setupEventListeners();
    this.#updateInfo();
    this.#addShortcuts();
    await this.#checkOnboarding();
    await this.#showStatusMessage(); // 面板加载时展示状态
  }

  /**
   * 更新信息
   * @private
   */
  #updateInfo() {
    const bookTitle = this.#contentElement.querySelector('.book-title');
    const bookAuthor = this.#contentElement.querySelector('.book-author');
    bookTitle.textContent = this.#bookName;
    bookAuthor.textContent = this.#authorName;
    this.#updateProvider();
  }

  async #updateProvider() {
    const providerBtn = this.#contentElement.querySelector('.menu-button.provider');
    const providerNameSpan = providerBtn.querySelector('.provider-name');
    const statusDot = providerBtn.querySelector('.status-dot');

    const name = CONFIG.PROVIDERS[this.#provider] || '未知';
    providerNameSpan.textContent = name;

    // 获取当前服务商的状态
    const apiKeys = await this.#settingsService.loadAPIKeys() || {};
    const testResults = await this.#settingsService.loadTestResults() || {};

    const isConfigured = !!apiKeys[this.#provider];
    const testStatus = testResults[this.#provider];

    let statusClass = 'none';
    if (isConfigured) {
      statusClass = (testStatus === 'error') ? 'fail' : 'ready';
    }

    // 更新状态灯样式
    statusDot.className = `status-dot ${statusClass}`;

    // 每次更新时尝试同步快捷菜单状态
    if (this.#providerMenu && this.#providerMenu.classList.contains('show')) {
      await this.#renderProviderMenu();
    }
  }

  /**
   * 渲染/生成快捷切换菜单
   * @private
   */
  async #renderProviderMenu() {
    if (!this.#providerMenu) {
      this.#providerMenu = document.createElement('div');
      this.#providerMenu.className = 'provider-menu';
      // 将菜单插入到标题栏中 provider 按钮的父级（或直接插入 body）
      // 为了正确定位，我们将 provider 按钮放在一个相对定位的容器中
      const providerBtn = this.#contentElement.querySelector('.menu-button.provider');
      let container = providerBtn.parentElement.querySelector('.provider-menu-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'provider-menu-container';
        providerBtn.parentNode.insertBefore(container, providerBtn);
        container.appendChild(providerBtn);
      }
      container.appendChild(this.#providerMenu);
    }

    const apiKeys = await this.#settingsService.loadAPIKeys() || {};
    const testResults = await this.#settingsService.loadTestResults() || {};
    const providers = CONFIG.PROVIDERS;

    this.#providerMenu.innerHTML = Object.entries(providers).map(([key, name]) => {
      const isConfigured = !!apiKeys[key];
      const testStatus = testResults[key]; // 'success' or 'error'
      const isActive = key === this.#provider;

      let statusClass = 'none'; // 默认未配置
      if (isConfigured) {
        if (testStatus === 'error') {
          statusClass = 'fail'; // 配置了但测试失败
        } else {
          statusClass = 'ready'; // 配置了且测试成功或未知
        }
      }

      return `
        <div class="menu-item ${isActive ? 'active' : ''}" data-provider="${key}">
          <span class="status-dot ${statusClass}"></span>
          <span class="name">${name}</span>
        </div>
      `;
    }).join('');

    // 绑定菜单项点击事件
    this.#providerMenu.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newProvider = item.dataset.provider;
        if (newProvider !== this.#provider) {
          console.log(`${CONFIG.LOG_PREFIX} 切换服务商为: ${newProvider}`);
          this.#provider = newProvider;
          await this.#settingsService.saveProvider(newProvider);
          this.#updateProvider();
          // 通知其他组件
          EventUtils.emit('update:provider', newProvider);
        }
        this.#hideProviderMenu();
      });
    });
  }

  /**
   * 显示快捷菜单
   * @private
   */
  async #showProviderMenu() {
    await this.#renderProviderMenu();
    this.#providerMenu.classList.add('show');

    // 点击外部关闭菜单
    const closeMenu = (e) => {
      if (!this.#providerMenu.contains(e.target)) {
        this.#hideProviderMenu();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  /**
   * 隐藏快捷菜单
   * @private
   */
  #hideProviderMenu() {
    if (this.#providerMenu) {
      this.#providerMenu.classList.remove('show');
    }
  }

  /**
   * 初始化组件
   * @private
   */
  #initComponents() {
    // 初始化聊天组件
    this.#chatComponent = new ChatComponent(this.#contentElement.querySelector('.chat-container'));
  }

  /**
   * 初始化交互功能
   * @private
   */
  #initInteractive() {
    // 初始化拖拽
    new MenuDrag(this.#contentElement, {
      onDragEnd: () => this.#saveSizeAndPosition()
    });

    // 初始化Pin按钮拖拽
    new PinDrag(this.#pinElement, {
      onClick: () => this.show({ force: true }),
      onDragEnd: () => this.#savePinPosition(),
    });

    // 初始化大小调整
    new MenuResize(this.#contentElement, {
      onResizeEnd: () => {
        if (this.#mode === 'inline') {
          this.#resizeBodyWidth();
        }
        this.#saveSizeAndPosition();
      }
    });
  }

  /**
   * 初始化快捷键
   * @private
   */
  #addShortcuts() {
    document.addEventListener('keydown', this.#handleKeyDown);
  }

  #removeShortcuts() {
    document.removeEventListener('keydown', this.#handleKeyDown);
  }

  #handleKeyDown = (e) => {
    const key = e.key.toLowerCase();

    if (e.target.classList.contains('chat-input')) {
      if (key === 'enter') {
        this.#handleSend();
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    if (e.target.tagName === 'TEXTAREA') {
      return;
    }

    if (!this.#isShowing) {
      if (key === 'o') {
        this.show({ force: true });
      }
      return;
    }

    switch (key) {
      case 't': this.#toggleMode();
        break;

      case 'escape': this.hide();
        break;

      case 'a':
        e.key === 'A' ? this.#setFontSise({ increase: true }) : this.#setFontSise({ decrease: true });
        break;

      case 'd': this.#toggleDarkMode();
        break;

      case 'e': this.#handleExplain();
        break;

      case 'x': this.#handleDigest();
        break;

      case 'm': this.#handleAnalyze();
        break;

      case '?': this.#openSettings();
        break;
    }
  }

  /**
   * 拦截事件保证文字正常选择和复制
   * @private
   */
  #setupEventListeners() {
    EventUtils.on('page:change', ({ isCover = false } = {}) => {
      if (isCover) {
        this.hide({ needSave: false });
      } else {
        this.show({ force: false });
      }
    });

    EventUtils.on('update:provider', async (provider) => {
      this.#provider = provider;
      this.#updateProvider();
      this.#checkOnboarding(); // 服务商变动时可能涉及 Key 状态更新
      await this.#showStatusMessage(); // 切换模型时展示状态
    });

    // 监听来自 popup 的设置变更通知
    this.#bridge.on(POPUP_MESSAGES.SETTINGS.CHANGED, async () => {
      console.log(`${CONFIG.LOG_PREFIX} 收到设置变更通知`);
      await this.#loadSettings(); // 重新加载设置
      this.#updateInfo(); // 更新 UI 信息
      await this.#checkOnboarding(); // 重新检查引导状态
    });

    /* 拦截选中文本 */
    this.#wrapperElement.addEventListener('selectstart', (e) => {
      e.stopPropagation();
    });
    /* 拦截右键菜单 */
    this.#wrapperElement.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
    });
    /* 拦截 ctrl+c */
    this.#wrapperElement.addEventListener('keydown', (e) => {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'a')) {
        e.stopPropagation();
      }
    });
    // 处理复制事件
    document.addEventListener('copy', (e) => {
      const selectedText = window.getSelection().toString();
      if (selectedText.length === 0) return;
      if (this.#contentElement.contains(e.target)) {
        e.preventDefault(); // 阻止默认复制行为
        e.clipboardData.setData('text/plain', selectedText); // 手动设置剪贴板内容
        e.stopPropagation(); // 阻止第三方代码修改
        return;
      }
      // 拦截网站复制内容
      this.show({ force: true, text: selectedText });
    }, true);
  }

  /**
   * 绑定事件
   * @private
   */
  #bindEvents() {
    const increaseButton = this.#contentElement.querySelector('.menu-button.font-adjust.increase');
    const decreaseButton = this.#contentElement.querySelector('.menu-button.font-adjust.decrease');

    increaseButton.addEventListener('click', () => this.#setFontSise({ increase: true }));
    decreaseButton.addEventListener('click', () => this.#setFontSise({ decrease: true }));

    // 暗色模式切换
    const themeToggle = this.#contentElement.querySelector('.menu-button.theme-toggle');
    themeToggle.addEventListener('click', () => this.#toggleDarkMode());

    // 切换模式按钮
    const toggleButton = this.#contentElement.querySelector('.menu-button.toggle-mode');
    toggleButton.addEventListener('click', () => this.#toggleMode());

    // 关闭按钮
    const closeButton = this.#contentElement.querySelector('.menu-close');
    closeButton.addEventListener('click', () => this.hide());

    // 帮助按钮
    const helpButton = this.#contentElement.querySelector('.menu-button.help');
    helpButton.addEventListener('click', () => this.#openSettings());

    // 服务商按钮 - 改为显示快捷菜单
    const providerButton = this.#contentElement.querySelector('.menu-button.provider');
    providerButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.#providerMenu && this.#providerMenu.classList.contains('show')) {
        this.#hideProviderMenu();
      } else {
        this.#showProviderMenu();
      }
    });

    // AI功能按钮
    const explainButton = this.#contentElement.querySelector('.menu-button.explain');
    const digestButton = this.#contentElement.querySelector('.menu-button.digest');
    const analyzeButton = this.#contentElement.querySelector('.menu-button.analyze');

    explainButton.addEventListener('click', () => this.#handleExplain());
    digestButton.addEventListener('click', () => this.#handleDigest());
    analyzeButton.addEventListener('click', () => this.#handleAnalyze());

    // 发送按钮
    const sendButton = this.#contentElement.querySelector('.menu-button.send');
    sendButton.addEventListener('click', () => this.#handleSend());

    // 停止按钮
    const stopButton = this.#contentElement.querySelector('.menu-button.stop');
    stopButton.addEventListener('click', () => this.#handleStop());

    // 引导按钮
    const onboardingBtn = this.#contentElement.querySelector('.onboarding-banner .onboarding-btn');
    if (onboardingBtn) {
      onboardingBtn.addEventListener('click', () => this.#openSettings());
    }

    // 监听窗口大小变化
    window.addEventListener('resize', DOMUtils.debounce(() => {
      if (this.#isShowing) {
        DOMUtils.ensureInViewport(this.#contentElement);
      }
    }, 100));
  }

  /**
   * 加载设置
   * @private
   */
  async #loadSettings() {
    const mode = await this.#settingsService.loadMode();
    this.#mode = mode;

    const pinPosition = await this.#settingsService.loadPinPosition();
    Object.assign(this.#pinElement.style, pinPosition);

    const fontSize = await this.#settingsService.loadFontSize();
    if (fontSize) this.#setFontSise({ fontSize });

    const darkMode = await this.#settingsService.loadDarkMode();
    this.#wrapperElement.classList.toggle('dark-mode', darkMode);

    this.#provider = await this.#settingsService.loadProvider();
  }

  /**
   * 保存大小设置
   * @private
   */
  async #saveSizeAndPosition() {
    const { width, height, left, top } = this.#contentElement.style;
    if (this.#mode === 'inline')
      await this.#settingsService.saveInline({ width });
    else
      await this.#settingsService.saveFloating({ width, height, left, top });
  }

  /**
   * 保存Pin按钮位置
   * @private
   */
  async #savePinPosition() {
    const { right, bottom } = this.#pinElement.style;
    await this.#settingsService.savePinPosition({ right, bottom });
  }

  /**
   * 设置字体大小
   * @param {Object} options - 选项
   * @param {boolean} [options.increase] - 增加字体大小
   * @param {boolean} [options.decrease] - 减少字体大小
   * @param {number} [options.fontSize] - 设置字体大小
   * @private
   */
  #setFontSise(options) {
    let fontSize = parseFloat(window.getComputedStyle(this.#wrapperElement).fontSize);
    if (options?.increase && fontSize < 24) fontSize += 1;
    if (options?.decrease && fontSize > 12) fontSize -= 1;
    if (options?.fontSize) fontSize = options.fontSize;
    this.#wrapperElement.style.fontSize = `${fontSize}px`;
    this.#settingsService.saveFontSize(fontSize);
  }

  /**
   * 切换模式
   * @private
   */
  #toggleMode() {
    const mode = this.#mode === 'inline' ? 'floating' : 'inline';
    this[MODE_HANDLERS[mode]]();
    this.#mode = mode;
    this.#settingsService.saveMode(mode);
  }

  /**
   * 切换暗黑模式
   * @private
   */
  #toggleDarkMode() {
    this.#wrapperElement.classList.toggle('dark-mode');
    this.#settingsService.saveDarkMode(this.#wrapperElement.classList.contains('dark-mode'));
  }

  /**
   * 处理发送消息
   * @private
   */
  async #handleSend() {
    const input = this.#contentElement.querySelector('.chat-input');
    const message = input.value.trim();

    if (!message) return;
    input.value = '';

    await this.#performStreamRequest({
      text: message,
      type: 'chat',
      conversationId: this.#currentConversationId,
      includeHistory: true,
      userMessage: message,
      actionName: '发送消息'
    });
  }

  /**
   * 处理解释请求
   * @private
   */
  async #handleExplain() {
    await this.#handleAIRequest('explain', '解释');
  }

  /**
   * 处理消化请求
   * @private
   */
  async #handleDigest() {
    await this.#handleAIRequest('digest', '消化');
  }

  /**
   * 处理分析请求
   * @private
   */
  async #handleAnalyze() {
    await this.#handleAIRequest('analyze', '兼听');
  }

  /**
   * 处理AI请求的通用方法（使用流式处理）
   * @param {string} type - 请求类型 (explain/digest/analyze)
   * @param {string} actionName - 操作名称（用于显示）
   * @private
   */
  async #handleAIRequest(type, actionName) {
    if (!this.#currentText.trim()) {
      this.#chatComponent.showError(`请先选择要${actionName}的文本`);
      return;
    }

    // 为 explain/digest/analyze 操作生成新的 conversationId
    const newConversationId = DOMUtils.generateUniqueId(type);
    this.#currentConversationId = newConversationId;

    console.log(`${CONFIG.LOG_PREFIX} 生成新的对话ID: ${newConversationId} (${actionName})`);

    await this.#performStreamRequest({
      text: this.#currentText,
      type,
      conversationId: newConversationId,
      includeHistory: false,
      actionName,
      buttonType: type
    });
  }

  /**
   * 执行流式请求的通用方法
   * @param {Object} options - 请求选项
   * @param {string} options.text - 请求文本
   * @param {string} options.type - 请求类型
   * @param {string} options.conversationId - 对话ID
   * @param {boolean} options.includeHistory - 是否包含历史记录
   * @param {string} [options.userMessage] - 用户消息（聊天时显示）
   * @param {string} options.actionName - 操作名称（用于日志和错误显示）
   * @param {string} [options.buttonType] - 按钮类型（用于设置加载状态）
   * @private
   */
  async #performStreamRequest({
    text,
    type,
    conversationId,
    includeHistory,
    userMessage = null,
    actionName,
    buttonType = null
  }) {
    // 获取相关按钮（如果有）
    const button = buttonType ? this.#contentElement.querySelector(`.menu-button.${buttonType}`) : null;

    // 取消之前的请求
    this.#cancelActiveRequest();

    try {
      // 设置按钮加载状态
      if (button) {
        this.#setButtonLoading(button, true);
      }

      // 开始流式显示
      this.#chatComponent.startStreamMessage(userMessage);
      this.#showStopButton();

      // 发送流式请求
      this.#activeRequestId = await this.#chatService.sendStreamMessage({
        text,
        type,
        provider: this.#provider,
        conversationId,
        includeHistory
      }, {
        onStart: (data) => {
          console.log(`${CONFIG.LOG_PREFIX} 开始${actionName}:`, data);
        },
        onChunk: (data) => {
          this.#chatComponent.appendStreamChunk(data.text);
        },
        onComplete: (data) => {
          this.#chatComponent.finishStreamMessage();
          this.#activeRequestId = null;
          this.#hideStopButton();
          console.log(`${CONFIG.LOG_PREFIX} ${actionName}完成`);
        },
        onError: (error) => {
          this.#chatComponent.handleStreamError(error.error || `${actionName}失败`);
          this.#activeRequestId = null;
          this.#hideStopButton();
        }
      });

    } catch (error) {
      this.#chatComponent.showError(`${actionName}失败`, error);
      this.#activeRequestId = null;
      this.#hideStopButton();
    } finally {
      // 恢复按钮状态
      if (button) {
        this.#setButtonLoading(button, false);
      }
    }
  }

  /**
   * 设置按钮加载状态
   * @param {HTMLElement} button - 按钮元素
   * @param {boolean} loading - 是否加载中
   * @private
   */
  #setButtonLoading(button, loading) {
    if (loading) {
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  isShowing() {
    return this.#isShowing;
  }

  /**
   * 显示面板
   * @param {Object} options - 选项
   * @param {string} [options.text] - 选中的文本
   * @param {string} [options.mode] - 显示模式
   */
  async show({ force = true, mode, text = '' } = {}) {
    const showing = await this.#settingsService.loadShowing();
    if (!force && !showing) return;

    // 更新预览文本
    text = text.trim();
    if (text !== '') {
      this.#currentText = text;
      this.#contentElement.querySelector('.text-preview').textContent = this.#currentText;
    }

    // 显示面板
    this.#wrapperElement.classList.remove('hide');
    this.#wrapperElement.classList.add('show');

    // 设置模式
    if (!Object.keys(MODE_HANDLERS).includes(mode))
      mode = await this.#settingsService.loadMode();
    this[MODE_HANDLERS[mode]]({ resize: mode === 'inline' && !this.#isShowing });

    this.#settingsService.saveShowing(true);
    this.#isShowing = true;
  }

  /**
   * 隐藏面板
   * @param {Object} options - 选项
   * @param {boolean} [options.needSave=true] - 是否需要保存面板状态
   */
  async hide({ needSave = true } = {}) {
    this.#isShowing = false;
    this.#wrapperElement.classList.remove('show');
    this.#wrapperElement.classList.add('hide');

    if (needSave) {
      await this.#settingsService.saveShowing(false);
    }

    if (this.#mode === 'inline')
      this.#resetBodyWidth();
  }

  /**
   * 切换到浮动模式
   * @param {Object} options - 选项
   * @param {boolean} [options.resize=true] - 是否调整body宽度
   */
  async switchToFloating(options = {}) {
    const { resize = true } = options;

    this.#contentElement.classList.remove('inline');
    this.#contentElement.classList.add('floating');

    const floatingStyle = await this.#settingsService.loadFloating();
    Object.assign(this.#contentElement.style, floatingStyle);

    if (resize) {
      this.#resetBodyWidth();
    }
  }

  /**
   * 切换到内联模式
   * @param {Object} options - 选项
   * @param {boolean} [options.resize=true] - 是否调整body宽度
   */
  async switchToInline(options = {}) {
    const { resize = true } = options;

    this.#contentElement.classList.remove('floating');
    this.#contentElement.classList.add('inline');

    const inlineStyle = await this.#settingsService.loadInline();
    Object.assign(this.#contentElement.style, inlineStyle);

    if (resize) {
      this.#resizeBodyWidth();
    }
  }

  /**
   * 调整body宽度以适应内联模式
   * @private
   */
  #resizeBodyWidth() {
    document.body.style.width = `${window.innerWidth - this.#contentElement.offsetWidth}px`;
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * 重置body宽度
   * @private
   */
  #resetBodyWidth() {
    document.body.style.width = '100vw';
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * 处理停止生成
   * @private
   */
  #handleStop() {
    this.#cancelActiveRequest();
    this.#hideStopButton();
  }

  /**
   * 显示停止按钮
   * @private
   */
  #showStopButton() {
    const stopButton = this.#contentElement.querySelector('.menu-button.stop');
    const sendButton = this.#contentElement.querySelector('.menu-button.send');
    stopButton.style.display = 'inline-flex';
    sendButton.style.display = 'none';
  }

  /**
   * 隐藏停止按钮
   * @private
   */
  #hideStopButton() {
    const stopButton = this.#contentElement.querySelector('.menu-button.stop');
    const sendButton = this.#contentElement.querySelector('.menu-button.send');
    stopButton.style.display = 'none';
    sendButton.style.display = 'inline-flex';
  }

  /**
   * 取消当前活跃的流式请求
   * @private
   */
  #cancelActiveRequest() {
    if (this.#activeRequestId) {
      console.log(`${CONFIG.LOG_PREFIX} 取消流式请求:`, this.#activeRequestId);
      this.#chatService.cancelStreamRequest(this.#activeRequestId);
      this.#activeRequestId = null;

      // 如果有正在进行的流式显示，完成它
      if (this.#chatComponent.isStreaming()) {
        this.#chatComponent.finishStreamMessage();
      }
    }
  }

  /**
   * 销毁面板实例
   */
  destroy() {
    // 取消活跃的请求
    this.#cancelActiveRequest();

    // 移除事件监听
    this.#removeShortcuts();

    // 清理组件
    this.#chatComponent?.destroy();
    this.#bridge?.destroy();

    // 移除DOM元素
    if (this.#wrapperElement && this.#wrapperElement.parentNode) {
      this.#wrapperElement.parentNode.removeChild(this.#wrapperElement);
    }

    // 清理单例和初始化Promise
    AssistantPanel.#instance = null;
    AssistantPanel.#initializationPromise = null;

    console.log(`${CONFIG.LOG_PREFIX} 助手面板已销毁`);
  }

  /**
   * 打开设置页面
   * @private
   */
  async #openSettings() {
    console.log(`${CONFIG.LOG_PREFIX} 准备打开面板设置`);
    await this.#bridge.sendMessage(POPUP_MESSAGES.SYSTEM.OPEN_OPTIONS, {}, { target: 'background' });
  }

  /**
   * 检查是否需要显示引导（API Key 缺失）
   * @private
   */
  async #checkOnboarding() {
    const apiKeys = await this.#settingsService.loadAPIKeys() || {};
    const hasAnyKey = Object.values(apiKeys).some(key => key && key.trim().length > 0);

    const banner = this.#contentElement.querySelector('.onboarding-banner');
    if (!banner) return;

    if (!hasAnyKey) {
      // 允许短暂延迟以配合面板打开动画
      setTimeout(() => banner.classList.add('show'), 500);
    } else {
      banner.classList.remove('show');
    }
  }

  /**
   * 显示当前模型的配置状态提示
   * @private
   */
  async #showStatusMessage() {
    const apiKeys = await this.#settingsService.loadAPIKeys() || {};
    const testResults = await this.#settingsService.loadTestResults() || {};

    const providerName = CONFIG.PROVIDERS[this.#provider] || '未知';
    const isConfigured = !!apiKeys[this.#provider];
    const testStatus = testResults[this.#provider];

    let statusText = '未配置 API KEY';
    let statusClass = 'system-none';

    if (isConfigured) {
      if (testStatus === 'error') {
        statusText = 'API KEY 校验失败';
        statusClass = 'system-fail';
      } else {
        statusText = '配置正常';
        statusClass = 'system-ready';
      }
    }

    this.#chatComponent.appendMessage(`当前 AI 服务商：**${providerName}** (${statusText})`, `system ${statusClass}`);
  }
}

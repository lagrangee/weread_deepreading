/**
 * @file assistant-panel.js
 * @description 主面板组件，整合所有子组件和服务
 */

import { CONFIG } from '../../shared/config.js';
import { MenuDrag } from './interactive/drag/menu-drag.js';
import { PinDrag } from './interactive/drag/pin-drag.js';
import { MenuResize } from './interactive/resize/menu-resize.js';
import { ChatComponent } from './chat/chat-component.js';
import { HelpModal } from './help-modal/help-modal.js';
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

  /** @type {ChatComponent} 聊天组件 */
  #chatComponent;
  
  /** @type {ChatService} 聊天服务 */
  #chatService;
  
  /** @type {SettingsService} 设置服务 */
  #settingsService;
  
  /** @type {HelpModal} 帮助模态框 */
  #helpModal;

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
    this.#contentElement = element.children[0];
    this.#pinElement = element.children[2];
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

    this.#initComponents();
    this.#initInteractive();
    await this.#loadSettings();
    this.#bindEvents();
    this.#setupEventListeners();
    this.#updateInfo();
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

  #updateProvider() {
    const provider = this.#contentElement.querySelector('.provider');
    provider.textContent = CONFIG.PROVIDERS[this.#provider] || '未知';
  }

  /**
   * 初始化组件
   * @private
   */
  #initComponents() {
    // 初始化聊天组件
    this.#chatComponent = new ChatComponent(this.#contentElement.querySelector('.chat-container'));
    // 初始化帮助模态框
    this.#helpModal = new HelpModal(this.#wrapperElement.children[1]);
  }

  /**
   * 初始化交互功能
   * @private
   */
  #initInteractive() {
    // 初始化拖拽
    new MenuDrag(this.#contentElement, { 
      onDragEnd: () => this.#saveSizeAndPosition() });

    // 初始化Pin按钮拖拽
    new PinDrag(this.#pinElement, {
      onClick: () => { this.#isShowing ? this.hide() : this.show(); },
      onDragEnd: () => this.#savePinPosition() });

    // 初始化大小调整
    new MenuResize(this.#contentElement, {
      onResizeEnd: () => { 
        if (this.#mode === 'inline') {
          this.#resizeBodyWidth();
        }
        this.#saveSizeAndPosition();
      }});
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
    // 如果是在聊天输入框中，不处理快捷键
    if (e.target.classList.contains('chat-input') || this.#helpModal.isShowing) return;    

    switch (e.key.toLowerCase()) {
      case 't': this.#toggleMode();
        break;
      
      case 'escape': this.#isShowing && this.hide();
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

      case '?': this.#helpModal.show();
        break;
      
      case 'enter':
        e.target.classList.contains('chat-input') && this.#handleSend();
        break;
    }
  }

  /**
   * 拦截事件保证文字正常选择和复制
   * @private
   */
  #setupEventListeners() {
    EventUtils.on('page:change', ({isCover = false} = {}) => {
      if (isCover) {
        this.hide({ needSave: false });
      } else {
        this.show({ force: false });
      }
    });
    EventUtils.on('update:provider', (provider) => {
      this.#provider = provider;
      this.#updateProvider();
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
      this.show({force: true, text: selectedText });
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
    helpButton.addEventListener('click', () => this.#helpModal.show());

    // 服务商按钮
    const providerButton = this.#contentElement.querySelector('.menu-button.provider');
    providerButton.addEventListener('click', () => this.#helpModal.show());

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
    this.#setFontSise({ fontSize });

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
    
    try {
      this.#chatComponent.appendMessage(message, 'user');
      this.#chatComponent.showLoading();
      const response = await this.#chatService.sendMessage({
        text: message,
        type: 'chat',
        provider: this.#provider,
        conversationId: 'default',
        includeHistory: true
      });
      
      this.#chatComponent.showResult(response.content);
      
    } catch (error) {
      this.#chatComponent.showError('发送消息失败', error);
    }
    
    input.value = '';
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
   * 处理AI请求的通用方法
   * @param {string} type - 请求类型 (explain/digest/analyze)
   * @param {string} actionName - 操作名称（用于显示）
   * @private
   */
  async #handleAIRequest(type, actionName) {
    if (!this.#currentText.trim()) {
      this.#chatComponent.showError(`请先选择要${actionName}的文本`);
      return;
    }

    const button = this.#contentElement.querySelector(`.menu-button.${type}`);
    
    try {
      // 设置按钮加载状态
      this.#setButtonLoading(button, true);
      
      // 添加用户消息到聊天界面
      // this.#chatComponent.appendMessage(this.#currentText, 'user');
      
      // 显示加载状态
      this.#chatComponent.showLoading();
      
      // 发送请求
      const response = await this.#chatService.sendMessage({
        text: this.#currentText,
        type, 
        conversationId: 'default',
        includeHistory: false,
        provider: this.#provider,
      });
      
      // 显示结果
      this.#chatComponent.showResult(response.content);
      
    } catch (error) {
      this.#chatComponent.showError(`${actionName}请求失败`, error);
    } finally {
      // 恢复按钮状态
      this.#setButtonLoading(button, false);
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

  /**
   * 显示面板
   * @param {Object} options - 选项
   * @param {string} [options.text] - 选中的文本
   * @param {string} [options.mode] - 显示模式
   */
  async show({ force = true, mode, text = '' } = {}) {
    const showing = await this.#settingsService.loadShowing();
    if (!force && !showing) return;

    this.#addShortcuts();

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
    this[MODE_HANDLERS[mode]]();

    this.#settingsService.saveShowing(true);
    this.#isShowing = true;
    EventUtils.emit('panel:show', { text: this.#currentText });
  }

  /**
   * 
   * @param {*} param0 
   */
  async hide({needSave = true} = {}) {
    this.#removeShortcuts();
    this.#isShowing = false;
    this.#wrapperElement.classList.remove('show');
    this.#wrapperElement.classList.add('hide');
    
    await this.#settingsService.saveShowing(!needSave);
    
    if (this.#mode === 'inline') 
      this.#resetBodyWidth();

    EventUtils.emit('panel:hide');
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

    EventUtils.emit('panel:mode', { mode: 'floating' });
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

    EventUtils.emit('panel:mode', { mode: 'inline' });
  }

  /**
   * 调整body宽度以适应内联模式
   */
  #resizeBodyWidth() {
    document.body.style.width = `${window.innerWidth - this.#contentElement.offsetWidth}px`;
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * 重置body宽度
   */
  #resetBodyWidth() {
    document.body.style.width = '100vw';
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * 更新设置（响应新通信架构的设置变更）
   * @param {Object} changes - 变更的设置
   */
  updateSettings(changes) {
    // 处理字体大小变更
    if (changes.fontSize !== undefined) {
      this.#setFontSise({ fontSize: changes.fontSize });
    }

    // 处理暗黑模式变更
    if (changes.darkMode !== undefined) {
      this.#wrapperElement.classList.toggle('dark-mode', changes.darkMode);
    }

    // 处理面板位置变更
    if (changes.panelPosition) {
      Object.assign(this.#contentElement.style, changes.panelPosition);
    }


    console.log(`${CONFIG.LOG_PREFIX} 面板设置已更新:`, Object.keys(changes));
  }

  /**
   * 获取当前面板状态
   * @returns {Object} 面板状态信息
   */
  getStatus() {
    return {
      isShowing: this.#isShowing,
      mode: this.#mode,
      currentText: this.#currentText,
      bookName: this.#bookName,
      authorName: this.#authorName,
      position: {
        left: this.#contentElement.style.left,
        top: this.#contentElement.style.top
      },
      size: {
        width: this.#contentElement.style.width,
        height: this.#contentElement.style.height
      }
    };
  }

  /**
   * 获取 ChatService 实例
   * @returns {ChatService} ChatService 实例
   */
  get chatService() {
    return this.#chatService;
  }

  /**
   * 销毁面板实例
   */
  destroy() {
    // 移除事件监听
    this.#removeShortcuts();
    
    // 清理组件
    this.#chatComponent?.destroy();
    this.#helpModal?.destroy();
    
    // 移除DOM元素
    if (this.#wrapperElement && this.#wrapperElement.parentNode) {
      this.#wrapperElement.parentNode.removeChild(this.#wrapperElement);
    }
    
    // 清理单例和初始化Promise
    AssistantPanel.#instance = null;
    AssistantPanel.#initializationPromise = null;
    
    console.log(`${CONFIG.LOG_PREFIX} 助手面板已销毁`);
  }
} 
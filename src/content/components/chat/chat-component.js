/**
 * @file chat-component.js
 * @description 聊天组件，处理消息显示、加载状态和错误处理
 */

import { CONFIG } from '../../../shared/config.js';
import { marked } from '../../../lib/marked.min.js';

export class ChatComponent {
  /** @type {HTMLElement} 聊天容器元素 */
  #container;
  
  /** @type {string} 当前选中的AI服务商 */
  #currentProvider;
  
  /** @type {Object.<string, string>} 支持的AI服务商配置 */
  static #providers = {
    wenxin: '文心一言',
    qianwen: '通义千问',
    doubao: '豆包',
    deepseek: 'DeepSeek'
  };

  /**
   * @param {HTMLElement} container - 聊天容器元素
   */
  constructor(container) {
    this.#container = container;
    this.#initialize();
  }

  /**
   * 初始化聊天组件
   * @private
   */
  #initialize() {
    this.#initMarkdown();
    this.#bindEvents();
  }

  /**
   * 初始化Markdown渲染
   * @private
   */
  #initMarkdown() {
    marked.setOptions({
      breaks: true,
      gfm: true,
      tables: true,
      smartLists: true,
      smartypants: true,
    });
  }

  /**
   * 绑定事件处理
   * @private
   */
  #bindEvents() {
    // TODO: 实现事件绑定
  }

  /**
   * 添加消息到聊天界面
   * @param {string} content - 消息内容
   * @param {'user'|'assistant'|'error'} type - 消息类型
   */
  appendMessage(content, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    
    messageElement.innerHTML = marked.parse(content);
    
    this.#container.appendChild(messageElement);
    this.scrollToBottom();
    return messageElement;
  }

  /**
   * 显示加载状态
   */
  showLoading() {
    const loadingElement = document.createElement('div');
    loadingElement.classList.add('message', 'loading');
    loadingElement.innerHTML = '正在思考...';
    this.#container.appendChild(loadingElement);
    this.scrollToBottom();
  }

  /**
   * 隐藏加载状态
   */
  hideLoading() {
    const loadingElement = this.#container.querySelector('.message.loading');
    loadingElement && loadingElement.remove();
  }

  /**
   * 显示结果
   * @param {string} result - 结果内容
   */
  showResult(result) {
    this.hideLoading();
    this.appendMessage(result, 'ai');
  }

  /**
   * 显示错误信息
   * @param {string} tip - 错误提示
   * @param {Error} error - 错误对象
   */
  showError(tip, error = new Error()) {
    this.hideLoading();
    console.error(`${CONFIG.LOG_PREFIX} ${tip}:`, error);
    const messageElement = this.appendMessage(`${tip}: ${error.message}`, 'error');
    setTimeout(() => {
      messageElement.remove();
    }, 5000);
  }

  /**
   * 清空聊天记录
   */
  clearMessages() {
    while (this.#container.firstChild) {
      this.#container.removeChild(this.#container.firstChild);
    }
  }

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    this.#container.scrollTop = this.#container.scrollHeight;
  }

  destroy() {
    // noting to do right now
  }
} 
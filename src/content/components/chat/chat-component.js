/**
 * @file chat-component.js
 * @description 聊天组件，处理消息显示、加载状态和错误处理，支持流式显示
 */

import { CONFIG } from '../../../shared/config.js';
import { marked } from '../../../lib/marked.min.js';

export class ChatComponent {
  /** @type {HTMLElement} 聊天容器元素 */
  #container;
  
  /** @type {string} 当前选中的AI服务商 */
  #currentProvider;

  /** @type {HTMLElement} 当前的流式消息元素 */
  #currentStreamElement = null;

  /** @type {string} 累积的流式内容 */
  #accumulatedStreamContent = '';
  
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
   * @param {'user'|'ai'|'error'} type - 消息类型
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
   * 开始流式消息显示
   * @param {string} userMessage - 用户消息（可选）
   * @returns {HTMLElement} 流式消息元素
   */
  startStreamMessage(userMessage = null) {
    // 如果有用户消息，先显示
    if (userMessage) {
      this.appendMessage(userMessage, 'user');
    }

    // 隐藏之前的加载状态
    this.hideLoading();

    // 创建AI消息元素用于流式显示
    this.#currentStreamElement = document.createElement('div');
    this.#currentStreamElement.classList.add('message', 'ai', 'streaming');
    
    // 初始内容为游标
    this.#currentStreamElement.innerHTML = '<span class="stream-cursor">▎</span>';
    
    this.#container.appendChild(this.#currentStreamElement);
    this.#accumulatedStreamContent = '';
    this.scrollToBottom();
    
    return this.#currentStreamElement;
  }

  /**
   * 追加流式数据块
   * @param {string} chunk - 数据块
   */
  appendStreamChunk(chunk) {
    if (!this.#currentStreamElement || !chunk) return;

    this.#accumulatedStreamContent += chunk;
    
    // 渲染Markdown内容
    const renderedContent = marked.parse(this.#accumulatedStreamContent);
    
    // 创建临时容器来解析HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderedContent;
    
    // 在最后一个文本节点后插入游标
    this.#insertCursorAtEnd(tempDiv);
    
    // 更新实际内容
    this.#currentStreamElement.innerHTML = tempDiv.innerHTML;
    
    this.scrollToBottom();
  }

  /**
   * 在内容的最后插入游标
   * @param {HTMLElement} container - 容器元素
   * @private
   */
  #insertCursorAtEnd(container) {
    // 查找最后一个文本节点
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let lastTextNode = null;
    let node;
    while (node = walker.nextNode()) {
      // 只考虑非空的文本节点
      if (node.textContent.trim()) {
        lastTextNode = node;
      }
    }

    if (lastTextNode) {
      // 在最后一个文本节点后插入游标
      const cursor = document.createElement('span');
      cursor.className = 'stream-cursor';
      cursor.textContent = '▎';
      
      lastTextNode.parentNode.insertBefore(cursor, lastTextNode.nextSibling);
    } else {
      // 如果没有文本节点，直接在容器末尾添加游标
      const cursor = document.createElement('span');
      cursor.className = 'stream-cursor';
      cursor.textContent = '▎';
      container.appendChild(cursor);
    }
  }

  /**
   * 完成流式消息显示
   */
  finishStreamMessage() {
    if (!this.#currentStreamElement) return;

    // 移除流式状态
    this.#currentStreamElement.classList.remove('streaming');
    
    // 移除所有游标
    const cursors = this.#currentStreamElement.querySelectorAll('.stream-cursor');
    cursors.forEach(cursor => cursor.remove());

    // 最终渲染完整内容
    if (this.#accumulatedStreamContent) {
      this.#currentStreamElement.innerHTML = marked.parse(this.#accumulatedStreamContent);
    }

    // 清理状态
    this.#currentStreamElement = null;
    this.#accumulatedStreamContent = '';
    
    this.scrollToBottom();
  }

  /**
   * 处理流式错误
   * @param {string} errorMessage - 错误信息
   */
  handleStreamError(errorMessage) {
    if (this.#currentStreamElement) {
      this.#currentStreamElement.classList.remove('streaming');
      this.#currentStreamElement.classList.add('error');
      
      // 移除游标
      const cursors = this.#currentStreamElement.querySelectorAll('.stream-cursor');
      cursors.forEach(cursor => cursor.remove());
      
      this.#currentStreamElement.remove();
      
      // 清理状态
      this.#currentStreamElement = null;
      this.#accumulatedStreamContent = '';
    }
    
    // 也显示一个临时错误提示
    this.showError('请求失败', new Error(errorMessage));
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
    
    // 清理流式状态
    this.#currentStreamElement = null;
    this.#accumulatedStreamContent = '';
  }

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    this.#container.scrollTop = this.#container.scrollHeight;
  }

  /**
   * 获取流式状态
   * @returns {boolean} 是否正在进行流式显示
   */
  isStreaming() {
    return !!this.#currentStreamElement;
  }

  destroy() {
    // 清理流式状态
    this.#currentStreamElement = null;
    this.#accumulatedStreamContent = '';
  }
} 
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

  /** @type {boolean} 是否自动滚动到底部 */
  #autoScroll = true;

  /** @type {boolean} 用户是否正在手动滚动 */
  #userScrolling = false;

  /** @type {number} 滚动检测的防抖定时器 */
  #scrollTimeout = null;

  /** @type {HTMLElement} 新内容提示元素 */
  #newContentIndicator = null;

  /** @type {Function} 滚动事件处理函数引用 */
  #boundHandleScroll = null;

  /** @type {number} indicator显示/隐藏的防抖定时器 */
  #indicatorTimeout = null;
  
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
    this.#initScrollBehavior();
    this.#createNewContentIndicator();
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
   * 初始化滚动行为监听
   * @private
   */
  #initScrollBehavior() {
    this.#boundHandleScroll = this.#handleScroll.bind(this);
    this.#container.addEventListener('scroll', this.#boundHandleScroll);
  }

  /**
   * 创建新内容提示器
   * @private
   */
  #createNewContentIndicator() {
    this.#newContentIndicator = document.createElement('div');
    this.#newContentIndicator.className = 'new-content-indicator';
    this.#newContentIndicator.innerHTML = `
      <button class="scroll-to-bottom-btn" title="滚动到底部">
        <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `;
    this.#newContentIndicator.style.display = 'none';
    
    // 绑定点击事件
    const scrollBtn = this.#newContentIndicator.querySelector('.scroll-to-bottom-btn');
    scrollBtn.addEventListener('click', () => {
      this.#enableAutoScroll();
      this.scrollToBottom();
      this.#hideNewContentIndicator();
    });
    
    // 插入到容器的父元素中
    const parentElement = this.#container.parentElement;
    if (parentElement) {
      parentElement.appendChild(this.#newContentIndicator);
    }
  }

  /**
   * 处理滚动事件
   * @private
   */
  #handleScroll() {
    // 防抖处理
    if (this.#scrollTimeout) {
      clearTimeout(this.#scrollTimeout);
    }

    // 标记用户正在滚动
    this.#userScrolling = true;

    this.#scrollTimeout = setTimeout(() => {
      this.#userScrolling = false;
      this.#checkScrollPosition();
    }, 150);
  }

  /**
   * 检查滚动位置并决定是否自动滚动
   * @private
   */
  #checkScrollPosition() {
    const { scrollTop, scrollHeight, clientHeight } = this.#container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    
    // 如果距离底部小于50px，认为用户在关注底部内容
    if (distanceFromBottom < 50) {
      // 只有在状态发生变化时才更新
      if (!this.#autoScroll) {
        this.#enableAutoScroll();
        this.#hideNewContentIndicator();
      }
    } else {
      // 只有在状态发生变化时才更新
      if (this.#autoScroll) {
        this.#disableAutoScroll();
      }
    }
  }

  /**
   * 启用自动滚动
   * @private
   */
  #enableAutoScroll() {
    this.#autoScroll = true;
  }

  /**
   * 禁用自动滚动
   * @private
   */
  #disableAutoScroll() {
    this.#autoScroll = false;
  }

  /**
   * 显示新内容提示
   * @private
   */
  #showNewContentIndicator() {
    if (this.#newContentIndicator) {
      // 防抖处理：避免频繁显示/隐藏
      if (this.#indicatorTimeout) {
        clearTimeout(this.#indicatorTimeout);
      }
      
      this.#indicatorTimeout = setTimeout(() => {
        if (this.#newContentIndicator) {
          this.#newContentIndicator.style.display = 'flex';
        }
      }, 100);
    }
  }

  /**
   * 隐藏新内容提示
   * @private
   */
  #hideNewContentIndicator() {
    if (this.#newContentIndicator) {
      // 防抖处理：避免频繁显示/隐藏
      if (this.#indicatorTimeout) {
        clearTimeout(this.#indicatorTimeout);
        this.#indicatorTimeout = null;
      }
      
      this.#newContentIndicator.style.display = 'none';
    }
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
    
    // 智能滚动：只在满足条件时才滚动
    this.#smartScroll();
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
    
    // 智能滚动：只在用户没有禁用自动滚动时才滚动
    this.#smartScroll();
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
   * 智能滚动：根据用户行为决定是否滚动
   * @private
   */
  #smartScroll() {
    // 如果用户正在滚动，不要自动滚动
    if (this.#userScrolling) {
      this.#showNewContentIndicator();
      return;
    }

    // 检查是否真的需要滚动（避免频繁的滚动操作）
    const { scrollTop, scrollHeight, clientHeight } = this.#container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    
    // 如果距离底部小于20px，认为已经在底部，不需要滚动
    if (distanceFromBottom < 20) {
      this.#hideNewContentIndicator();
      return;
    }

    // 如果启用了自动滚动，则滚动到底部
    if (this.#autoScroll) {
      this.scrollToBottom();
      this.#hideNewContentIndicator();
    } else {
      // 否则显示新内容提示
      this.#showNewContentIndicator();
    }
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

  /**
   * 获取自动滚动状态
   * @returns {boolean} 是否启用自动滚动
   */
  isAutoScrollEnabled() {
    return this.#autoScroll;
  }

  /**
   * 设置自动滚动状态
   * @param {boolean} enabled - 是否启用自动滚动
   */
  setAutoScroll(enabled) {
    this.#autoScroll = enabled;
    if (enabled) {
      this.#hideNewContentIndicator();
      this.scrollToBottom();
    }
  }

  /**
   * 切换自动滚动状态
   */
  toggleAutoScroll() {
    this.setAutoScroll(!this.#autoScroll);
  }

  destroy() {
    // 清理流式状态
    this.#currentStreamElement = null;
    this.#accumulatedStreamContent = '';
    
    // 清理滚动相关状态
    this.#autoScroll = true;
    this.#userScrolling = false;
    
    // 清理定时器
    if (this.#scrollTimeout) {
      clearTimeout(this.#scrollTimeout);
      this.#scrollTimeout = null;
    }
    
    if (this.#indicatorTimeout) {
      clearTimeout(this.#indicatorTimeout);
      this.#indicatorTimeout = null;
    }
    
    // 移除新内容提示器
    if (this.#newContentIndicator && this.#newContentIndicator.parentElement) {
      this.#newContentIndicator.parentElement.removeChild(this.#newContentIndicator);
      this.#newContentIndicator = null;
    }
    
    // 移除事件监听器
    if (this.#boundHandleScroll) {
      this.#container.removeEventListener('scroll', this.#boundHandleScroll);
      this.#boundHandleScroll = null;
    }
  }
} 
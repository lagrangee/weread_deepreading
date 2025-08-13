/**
 * @file chat-service.js
 * @description AI聊天服务 - 简化版本，优雅处理连接失败，使用Port连接实现流式聊天
 */

import { CONFIG } from '../../shared/config.js';
import { BACKGROUND_MESSAGES, MESSAGE_STATUS } from '../../shared/message-types.js';
import { EventUtils } from '../utils/index.js';

export class ChatService {
  constructor(bookName = '', authorName = '') {
    /** @type {string} 书名 */
    this.#bookName = bookName;
    
    /** @type {string} 作者名 */
    this.#authorName = authorName;
    
    /** @type {Object} 通信桥接实例 */
    this.#bridge = window.contentBridge;
    
    /** @type {Map<string, Array>} 对话历史记录 */
    this.#conversations = new Map();
    
    /** @type {boolean} 服务是否可用 */
    this.#isAvailable = true;

    /** @type {Map<string, Object>} 活跃的流式请求 */
    this.#activeStreams = new Map();

    console.log(`${CONFIG.LOG_PREFIX} ChatService 初始化`, {
      bookName: this.#bookName,
      authorName: this.#authorName,
      bridgeAvailable: !!this.#bridge
    });
  }

  // 私有字段
  #bookName;
  #authorName;
  #bridge;
  #conversations;
  #isAvailable;
  #activeStreams;

  /**
   * 发送流式聊天消息（使用Port连接，结构更简单）
   * @param {Object} options - 聊天选项
   * @param {Object} callbacks - 回调函数集合
   * @returns {Promise<string>} 请求ID，用于标识此次对话
   */
  async sendStreamMessage(options = {}, callbacks = {}) {
    const {
      text,
      type = 'chat',
      provider,
      conversationId = 'default',
      includeHistory = true
    } = options;

    const {
      onStart = () => {},      // 开始回调
      onChunk = () => {},      // 数据块回调
      onComplete = () => {},   // 完成回调
      onError = () => {}       // 错误回调
    } = callbacks;

    // 生成唯一的请求ID
    const requestId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 建立Port连接
      const port = chrome.runtime.connect({ name: BACKGROUND_MESSAGES.CHAT.REQUEST_STREAM });
      
      let accumulatedContent = '';

      // 监听Port消息
      port.onMessage.addListener((data) => {
        if (data.requestId !== requestId) return;

        switch (data.type) {
          case 'start':
            onStart(data);
            // 保存用户消息到历史
            this.addToConversation(conversationId, {
              role: 'user',
              content: text,
              timestamp: Date.now()
            });
            break;

          case 'chunk':
            if (data.text) {
              accumulatedContent += data.text;
              onChunk(data);
            }
            break;

          case 'complete':
            // 保存完整的AI响应到历史
            this.addToConversation(conversationId, {
              role: 'ai',
              content: accumulatedContent,
              timestamp: Date.now()
            });
            onComplete(data);
            this.#activeStreams.delete(requestId);
            port.disconnect();
            break;

          case 'error':
            console.error(`${CONFIG.LOG_PREFIX} 流式请求错误:`, data);
            onError(data);
            this.#activeStreams.delete(requestId);
            port.disconnect();
            break;
        }
      });

      // 监听连接断开
      port.onDisconnect.addListener(() => {
        this.#activeStreams.delete(requestId);
        console.log(`${CONFIG.LOG_PREFIX} 流式连接断开:`, requestId);
      });

      // 保存流信息
      this.#activeStreams.set(requestId, {
        port,
        conversationId,
        userText: text,
        accumulatedContent
      });

      // 构建聊天数据并发送
      const chatData = {
        requestId,
        provider,
        text,
        action: type,
        book: this.#bookName,
        author: this.#authorName,
        conversationId,
        context: includeHistory ? this.getConversationHistory(conversationId) : [],
        timestamp: Date.now()
      };

      console.log(`${CONFIG.LOG_PREFIX} 发送AI流式请求:`, { 
        requestId,
        action: type, 
        provider, 
        textLength: text.length,
        book: this.#bookName,
        author: this.#authorName
      });

      // 通过Port发送请求
      port.postMessage(chatData);

      return requestId;

    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} AI流式聊天请求失败:`, error);
      this.#activeStreams.delete(requestId);
      onError({
        requestId,
        error: error.message,
        timestamp: Date.now(),
        type: 'error'
      });
      throw error;
    }
  }

  /**
   * 取消流式请求
   * @param {string} requestId - 请求ID
   */
  cancelStreamRequest(requestId) {
    const stream = this.#activeStreams.get(requestId);
    if (stream) {
      stream.port.disconnect();
      this.#activeStreams.delete(requestId);
      console.log(`${CONFIG.LOG_PREFIX} 取消流式请求:`, requestId);
    }
  }

  /**
   * 获取活跃的流式请求数量
   * @returns {number} 活跃请求数量
   */
  getActiveStreamCount() {
    return this.#activeStreams.size;
  }

  /**
   * 发送聊天消息（非流式）
   * @param {Object} options - 聊天选项
   * @returns {Promise<Object>} 聊天响应
   */
  async sendMessage(options = {}) {
    const {
      text,
      type = 'chat',
      provider,
      conversationId = 'default',
      includeHistory = true
    } = options;

    // 检查服务可用性
    // if (!this.#isAvailable) {
    //   throw new Error('AI聊天服务当前不可用，请检查网络连接或重新加载页面');
    // }

    try {
      // 构建聊天数据 - 匹配 background ChatService 期望的格式
      const chatData = {
        provider,
        text,
        action: type,  // background 期望的是 action，不是 type
        book: this.#bookName,
        author: this.#authorName,
        conversationId,
        context: includeHistory ? this.getConversationHistory(conversationId) : [],
        timestamp: Date.now()
      };

      console.log(`${CONFIG.LOG_PREFIX} 发送AI请求:`, { 
        action: type, 
        provider, 
        textLength: text.length,
        book: this.#bookName,
        author: this.#authorName
      });

      // 发送到background - 这里可能会抛出错误
      const response = await this.#bridge.sendChatRequest(chatData);
      if (response.status === MESSAGE_STATUS.SUCCESS) {
        // 保存对话历史
        this.addToConversation(conversationId, {
          role: 'user',
          content: response.data.userPrompt,
          timestamp: Date.now()
        });

        this.addToConversation(conversationId, {
          role: 'ai',
          content: response.data.content || response.data.text,
          timestamp: Date.now()
        });

        return {
          success: true,
          userPrompt: response.data.userPrompt,
          content: response.data.content || response.data.text,
          provider: response.data.provider,
          conversationId
        };
      } else {
        throw new Error(response.error || 'AI服务返回错误响应');
      }

    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} AI聊天请求失败:`, error);
      throw error;
    }
  }

  /**
   * 获取对话历史
   * @param {string} conversationId - 对话ID
   * @returns {Array} 对话历史
   */
  getConversationHistory(conversationId) {
    return this.#conversations.get(conversationId) || [];
  }

  /**
   * 添加到对话历史
   * @param {string} conversationId - 对话ID
   * @param {Object} message - 消息对象
   */
  addToConversation(conversationId, message) {
    if (!this.#conversations.has(conversationId)) {
      this.#conversations.set(conversationId, []);
    }
    
    const history = this.#conversations.get(conversationId);
    history.push(message);
    
    // 限制历史记录长度（保持最近20条）
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }

  /**
   * 清空对话历史
   * @param {string} conversationId - 对话ID
   */
  clearConversation(conversationId) {
    this.#conversations.delete(conversationId);
    console.log(`${CONFIG.LOG_PREFIX} 已清空对话历史:`, conversationId);
  }

  /**
   * 清空所有对话历史
   */
  clearAllConversations() {
    this.#conversations.clear();
    console.log(`${CONFIG.LOG_PREFIX} 已清空所有对话历史`);
  }

  /**
   * 检查服务是否可用
   * @returns {boolean} 是否可用
   */
  isAvailable() {
    return this.#isAvailable;
  }

  /**
   * 获取服务状态
   * @returns {Object} 服务状态信息
   */
  getStatus() {
    return {
      isAvailable: this.#isAvailable,
      hasBridge: !!this.#bridge,
      conversationCount: this.#conversations.size,
      activeStreams: this.#activeStreams.size,
      timestamp: Date.now()
    };
  }

  /**
   * 销毁服务
   */
  destroy() {
    this.#isAvailable = false;
    this.#conversations.clear();
    
    // 断开所有活跃的流式连接
    for (const [requestId, stream] of this.#activeStreams) {
      stream.port.disconnect();
    }
    this.#activeStreams.clear();
    
    // 移除事件监听
    EventUtils.off('chat:response');
    
    console.log(`${CONFIG.LOG_PREFIX} ChatService 已销毁`);
  }
}
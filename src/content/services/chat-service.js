/**
 * @file chat-service.js
 * @description AI聊天服务 - 简化版本，优雅处理连接失败
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


  /**
   * 发送聊天消息
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
          content: text,
          timestamp: Date.now()
        });

        this.addToConversation(conversationId, {
          role: 'assistant',
          content: response.data.content || response.data.text,
          timestamp: Date.now()
        });

        return {
          success: true,
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
   * 尝试恢复连接
   * @returns {Promise<boolean>} 是否成功恢复
   */
  async tryReconnect() {
    try {
      // 发送一个简单的测试请求
      await this.#bridge.sendChatRequest({
        text: 'ping',
        type: 'test',
        isTest: true
      });
      
      this.#isAvailable = true;
      console.log(`${CONFIG.LOG_PREFIX} AI服务连接已恢复`);
      return true;
    } catch (error) {
      console.warn(`${CONFIG.LOG_PREFIX} AI服务连接恢复失败:`, error);
      this.#isAvailable = false;
      return false;
    }
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
      timestamp: Date.now()
    };
  }

  /**
   * 销毁服务
   */
  destroy() {
    this.#isAvailable = false;
    this.#conversations.clear();
    
    // 移除事件监听
    EventUtils.off('chat:response');
    
    console.log(`${CONFIG.LOG_PREFIX} ChatService 已销毁`);
  }
} 
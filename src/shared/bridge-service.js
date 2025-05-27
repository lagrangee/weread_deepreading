/**
 * @file bridge-service.js
 * @description 通用通信桥接服务
 */

import { MESSAGE_TYPES, MESSAGE_STATUS, MESSAGE_SOURCE } from './message-types.js';
import { CONFIG } from './config.js';

export class BridgeService {
  constructor(source) {
    this.source = source;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.eventHandlers = new Map();
    this.init();
  }

  /**
   * 初始化通信桥接
   */
  init() {
    // 监听来自其他环境的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.target !== this.source) return;

      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });
  }

  /**
   * 发送消息到指定目标
   * @param {string} type - 消息类型
   * @param {Object} data - 消息数据
   * @param {Object} options - 选项
   * @returns {Promise} 响应Promise
   */
  async sendMessage(type, data = {}, options = {}) {
    const { target, tabId, timeout = 100000 } = options;
    
    const messageId = ++this.messageId;
    const message = {
      id: messageId,
      type,
      data,
      source: this.source,
      target,
      timestamp: Date.now()
    };

    console.log(`${CONFIG.LOG_PREFIX} ${this.source} to ${target} 发送消息:`, {
      id: messageId,
      type,
      hasTabId: !!tabId
    });

    return new Promise((resolve, reject) => {
      // 设置超时处理
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`消息超时: ${type}`));
      }, timeout);

      // 保存请求信息
      this.pendingRequests.set(messageId, {
        resolve, reject,
        timeoutId, type
      });

      // 发送消息
      try {
        if (tabId) {
          // 发送到指定tab的content script
          chrome.tabs.sendMessage(tabId, message, (response = {}) => {
            console.log(`${CONFIG.LOG_PREFIX} ${this.source} to ${target} 收到响应:`, response);
            this.pendingRequests.delete(messageId);
            clearTimeout(timeoutId);
            resolve(response);
          });
        } else {
          // 发送到runtime (background或popup)
          chrome.runtime.sendMessage(message, (response = {}) => {
            console.log(`${CONFIG.LOG_PREFIX} ${this.source} to ${target} 收到响应:`, response);
            this.pendingRequests.delete(messageId);
            clearTimeout(timeoutId);
            resolve(response);
          });
        }
      } catch (error) {
        console.error(`${CONFIG.LOG_PREFIX} BridgeService 发送失败:`, error);
        this.pendingRequests.delete(messageId);
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * 处理接收到的消息
   * @param {Object} message - 消息对象
   * @param {Object} sender - 发送者信息
   * @param {Function} sendResponse - 响应函数
   */
  async handleMessage(message, sender, sendResponse) {
    const { id, type, data, source, target, timestamp } = message;

    try {
      // 处理请求消息
      const handler = this.eventHandlers.get(type);
      if (handler === undefined)  throw new Error(`未知消息类型: ${type}`);
      // 异步处理请求
      handler(data, sender).then(response => {
        console.log(`${CONFIG.LOG_PREFIX} ${this.source} to ${source} 返回响应:`, {
          id,
          type,
          status: response?.status,
          hasError: !!response?.error,
          source: this.source
        });
        
        const responseMessage = {
          id,
          type: `${type}_RESPONSE`,
          status: response.status,
          data: response.data,
          error: response.error?.message,
          source: this.source,
          target: source,
          timestamp: Date.now()
        };
        sendResponse(responseMessage);
      })
    } catch (error) {
      console.error('消息处理错误:', error);
      sendResponse({
        id,
        type: `${type}_RESPONSE`,
        status: MESSAGE_STATUS.ERROR, 
        error: error.message,
        source: this.source,
        target: source,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 注册消息处理器
   * @param {string} type - 消息类型
   * @param {Function} handler - 处理函数
   */
  on(type, handler) {
    this.eventHandlers.set(type, handler);
  }

  /**
   * 移除消息处理器
   * @param {string} type - 消息类型
   */
  off(type) {
    this.eventHandlers.delete(type);
  }

  /**
   * 广播消息到所有content scripts
   * @param {string} type - 消息类型
   * @param {Object} data - 消息数据
   */
  async broadcast(type, data = {}) {
    if (this.source !== MESSAGE_SOURCE.BACKGROUND) {
      throw new Error('只有background可以广播消息');
    }

    const tabs = await chrome.tabs.query({});
    const promises = tabs.map(tab => {
      return this.sendMessage(type, data, { tabId: tab.id })
        .catch(error => {
          console.warn(`广播到tab ${tab.id}失败:`, error);
        });
    });

    await Promise.allSettled(promises);
  }


  /**
   * 销毁服务
   */
  destroy() {
    // 清理未完成的请求
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeoutId);
      request.reject(new Error('服务已销毁'));
    }
    this.pendingRequests.clear();
    this.eventHandlers.clear();
  }
} 
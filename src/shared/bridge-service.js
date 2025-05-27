/**
 * @file bridge-service.js
 * @description 通用通信桥接服务
 */

import { MESSAGE_TYPES, MESSAGE_STATUS, MESSAGE_SOURCE } from './message-types.js';
import { CONFIG } from '../utils/config.js';

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

    console.log(`${CONFIG.LOG_PREFIX} BridgeService 发送消息:`, {
      id: messageId,
      type,
      source: this.source,
      target,
      hasTabId: !!tabId
    });

    return new Promise((resolve, reject) => {
      // 设置超时处理
      const timeoutId = setTimeout(() => {
        console.log(`${CONFIG.LOG_PREFIX} BridgeService 消息超时:`, {
          id: messageId,
          type,
          source: this.source
        });
        this.pendingRequests.delete(messageId);
        reject(new Error(`消息超时: ${type}`));
      }, timeout);

      // 保存请求信息
      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        timeoutId,
        type
      });

      // 发送消息
      try {
        if (tabId) {
          // 发送到指定tab的content script
          chrome.tabs.sendMessage(tabId, message);
        } else {
          // 发送到runtime (background或popup)
          chrome.runtime.sendMessage(message);
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
    const { id, type, data, source, timestamp } = message;

    try {
      // 处理响应消息 - 这些是通过 chrome.runtime.sendMessage 直接返回的
      if (message.isResponse && this.pendingRequests.has(id)) {
        const request = this.pendingRequests.get(id);
        this.pendingRequests.delete(id);
        clearTimeout(request.timeoutId);
        
        console.log(`${CONFIG.LOG_PREFIX} BridgeService 收到响应:`, {
          id,
          type,
          status: data.status,
          hasError: !!data.error,
          source: this.source
        });
        
        if (data.status === MESSAGE_STATUS.ERROR) {
          console.log(`${CONFIG.LOG_PREFIX} BridgeService 处理错误响应:`, data.error);
          request.reject(new Error(data.error));
        } else {
          request.resolve(data);
        }
        return;
      }

      // 处理请求消息
      const handler = this.eventHandlers.get(type);
      if (handler) {
        // 异步处理请求
        handler(data, sender).then(response => {
          console.log(`${CONFIG.LOG_PREFIX} BridgeService 发送响应:`, {
            id,
            type,
            status: response?.status,
            hasError: !!response?.error,
            source: this.source
          });
          
          // 发送响应 - 使用 Chrome 原生的 sendResponse

          const responseMessage = {
            id,
            type: `${type}_RESPONSE`,
            status: response.status,
            data: response.data,
            error: response.error?.message,
            source: this.source,
            target: source,
            isResponse: true,
            timestamp: Date.now()
          };
          sendResponse(responseMessage);
        })
      } else {
        throw new Error(`未知消息类型: ${type}`);
      }
    } catch (error) {
      console.error('消息处理错误:', error);
      sendResponse({
        id,
        type: `${type}_RESPONSE`,
        status: MESSAGE_STATUS.ERROR, 
        error: error.message,
        source: this.source,
        target: source,
        isResponse: true,
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
   * 健康检查
   * @param {string} target - 目标环境
   * @returns {Promise<boolean>} 是否健康
   */
  async healthCheck(target) {
    try {
      await this.sendMessage(MESSAGE_TYPES.SYSTEM.HEALTH_CHECK, {}, { 
        target,
        timeout: 3000 
      });
      return true;
    } catch (error) {
      return false;
    }
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
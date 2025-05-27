/**
 * @file direct-bridge.js
 * @description Popup 和 Content Script 直接通信桥接服务
 */

import { DIRECT_MESSAGES, MESSAGE_STATUS } from './message-types.js';

export class DirectBridge {
  constructor(source) {
    this.source = source;
    this.eventHandlers = new Map();
    this.pendingRequests = new Map();
    this.requestId = 0;

    this.setupListener();
  }

  /**
   * 设置消息监听器
   */
  setupListener() {
    if (this.source === 'popup') {
      // Popup 监听来自 content script 的消息
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.isDirect && message.target === 'popup') {
          this.handleMessage(message, sender).then(sendResponse);
          return true; // 保持连接
        }
      });
    } else if (this.source === 'content') {
      // Content script 监听来自 popup 的消息
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.isDirect && message.target === 'content') {
          this.handleMessage(message, sender).then(sendResponse);
          return true;
        }
      });
    }
  }

  /**
   * 处理接收到的消息
   */
  async handleMessage(message, sender) {
    const { type, data, id, isResponse } = message;

    // 如果是响应消息
    if (isResponse && this.pendingRequests.has(id)) {
      const { resolve } = this.pendingRequests.get(id);
      this.pendingRequests.delete(id);
      resolve(message);
      return;
    }

    // 如果是请求消息
    const handler = this.eventHandlers.get(type);
    if (handler) {
      try {
        const result = await handler(data, sender);
        return {
          status: MESSAGE_STATUS.SUCCESS,
          data: result,
          id,
          isResponse: true,
          isDirect: true
        };
      } catch (error) {
        return {
          status: MESSAGE_STATUS.ERROR,
          error: error.message,
          id,
          isResponse: true,
          isDirect: true
        };
      }
    }

    return {
      status: MESSAGE_STATUS.ERROR,
      error: `未知消息类型: ${type}`,
      id,
      isResponse: true,
      isDirect: true
    };
  }

  /**
   * 发送消息
   * @param {string} type - 消息类型
   * @param {Object} data - 消息数据
   * @param {Object} options - 选项
   * @returns {Promise} 响应
   */
  async sendMessage(type, data = {}, options = {}) {
    const { timeout = 5000 } = options;
    const id = ++this.requestId;

    const message = {
      type,
      data,
      id,
      isDirect: true,
      source: this.source,
      target: this.source === 'popup' ? 'content' : 'popup',
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('直接通信超时'));
      }, timeout);

      // 保存请求信息
      this.pendingRequests.set(id, {
        resolve: (response) => {
          clearTimeout(timeoutId);
          if (response.status === MESSAGE_STATUS.ERROR) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        }
      });

      // 发送消息
      if (this.source === 'popup') {
        // Popup 发送到当前活跃标签页
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, message);
          } else {
            this.pendingRequests.delete(id);
            clearTimeout(timeoutId);
            reject(new Error('无法找到活跃标签页'));
          }
        });
      } else {
        // Content script 发送到 popup
        chrome.runtime.sendMessage(message);
      }
    });
  }

  /**
   * 注册事件处理器
   * @param {string} type - 消息类型
   * @param {Function} handler - 处理函数
   */
  on(type, handler) {
    this.eventHandlers.set(type, handler);
  }

  /**
   * 移除事件处理器
   * @param {string} type - 消息类型
   */
  off(type) {
    this.eventHandlers.delete(type);
  }

  /**
   * 检查是否为直接通信消息
   * @param {string} type - 消息类型
   * @returns {boolean} 是否为直接通信消息
   */
  static isDirectMessage(type) {
    return Object.values(DIRECT_MESSAGES).some(category => 
      Object.values(category).includes(type)
    );
  }

  /**
   * 销毁桥接
   */
  destroy() {
    this.eventHandlers.clear();
    this.pendingRequests.clear();
  }
} 
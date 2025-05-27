/**
 * @file content-bridge.js
 * @description Content Script 通信桥接服务 - 简化版本
 */

import { CONFIG } from '../../shared/config.js';
import { BridgeService } from '../../shared/bridge-service.js';
import { BACKGROUND_MESSAGES, POPUP_MESSAGES, MESSAGE_STATUS } from '../../shared/message-types.js';
import { EventUtils } from '../utils/index.js';

export class ContentBridge {
  #bridge = null;
  constructor() {
    this.#bridge = new BridgeService('content');
    this.setupRoutes();
  }

  /**
   * 设置消息路由
   */
  setupRoutes() {
    this.#bridge.on(POPUP_MESSAGES.SETTINGS.CHANGED, async (changes, sender) => {
      if (changes.provider) {
        EventUtils.emit('update:provider', changes.provider);
      }
      return { status: MESSAGE_STATUS.SUCCESS }
    });
  }

  /**
   * 发送聊天请求（通过 background）
   * @param {Object} data - 聊天数据
   * @returns {Promise} 响应
   */
  async sendChatRequest(data) {
    try {
      const response = await this.#bridge.sendMessage(BACKGROUND_MESSAGES.CHAT.REQUEST, data, { target: 'background' });
      return response;
    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} ContentBridge 发送失败:`, error);
      throw error;
    }
  }

  async testApiKey(provider, apiKey) {
    try {
      const response = await this.#bridge.sendMessage(BACKGROUND_MESSAGES.CHAT.TEST_API_KEY, { provider, apiKey },{ target: 'background' });
      return response;
    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} ContentBridge 测试API Key失败:`, error);
      throw error;
    } 
  }

  /**
   * 监听事件
   * @param {string} event - 事件名
   * @param {Function} handler - 处理函数
   */
  on(event, handler) {
    document.addEventListener(event, handler);
  }

  /**
   * 移除事件监听
   * @param {string} event - 事件名
   * @param {Function} handler - 处理函数
   */
  off(event, handler) {
    document.removeEventListener(event, handler);
  }

  /**
   * 检查是否已连接（简化版本）
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    // 简单检查bridge是否存在，不进行复杂的连接测试
    return !!this.#bridge;
  }

  /**
   * 检查AI服务是否可用
   * @returns {Promise<boolean>} 是否可用
   */
  async isAIServiceAvailable() {
    try {
      // 发送一个简单的测试请求
      await this.#bridge.sendMessage(
        'PING', 
        { test: true },
        { timeout: 3000 }
      );
      return true;
    } catch (error) {
      console.warn(`${CONFIG.LOG_PREFIX} AI服务不可用:`, error);
      return false;
    }
  }

  /**
   * 销毁桥接
   */
  destroy() {
    this.#bridge.destroy();
  }
} 
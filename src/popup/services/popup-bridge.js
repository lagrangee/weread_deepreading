/**
 * @file popup-bridge.js
 * @description Popup 通信桥接服务 - 简化版本
 */

import { BridgeService } from '../../shared/bridge-service.js';
import { DirectBridge } from '../../shared/direct-bridge.js';
import { BACKGROUND_MESSAGES, DIRECT_MESSAGES, MESSAGE_STATUS } from '../../shared/message-types.js';

export class PopupBridge {
  constructor() {
    // Background 通信桥接（用于 AI 调用）
    this.backgroundBridge = new BridgeService('popup');
    
    // 直接通信桥接（用于设置管理和状态查询）
    this.directBridge = new DirectBridge('popup');
    
    this.currentTab = null;
    this.setupRoutes();
    this.getCurrentTab();
  }

  /**
   * 设置消息路由
   */
  setupRoutes() {
    // 直接通信路由（设置变更通知）
    this.directBridge.on(DIRECT_MESSAGES.SETTINGS.CHANGED, async (data) => {
      this.notifySettingsChanged(data.changes);
      return { status: MESSAGE_STATUS.SUCCESS };
    });
  }

  /**
   * 获取当前标签页
   */
  async getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];
    } catch (error) {
      console.error('获取当前标签页失败:', error);
    }
  }

  /**
   * 检查页面状态
   * @returns {Promise<Object>} 页面状态
   */
  async getPageStatus() {
    if (!this.currentTab) {
      await this.getCurrentTab();
    }

    if (!this.currentTab?.url?.includes('weread.qq.com')) {
      return {
        isWereadPage: false,
        contentScriptActive: false,
        message: '请在微信读书页面使用此插件'
      };
    }
  }

  /**
   * 获取设置（通过 Content Script）
   * @param {Array} keys - 设置键
   * @returns {Promise<Object>} 设置数据
   */
  async getSettings(keys = []) {
    const response = await this.directBridge.sendMessage(
      DIRECT_MESSAGES.SETTINGS.GET, 
      { keys }
    );
    return response.data;
  }

  /**
   * 保存设置（通过 Content Script）
   * @param {Object} settings - 设置数据
   * @returns {Promise<boolean>} 是否成功
   */
  async saveSettings(settings) {
    try {
      await this.directBridge.sendMessage(
        DIRECT_MESSAGES.SETTINGS.SET, 
        { settings }
      );
      return true;
    } catch (error) {
      console.error('保存设置失败:', error);
      return false;
    }
  }

  /**
   * 测试 API 连接（通过 Background）
   * @param {string} provider - 提供商
   * @param {string} apiKey - API Key
   * @returns {Promise<Object>} 测试结果
   */
  async testApiConnection(provider, apiKey) {
    try {
      const response = await this.backgroundBridge.sendMessage(
        BACKGROUND_MESSAGES.CHAT.REQUEST,
        {
          provider,
          apiKey,
          text: 'test',
          isTest: true
        }
      );

      return {
        success: true,
        message: 'API 连接测试成功',
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 通知设置变更（自定义事件）
   * @param {Object} changes - 变更的设置
   */
  notifySettingsChanged(changes) {
    const event = new CustomEvent('settingsChanged', { detail: changes });
    document.dispatchEvent(event);
  }


  /**
   * 监听事件
   * @param {string} eventName - 事件名
   * @param {Function} handler - 处理函数
   */
  on(eventName, handler) {
    document.addEventListener(eventName, handler);
  }

  /**
   * 移除事件监听
   * @param {string} eventName - 事件名
   * @param {Function} handler - 处理函数
   */
  off(eventName, handler) {
    document.removeEventListener(eventName, handler);
  }

  /**
   * 销毁桥接
   */
  destroy() {
    this.backgroundBridge.destroy();
    this.directBridge.destroy();
  }
} 
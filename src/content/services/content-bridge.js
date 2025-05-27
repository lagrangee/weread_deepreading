/**
 * @file content-bridge.js
 * @description Content Script 通信桥接服务 - 简化版本
 */

import { CONFIG } from '../../utils/config.js';
import { BridgeService } from '../../shared/bridge-service.js';
import { DirectBridge } from '../../shared/direct-bridge.js';
import { BACKGROUND_MESSAGES, DIRECT_MESSAGES, MESSAGE_STATUS } from '../../shared/message-types.js';
import { EventUtils } from '../utils/index.js';

export class ContentBridge {
  constructor() {
    // Background 通信桥接（用于 AI 聊天）
    this.backgroundBridge = new BridgeService('content');
    
    // 直接通信桥接（用于设置管理和状态查询）
    this.directBridge = new DirectBridge('content');
    
    this.setupRoutes();
  }

  /**
   * 设置消息路由
   */
  setupRoutes() {
    // Background 消息路由（AI 响应）
    this.backgroundBridge.on(BACKGROUND_MESSAGES.CHAT.RESPONSE, async (data) => {
      EventUtils.emit('chat:response', data);
      return { status: MESSAGE_STATUS.SUCCESS };
    });

    // 直接通信路由（设置管理）
    this.directBridge.on(DIRECT_MESSAGES.SETTINGS.GET, async (data) => {
      try {
        const settings = await this.getSettingsFromStorage(data.keys);
        return {
          status: MESSAGE_STATUS.SUCCESS,
          data: settings
        };
      } catch (error) {
        return {
          status: MESSAGE_STATUS.ERROR,
          error: error.message
        };
      }
    });

    this.directBridge.on(DIRECT_MESSAGES.SETTINGS.SET, async (data) => {
      try {
        await this.saveSettingsToStorage(data.settings);
        
        // 通知设置变更
        EventUtils.emit('settings:changed', data.settings);
        
        return {
          status: MESSAGE_STATUS.SUCCESS
        };
      } catch (error) {
        return {
          status: MESSAGE_STATUS.ERROR,
          error: error.message
        };
      }
    });

    // 系统状态查询
    this.directBridge.on(DIRECT_MESSAGES.SYSTEM.STATUS, async () => {
      try {
        const panel = document.querySelector('.assistant-panel');
        const settings = await this.getSettingsFromStorage(['currentProvider']);
        
        return {
          status: MESSAGE_STATUS.SUCCESS,
          data: {
            panelActive: panel?.classList.contains('show') || false,
            currentProvider: settings.currentProvider,
            url: window.location.href,
            timestamp: Date.now()
          }
        };
      } catch (error) {
        return {
          status: MESSAGE_STATUS.ERROR,
          error: error.message
        };
      }
    });
  }

  /**
   * 从 chrome.storage 获取设置
   * @param {Array} keys - 设置键
   * @returns {Promise<Object>} 设置数据
   */
  async getSettingsFromStorage(keys = []) {
    try {
      const storageKeys = keys.length > 0 ? keys : null;
      const result = await chrome.storage.sync.get(storageKeys);
      
      // 合并默认设置
      const defaultSettings = this.getDefaultSettings();
      const settings = { ...defaultSettings };
      
      Object.keys(result).forEach(key => {
        if (result[key] !== undefined) {
          if (typeof defaultSettings[key] === 'object' && 
              defaultSettings[key] !== null && 
              !Array.isArray(defaultSettings[key])) {
            settings[key] = { ...defaultSettings[key], ...result[key] };
          } else {
            settings[key] = result[key];
          }
        }
      });

      return keys.length > 0 
        ? this.filterByKeys(settings, keys)
        : settings;
    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} 获取设置失败:`, error);
      throw error;
    }
  }

  /**
   * 保存设置到 chrome.storage
   * @param {Object} settings - 设置数据
   * @returns {Promise<void>}
   */
  async saveSettingsToStorage(settings) {
    try {
      await chrome.storage.sync.set(settings);
      console.log(`${CONFIG.LOG_PREFIX} 设置已保存:`, Object.keys(settings));
    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} 保存设置失败:`, error);
      throw error;
    }
  }

  /**
   * 获取默认设置
   * @returns {Object} 默认设置对象
   */
  getDefaultSettings() {
    return {
      // AI 服务配置
      currentProvider: 'qianwen',
      apiKeys: {},
      
      // 面板配置
      panelPosition: { left: '50px', top: '50px' },
      panelSize: { width: '400px', height: '600px' },
      pinPosition: { right: '20px', bottom: '20px' },
      
      // 界面配置
      fontSize: 14,
      darkMode: false,
      isInlineMode: false,
      
      // 功能配置
      autoSave: true,
      showNotifications: true,
      
      // 其他配置
      lastUsed: Date.now(),
      version: '1.0.0'
    };
  }

  /**
   * 按键名过滤设置
   * @param {Object} settings - 完整设置
   * @param {Array} keys - 需要的键名
   * @returns {Object} 过滤后的设置
   */
  filterByKeys(settings, keys) {
    const filtered = {};
    keys.forEach(key => {
      if (settings[key] !== undefined) {
        filtered[key] = settings[key];
      }
    });
    return filtered;
  }

  /**
   * 发送聊天请求（通过 background）
   * @param {Object} data - 聊天数据
   * @returns {Promise} 响应
   */
  async sendChatRequest(data) {
    console.log(`${CONFIG.LOG_PREFIX} ContentBridge 发送聊天请求:`, data);
    
    try {
      // 直接使用 Chrome 原生消息机制，简单高效
      const response = await chrome.runtime.sendMessage({
        type: BACKGROUND_MESSAGES.CHAT.REQUEST,
        data: data
      });
      
      console.log(`${CONFIG.LOG_PREFIX} ContentBridge 收到响应:`, response);
      return response;
    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} ContentBridge 发送失败:`, error);
      throw error;
    }
  }

  async testApiKey(provider, apiKey) {
    // return await this.backgroundBridge.sendMessage(BACKGROUND_MESSAGES.CHAT.TEST_API_KEY, { provider, apiKey });
    try {
      const response = await chrome.runtime.sendMessage({
        type: BACKGROUND_MESSAGES.CHAT.TEST_API_KEY,
        data: { provider, apiKey }
      });
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
    return !!this.backgroundBridge && !!this.directBridge;
  }

  /**
   * 检查AI服务是否可用
   * @returns {Promise<boolean>} 是否可用
   */
  async isAIServiceAvailable() {
    try {
      // 发送一个简单的测试请求
      await this.backgroundBridge.sendMessage(
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
    this.backgroundBridge.destroy();
    this.directBridge.destroy();
  }
} 
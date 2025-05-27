/**
 * @file popup.js
 * @description 微信读书助手弹出窗口管理 - 简化架构版本
 */

import { BridgeService } from '../shared/bridge-service.js';
import { SettingsService } from '../shared/settings-service.js';
import { BACKGROUND_MESSAGES, POPUP_MESSAGES, MESSAGE_STATUS } from '../shared/message-types.js';
import { CONFIG } from '../shared/config.js';

class PopupManager {
  #settingsService = null;
  #bridge = null;
  #currentProvider = null;
  #providers = null;
  #apiKeys = null;
  #providerSelect = null;

  constructor() {
    this.#bridge = new BridgeService('popup');
    this.#settingsService = new SettingsService();
    this.#providers = CONFIG.PROVIDERS;
    this.#apiKeys = {};
    this.#providerSelect = document.getElementById('currentProvider');
    this.init();
  }

  async init() {
    try {
      // this.bridge = new PopupBridge();
      
      await this.#loadConfig();
      this.#displaySavedInfos();
      this.bindEvents();
      this.setupBridgeListeners();
      
      console.log('Popup 初始化成功');
    } catch (error) {
      console.error('Popup 初始化失败:', error);
      this.showStatus('初始化失败：' + error.message, 'error');
    }
  }
  /**
   * 设置桥接事件监听
   */
  setupBridgeListeners() {
  }

  #displaySavedInfos() {
    Object.keys(this.#providers).forEach(provider => {
      const input = document.getElementById(`${provider}Key`);
      if (input && this.#apiKeys[provider]) {
        input.value = this.#apiKeys[provider];
      }
    });
    this.#providerSelect.value = this.#currentProvider || CONFIG.DEFAULT_PROVIDER;
  }

  async #loadConfig() {
    this.#apiKeys = await this.#settingsService.loadAPIKeys();
    this.#currentProvider = await this.#settingsService.loadProvider();
  }

  bindEvents() {
    // 保存配置按钮
    const saveBtn = document.getElementById('saveConfig');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveConfig();
      });
    }

    // 测试按钮
    document.querySelectorAll('.test-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const provider = e.target.dataset.provider;
        const key = document.getElementById(`${provider}Key`).value;
        await this.testApiKey(provider, key);
      });
    });

    this.#providerSelect.addEventListener('change', (e) => {
      this.#currentProvider = e.target.value;
    });
  }

  /**
   * 保存设置
   */
  async saveConfig() {
    // 收集所有非空的 API Keys
    const apiKeys = {};
    Object.keys(this.#providers).forEach(provider => {
      const input = document.getElementById(`${provider}Key`);
      const key = input?.value.trim();
      if (key) {
        apiKeys[provider] = key;
      }
    });

    // 验证当前选择的服务商是否有对应的 API Key
    if (!apiKeys[this.#currentProvider]) {
      this.showStatus(`请先设置 ${this.getProviderName(this.#currentProvider)} 的 API Key`, 'error');
      return;
    }

    await this.#settingsService.saveAPIKeys(apiKeys);
    await this.#settingsService.saveProvider(this.#currentProvider);
    
    this.showStatus('设置已保存', 'success');
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await this.#bridge.sendMessage(POPUP_MESSAGES.SETTINGS.CHANGED, { provider: this.#currentProvider }, { target: 'content', tabId: tabs[0].id });
    }
    window.close();
  }

  /**
   * 测试 API Key
   * @param {string} provider - 服务提供商
   * @param {string} key - API Key
   */
  async testApiKey(provider, apiKey) {
    if (!apiKey) {
      this.showStatus(`请输入 ${this.getProviderName(provider)} 的 API Key`, 'error');
      return;
    }

    const testBtn = document.querySelector(`[data-provider="${provider}"]`);
    const originalText = testBtn.textContent;
    testBtn.textContent = '测试中...';
    testBtn.disabled = true;

    try {
      // 发送测试请求
      const response = await this.#bridge.sendMessage(BACKGROUND_MESSAGES.CHAT.TEST_API_KEY, { provider, apiKey }, { target: 'background' });

      if (response.status === MESSAGE_STATUS.SUCCESS) {
        this.showStatus(`${this.getProviderName(provider)} API Key 测试成功`, 'success');
      } else {
        throw new Error(response.error || 'API Key 测试失败');
      }
    } catch (error) {
      this.showStatus(`测试失败：${error.message}`, 'error');
    } finally {
      testBtn.textContent = originalText;
      testBtn.disabled = false;
    }
  }


  getProviderName(provider) {
    return this.#providers[provider] || provider;
  }

  showStatus(message, type) {
    const statusEl = document.getElementById('statusMsg');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    
    // 3秒后自动清除成功消息，错误消息需要手动关闭
    if (type === 'success') {
      setTimeout(() => {
        if (statusEl.textContent === message) {
          statusEl.textContent = '';
          statusEl.className = 'status-message';
        }
      }, 3000);
    }
  }

  /**
   * 清理资源
   */
  destroy() {
    this.#bridge?.destroy();
  }
}

// 初始化
function initPopup() {
  const manager = new PopupManager();
  window.addEventListener('beforeunload', () => {
    manager.destroy();
  });
}

initPopup();
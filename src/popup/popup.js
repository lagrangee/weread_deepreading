/**
 * @file popup.js
 * @description 微信读书助手弹出窗口管理 - 稳定重塑版
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
  #models = null;
  #temperatures = null;
  #providerSelect = null;
  #saveDebounceTimer = null;

  constructor() {
    this.#bridge = new BridgeService('popup');
    this.#settingsService = new SettingsService();
    this.#providers = CONFIG.PROVIDERS;
    this.#apiKeys = {};
    this.#models = {};
    this.#temperatures = {};
    this.#providerSelect = document.getElementById('currentProvider');
    this.init();
  }

  async init() {
    try {
      console.log('Popup 开始初始化...');
      await this.#loadConfig();
      this.#displaySavedInfos();
      this.#initTabs();
      this.bindEvents();
      this.#checkOnboarding();
      await this.#updateStatusIndicators();
      console.log('Popup 初始化成功');
    } catch (error) {
      console.error('Popup 初始化失败:', error);
    }
  }

  #initTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tabId = item.dataset.tab;
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
          }
        });
      });
    });
  }

  #displaySavedInfos() {
    Object.keys(this.#providers).forEach(provider => {
      const apiConfig = CONFIG.API_ENDPOINTS[provider];

      const keyInput = document.getElementById(`${provider}Key`);
      if (keyInput && this.#apiKeys?.[provider]) {
        keyInput.value = this.#apiKeys[provider];
      }

      const modelInput = document.getElementById(`${provider}Model`);
      if (modelInput) {
        if (apiConfig?.model) {
          modelInput.placeholder = `默认: ${apiConfig.model}`;
        }
        if (this.#models?.[provider]) {
          modelInput.value = this.#models[provider];
        }
      }

      // Temperature
      const tempInput = document.getElementById(`${provider}Temp`);
      if (tempInput) {
        tempInput.placeholder = CONFIG.DEFAULT_TEMPERATURE || '0.7';
        if (this.#temperatures?.[provider] !== undefined) {
          tempInput.value = this.#temperatures[provider];
        }
      }

      // 动态同步模型列表链接
      const modelLink = document.querySelector(`.model-list-link[data-provider="${provider}"]`);
      if (modelLink && apiConfig?.modelListUrl) {
        modelLink.href = apiConfig.modelListUrl;
      }
    });

    if (this.#providerSelect) {
      this.#providerSelect.value = this.#currentProvider || CONFIG.DEFAULT_PROVIDER;
    }
  }

  async #loadConfig() {
    this.#apiKeys = (await this.#settingsService.loadAPIKeys()) || {};
    this.#models = (await this.#settingsService.loadModels()) || {};
    this.#temperatures = (await this.#settingsService.loadTemperatures()) || {};
    this.#currentProvider = await this.#settingsService.loadProvider();
  }

  bindEvents() {
    // 监听所有输入框的实时变动
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
      const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventType, () => {
        // 更新内存状态
        if (input.id === 'currentProvider') {
          this.#currentProvider = input.value;
        }
        // 触发防抖保存
        this.#debounceSave();
      });
    });

    // 测试按钮 (保持独立，不计入自动保存)
    document.querySelectorAll('.test-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const provider = e.currentTarget.dataset.provider;
        const keyInput = document.getElementById(`${provider}Key`);

        const key = keyInput?.value.trim() || '';

        await this.testApiKey(provider, key);
      });
    });

    // 引导对话框按钮
    const onboardingBtn = document.querySelector('.onboarding-btn');
    if (onboardingBtn) {
      onboardingBtn.addEventListener('click', () => {
        const banner = document.getElementById('onboardingBanner');
        if (banner) {
          banner.classList.remove('show');
        }
        const modelsTab = document.querySelector('.nav-item[data-tab="models"]');
        if (modelsTab) {
          modelsTab.click();
        }
      });
    }
  }

  /**
   * 防抖保存逻辑
   */
  #debounceSave() {
    if (this.#saveDebounceTimer) {
      clearTimeout(this.#saveDebounceTimer);
    }

    // 显示正在保存状态
    const statusEl = document.getElementById('autoSaveStatus');
    if (statusEl) {
      statusEl.classList.add('saving');
      statusEl.querySelector('span').textContent = '正在保存...';
    }

    this.#saveDebounceTimer = setTimeout(async () => {
      await this.saveConfig();
      await this.#updateStatusIndicators(); // 每次保存（Key变动）后同步灯光
      if (statusEl) {
        statusEl.classList.remove('saving');
        statusEl.querySelector('span').textContent = '设置已实时同步';
      }
    }, 1000); // 1秒防抖
  }

  async saveConfig() {
    try {
      const apiKeys = {};
      const models = {};
      const temperatures = {};

      Object.keys(this.#providers).forEach(provider => {
        const key = document.getElementById(`${provider}Key`)?.value.trim();
        if (key) {
          apiKeys[provider] = key;
        }

        const model = document.getElementById(`${provider}Model`)?.value.trim();
        if (model) {
          models[provider] = model;
        }

        const temp = document.getElementById(`${provider}Temp`)?.value.trim();
        if (temp !== '') {
          temperatures[provider] = Number(temp);
        }
      });

      // 更新内存中的缓存，防止测试路径使用的是旧内存值
      this.#apiKeys = apiKeys;
      this.#models = models;
      this.#temperatures = temperatures;

      await Promise.all([
        this.#settingsService.saveAPIKeys(apiKeys),
        this.#settingsService.saveModels(models),
        this.#settingsService.saveTemperatures(temperatures),
        this.#settingsService.saveProvider(this.#currentProvider),
      ]);

      // 通知所有已打开的微信读书标签页
      const tabs = await chrome.tabs.query({ url: '*://weread.qq.com/*' });
      tabs.forEach(tab => {
        this.#bridge
          .sendMessage(
            POPUP_MESSAGES.SETTINGS.CHANGED,
            { provider: this.#currentProvider },
            { target: 'content', tabId: tab.id }
          )
          .catch(() => {});
      });
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  }

  async testApiKey(provider, apiKey) {
    if (!apiKey) {
      this.showTestStatus(provider, `请填写 Key`, 'error');
      return;
    }

    const modelInput = document.getElementById(`${provider}Model`);
    const tempInput = document.getElementById(`${provider}Temp`);
    const model = modelInput?.value.trim() || undefined;
    const temperature = tempInput?.value.trim() !== '' ? Number(tempInput.value) : undefined;

    const testBtn = document.querySelector(`.test-btn[data-provider="${provider}"]`);
    const originalText = testBtn?.textContent;

    if (testBtn) {
      testBtn.textContent = '测试中...';
      testBtn.disabled = true;
    }

    this.showTestStatus(provider, '正在建立连接...', 'testing');

    try {
      const response = await this.#bridge.sendMessage(
        BACKGROUND_MESSAGES.CHAT.TEST_API_KEY,
        {
          provider,
          apiKey,
          model,
          temperature,
        },
        { target: 'background' }
      );

      const testResults = await this.#settingsService.loadTestResults();
      if (response && response.status === MESSAGE_STATUS.SUCCESS) {
        this.showTestStatus(provider, response.message || '连接正常', 'success');
        testResults[provider] = 'success';
      } else {
        testResults[provider] = 'error';
        throw new Error(response?.error || '连接失败');
      }
      await this.#settingsService.saveTestResults(testResults);
      await this.#updateStatusIndicators();
    } catch (error) {
      this.showTestStatus(provider, `失败: ${error.message}`, 'error');
      const testResults = (await this.#settingsService.loadTestResults()) || {};
      testResults[provider] = 'error';
      await this.#settingsService.saveTestResults(testResults);
      await this.#updateStatusIndicators();
    } finally {
      if (testBtn) {
        testBtn.textContent = originalText;
        testBtn.disabled = false;
      }
    }
  }

  /**
   * 更新各服务商的状态指示灯颜色
   */
  async #updateStatusIndicators() {
    const testResults = (await this.#settingsService.loadTestResults()) || {};
    const apiKeys = (await this.#settingsService.loadAPIKeys()) || {};

    Object.keys(this.#providers).forEach(provider => {
      const indicator = document.querySelector(`.status-indicator[data-provider="${provider}"]`);
      if (!indicator) {
        return;
      }

      const key = apiKeys[provider];
      const result = testResults[provider];

      // 重置类名
      indicator.className = 'status-indicator';

      if (!key) {
        // 没有配置 Key
        indicator.classList.add('none');
      } else if (result === 'success') {
        // 配置且成功
        indicator.classList.add('ready');
      } else if (result === 'error') {
        // 配置但失败
        indicator.classList.add('fail');
      } else {
        // 有 Key 但未测试过，默认显示灰色或某种准备状态
        indicator.classList.add('none');
      }
    });
  }

  showTestStatus(provider, message, type) {
    const statusEl = document.getElementById(`${provider}Status`);
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message;
    statusEl.className = `test-status ${type}`;

    if (type !== 'testing') {
      setTimeout(() => {
        if (statusEl.textContent === message) {
          statusEl.textContent = '';
          statusEl.className = 'test-status';
        }
      }, 5000);
    }
  }

  getProviderName(provider) {
    return this.#providers[provider] || provider;
  }

  showStatus(message, type) {
    // 适配原来的 showStatus 方法，现在改用控制台日志或微弱的状态反馈
    console.log(`[Status] ${type}: ${message}`);
  }

  #checkOnboarding() {
    const hasAnyKey = Object.values(this.#apiKeys).some(key => key && key.trim().length > 0);
    if (!hasAnyKey) {
      const banner = document.getElementById('onboardingBanner');
      if (banner) {
        setTimeout(() => banner.classList.add('show'), 800);
      }
    }
  }
}

// 启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PopupManager());
} else {
  new PopupManager();
}

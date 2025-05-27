/**
 * @file help-modal.js
 * @description 帮助模态框组件
 */

import { CONFIG } from '../../../shared/config.js';
import { MESSAGE_STATUS } from '../../../shared/message-types.js';
import { EventUtils } from '../../utils/event-utils.js';

export class HelpModal {
  /** @type {HTMLElement} 模态框元素 */
  #modalElement;
  
  /** @type {HTMLElement} 关闭按钮 */
  #closeButton;
  
  /** @type {HTMLElement} 配置区域 */
  #configSection;

  /** @type {HTMLSelectElement} 服务商选择器 */
  #providerSelect;

  /** @type {HTMLButtonElement} 保存按钮 */
  #saveButton;

  /** @type {HTMLElement} 状态消息区域 */
  #statusMessage;

  /** @type {Map<string, HTMLInputElement>} API Key 输入框映射 */
  #apiKeyInputs;

  /** @type {Map<string, HTMLButtonElement>} 测试按钮映射 */
  #testButtons;

  /** @type {Object} 当前设置 */
  #currentSettings;

  /**
   * @param {HTMLElement} modalElement - 模态框元素
   */
  constructor(modalElement) {
    this.#modalElement = modalElement;
    this.#apiKeyInputs = new Map();
    this.#testButtons = new Map();
    this.#currentSettings = {};
    this.#initialize();
    this.isShowing = false;
  }

  /**
   * 初始化帮助模态框
   * @private
   */
  #initialize() {
    this.#closeButton = this.#modalElement.querySelector('.help-close');
    this.#configSection = this.#modalElement.querySelector('.model-config');
    this.#providerSelect = this.#modalElement.querySelector('#modalCurrentProvider');
    this.#saveButton = this.#modalElement.querySelector('#modalSaveConfig');
    this.#statusMessage = this.#modalElement.querySelector('#modalStatusMsg');
    
    this.#initApiKeyInputs();
    this.#bindEvents();
  }

  /**
   * 初始化 API Key 输入框
   * @private
   */
  #initApiKeyInputs() {
    // 初始化所有 API Key 输入框和测试按钮
    const providers = ['wenxin', 'qianwen', 'doubao', 'deepseek'];
    
    providers.forEach(provider => {
      const input = this.#modalElement.querySelector(`#modal${provider.charAt(0).toUpperCase() + provider.slice(1)}Key`);
      const testBtn = this.#modalElement.querySelector(`[data-provider="${provider}"]`);
      
      if (input) {
        this.#apiKeyInputs.set(provider, input);
      }
      if (testBtn) {
        this.#testButtons.set(provider, testBtn);
      }
    });
  }

  /**
   * 绑定事件
   * @private
   */
  #bindEvents() {
    // 关闭按钮事件
    this.#closeButton.addEventListener('click', (e) => this.hide());
    this.#modalElement.addEventListener('click', (e) => this.hide(e));

    // 保存设置按钮事件
    this.#saveButton.addEventListener('click', () => this.#saveSettings());

    // 服务商选择器事件
    this.#providerSelect.addEventListener('change', () => this.#onProviderChange());

    // 测试按钮事件
    this.#testButtons.forEach((button, provider) => {
      button.addEventListener('click', () => this.#testApiKey(provider));
    });

    // API Key 输入框事件
    this.#apiKeyInputs.forEach((input, provider) => {
      input.addEventListener('input', () => this.#onApiKeyChange(provider));
    });
  }

  #handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this.hide();
    }
  }

  /**
   * 加载模型配置
   * @private
   */
  async #loadModelConfig() {
    try {
      this.#showStatus('正在加载配置...', 'info');
      
      // 通过 ContentBridge 获取设置
      const settings = await window.contentBridge.getSettingsFromStorage([
        'provider', 
        'apiKeys'
      ]);
      
      this.#currentSettings = settings;
      
      // 更新界面
      this.#updateUI(settings);
      this.#showStatus('配置加载完成', 'success');
      
      console.log(`${CONFIG.LOG_PREFIX} 帮助模态框配置加载完成:`, settings);
    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} 加载配置失败:`, error);
      this.#showStatus('加载配置失败', 'error');
    }
  }

  /**
   * 更新界面
   * @private
   * @param {Object} settings - 设置对象
   */
  #updateUI(settings) {
    // 更新当前服务商
    if (settings.provider) {
      this.#providerSelect.value = settings.provider;
    }

    // 更新 API Keys
    if (settings.apiKeys) {
      this.#apiKeyInputs.forEach((input, provider) => {
        const apiKey = settings.apiKeys[provider];
        if (apiKey) {
          input.value = apiKey;
          // 显示部分 API Key（隐私保护）
          input.value = this.#maskApiKey(apiKey);
          input.dataset.fullKey = apiKey; // 保存完整 key
        }
      });
    }

    // 更新测试按钮状态
    this.#updateTestButtonStates();
  }

  /**
   * 掩码 API Key 显示
   * @private
   * @param {string} apiKey - 完整的 API Key
   * @returns {string} 掩码后的 API Key
   */
  #maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) return apiKey;
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(Math.min(apiKey.length - 8, 20));
    return `${start}${middle}${end}`;
  }

  /**
   * 服务商变更事件
   * @private
   */
  #onProviderChange() {
    const selectedProvider = this.#providerSelect.value;
    console.log(`${CONFIG.LOG_PREFIX} 服务商变更为:`, selectedProvider);
    
    // 标记设置已变更
    this.#markSettingsChanged();
  }

  /**
   * API Key 变更事件
   * @private
   * @param {string} provider - 服务商
   */
  #onApiKeyChange(provider) {
    const input = this.#apiKeyInputs.get(provider);
    if (input) {
      // 保存完整的 key
      input.dataset.fullKey = input.value;
      this.#markSettingsChanged();
      this.#updateTestButtonStates();
    }
  }

  /**
   * 标记设置已变更
   * @private
   */
  #markSettingsChanged() {
    this.#saveButton.textContent = '保存设置 *';
    this.#saveButton.classList.add('changed');
  }

  /**
   * 更新测试按钮状态
   * @private
   */
  #updateTestButtonStates() {
    this.#testButtons.forEach((button, provider) => {
      const input = this.#apiKeyInputs.get(provider);
      const hasKey = input && (input.dataset.fullKey || input.value);
      
      button.disabled = !hasKey;
      button.textContent = hasKey ? '测试' : '无Key';
    });
  }

  /**
   * 测试 API Key
   * @private
   * @param {string} provider - 服务商
   */
  async #testApiKey(provider) {
    const button = this.#testButtons.get(provider);
    const input = this.#apiKeyInputs.get(provider);
    
    if (!button || !input) return;

    const apiKey = input.dataset.fullKey || input.value;
    if (!apiKey) {
      this.#showStatus('请先输入 API Key', 'error');
      return;
    }

    try {
      // 更新按钮状态
      button.disabled = true;
      button.textContent = '测试中...';
      
      this.#showStatus(`正在测试 ${CONFIG.PROVIDERS[provider]} API Key...`, 'info');

      // 发送测试请求
      const response = await window.contentBridge.testApiKey(provider, apiKey);
      
      if (response.status === MESSAGE_STATUS.SUCCESS) {
        this.#showStatus(`${CONFIG.PROVIDERS[provider]} API Key 测试成功`, 'success');
        button.classList.add('success');
        setTimeout(() => button.classList.remove('success'), 2000);
      } else {
        throw new Error(response.error || '测试失败');
      }
    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} API Key 测试失败:`, error);
      this.#showStatus(`${CONFIG.PROVIDERS[provider]} API Key 测试失败: ${error.message}`, 'error');
      button.classList.add('error');
      setTimeout(() => button.classList.remove('error'), 2000);
    } finally {
      // 恢复按钮状态
      button.disabled = false;
      button.textContent = '测试';
    }
  }

  /**
   * 保存设置
   * @private
   */
  async #saveSettings() {
    try {
      this.#saveButton.disabled = true;
      this.#saveButton.textContent = '保存中...';
      this.#showStatus('正在保存设置...', 'info');

      // 收集设置数据
      const settings = {
        provider: this.#providerSelect.value,
        apiKeys: {}
      };

      // 收集 API Keys
      this.#apiKeyInputs.forEach((input, provider) => {
        const apiKey = input.dataset.fullKey || input.value;
        if (apiKey && apiKey.trim()) {
          settings.apiKeys[provider] = apiKey.trim();
        }
      });

      // 保存设置
      await window.contentBridge.saveSettingsToStorage(settings);

      // 更新当前设置
      this.#currentSettings = { ...this.#currentSettings, ...settings };

      this.#showStatus('设置保存成功', 'success');
      
      // 重置保存按钮状态
      this.#saveButton.textContent = '保存设置';
      this.#saveButton.classList.remove('changed');

      console.log(`${CONFIG.LOG_PREFIX} 设置保存成功:`, settings);

      // 通知其他组件设置已更新
      EventUtils.emit('update:provider', settings.provider);

    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} 保存设置失败:`, error);
      this.#showStatus('保存设置失败: ' + error.message, 'error');
    } finally {
      this.#saveButton.disabled = false;
      if (this.#saveButton.textContent === '保存中...') {
        this.#saveButton.textContent = '保存设置';
      }
    }
  }

  /**
   * 显示状态消息
   * @private
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 ('info', 'success', 'error')
   */
  #showStatus(message, type = 'info') {
    this.#statusMessage.textContent = message;
    this.#statusMessage.className = `status-message ${type}`;
    
    // 自动清除成功和错误消息
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        this.#statusMessage.textContent = '';
        this.#statusMessage.className = 'status-message';
      }, 3000);
    }
  }

  /**
   * 显示帮助模态框
   */
  show() {
    this.#modalElement.classList.remove('hide');
    document.addEventListener('keydown', this.#handleEscapeKey);
    this.isShowing = true;
    this.#loadModelConfig();
  }

  /**
   * 隐藏帮助模态框
   */
  hide(e) {
    if (e && e.target !== this.#modalElement) return;
    this.#modalElement.classList.add('hide');
    document.removeEventListener('keydown', this.#handleEscapeKey);
    this.isShowing = false;
  }

  /**
   * 更新模型配置
   * @param {Object} config - 模型配置
   */
  updateConfig(config) {
    this.#currentSettings = { ...this.#currentSettings, ...config };
    this.#updateUI(this.#currentSettings);
  }

  /**
   * 获取当前设置
   * @returns {Object} 当前设置
   */
  getCurrentSettings() {
    return { ...this.#currentSettings };
  }

  destroy() {
    document.removeEventListener('keydown', this.#handleEscapeKey);
  }
} 
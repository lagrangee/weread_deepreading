/**
 * @file popup.js
 * @description 微信读书助手弹出窗口管理 - 简化架构版本
 */

import { PopupBridge } from './services/popup-bridge.js';

class PopupManager {
  constructor() {
    this.providers = ['wenxin', 'qianwen', 'doubao', 'deepseek'];
    this.providerNames = {
      wenxin: '文心一言',
      qianwen: '通义千问',
      doubao: '豆包',
      deepseek: 'DeepSeek'
    };
    this.bridge = null;
    this.init();
  }

  async init() {
    try {
      console.log('Popup 初始化');
      // 初始化通信桥接
      this.bridge = new PopupBridge();
      
      // 加载配置
      await this.loadConfig();
      
      // 绑定事件
      this.bindEvents();
      
      // 设置桥接事件监听
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
    // 监听设置变更
    this.bridge.on('settingsChanged', (event) => {
      console.log('设置已变更:', event.detail);
      this.handleSettingsChanged(event.detail);
    });
  }

  /**
   * 处理设置变更
   * @param {Object} changes - 变更的设置
   */
  handleSettingsChanged(changes) {
    // 更新 UI 显示
    if (changes.currentProvider) {
      const providerSelect = document.getElementById('currentProvider');
      if (providerSelect) {
        providerSelect.value = changes.currentProvider;
      }
    }

    if (changes.apiKeys) {
      this.updateApiKeyInputs(changes.apiKeys);
    }
  }

  /**
   * 更新 API Key 输入框
   * @param {Object} apiKeys - API Keys 对象
   */
  updateApiKeyInputs(apiKeys) {
    this.providers.forEach(provider => {
      const input = document.getElementById(`${provider}Key`);
      if (input && apiKeys[provider]) {
        input.value = apiKeys[provider];
      }
    });
  }

  async loadConfig() {
    try {
      const settings = await this.bridge.getSettings(['provider', 'apiKeys']);
      
      // 设置当前服务商
      if (settings.provider) {
        const providerSelect = document.getElementById('currentProvider');
        if (providerSelect) {
          providerSelect.value = settings.provider;
        }
      }

      // 设置 API Keys
      if (settings.apiKeys) {
        this.updateApiKeyInputs(settings.apiKeys);
      }
    } catch (error) {
      this.showStatus('加载配置失败：' + error.message, 'error');
    }
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

    // 当前服务商选择变化
    const providerSelect = document.getElementById('currentProvider');
    if (providerSelect) {
      providerSelect.addEventListener('change', (e) => {
        const provider = e.target.value;
        console.log('切换到服务商:', provider);
      });
    }

    // 健康检查按钮
    const healthCheckBtn = document.getElementById('healthCheck');
    if (healthCheckBtn) {
      healthCheckBtn.addEventListener('click', () => {
        this.performHealthCheck();
      });
    }
  }

  /**
   * 保存设置
   */
  async saveConfig() {
    try {
      const currentProvider = document.getElementById('currentProvider')?.value;
      if (!currentProvider) {
        throw new Error('请选择服务提供商');
      }

      const apiKeys = {};

      // 收集所有非空的 API Keys
      this.providers.forEach(provider => {
        const input = document.getElementById(`${provider}Key`);
        const key = input?.value.trim();
        if (key) {
          apiKeys[provider] = key;
        }
      });

      // 验证当前选择的服务商是否有对应的 API Key
      if (!apiKeys[currentProvider]) {
        throw new Error(`请先设置 ${this.getProviderName(currentProvider)} 的 API Key`);
      }

      const settings = { 
        currentProvider, 
        apiKeys,
        lastUsed: Date.now()
      };

      // 保存设置
      const success = await this.bridge.saveSettings(settings);
      
      if (success) {
        this.showStatus('设置已保存', 'success');
        // 重新检查页面状态以更新显示
        setTimeout(() => this.checkPageStatus(), 500);
      } else {
        throw new Error('保存设置失败');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      this.showStatus(error.message || '保存设置失败', 'error');
    }
  }

  /**
   * 测试 API Key
   * @param {string} provider - 服务提供商
   * @param {string} key - API Key
   */
  async testApiKey(provider, key) {
    if (!key) {
      this.showStatus(`请输入 ${this.getProviderName(provider)} 的 API Key`, 'error');
      return;
    }

    try {
      // 显示测试中状态
      const testBtn = document.querySelector(`[data-provider="${provider}"]`);
      const originalText = testBtn.textContent;
      testBtn.textContent = '测试中...';
      testBtn.disabled = true;

      // 发送测试请求
      const result = await this.bridge.testApiConnection(provider, key);

      if (result.success) {
        this.showStatus(`${this.getProviderName(provider)} API Key 测试成功`, 'success');
      } else {
        this.showStatus(`${this.getProviderName(provider)} API Key 测试失败：${result.message}`, 'error');
      }

      // 恢复按钮状态
      testBtn.textContent = originalText;
      testBtn.disabled = false;
    } catch (error) {
      this.showStatus(`测试失败：${error.message}`, 'error');
      
      // 恢复按钮状态
      const testBtn = document.querySelector(`[data-provider="${provider}"]`);
      testBtn.textContent = '测试';
      testBtn.disabled = false;
    }
  }


  getProviderName(provider) {
    return this.providerNames[provider] || provider;
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
    this.bridge?.destroy();
  }
}

// 初始化
function initPopup() {
  console.log('Popup 脚本加载成功');
  const manager = new PopupManager();
  
  // 页面卸载前清理
  window.addEventListener('beforeunload', () => {
    manager.destroy();
  });
}

initPopup();
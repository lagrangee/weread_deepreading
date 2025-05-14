/**
 * @file popup.js
 * @description 微信读书助手弹出窗口管理
 */

class PopupManager {
  constructor() {
    this.providers = ['wenxin', 'qianwen', 'doubao', 'deepseek'];
    this.providerNames = {
      wenxin: '文心一言',
      qianwen: '通义千问',
      doubao: '豆包',
      deepseek: 'DeepSeek'
    };
    this.init();
  }

  async init() {
    await this.loadConfig();
    this.bindEvents();
  }

  async loadConfig() {
    try {
      const config = await chrome.storage.sync.get(['currentProvider', 'apiKeys']);
      
      // 设置当前服务商
      if (config.currentProvider) {
        document.getElementById('currentProvider').value = config.currentProvider;
      }

      // 设置 API Keys
      if (config.apiKeys) {
        this.providers.forEach(provider => {
          const input = document.getElementById(`${provider}Key`);
          if (input && config.apiKeys[provider]) {
            input.value = config.apiKeys[provider];
          }
        });
      }
    } catch (error) {
      this.showStatus('加载配置失败：' + error.message, 'error');
    }
  }

  bindEvents() {
    // 保存配置按钮
    document.getElementById('saveConfig').addEventListener('click', () => {
      this.saveConfig();
    });

    // 测试按钮
    document.querySelectorAll('.test-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const provider = e.target.dataset.provider;
        const key = document.getElementById(`${provider}Key`).value;
        await this.testApiKey(provider, key);
      });
    });

    // 当前服务商选择变化
    document.getElementById('currentProvider').addEventListener('change', (e) => {
      const provider = e.target.value;
      // 可以在这里添加其他逻辑
    });
  }

  /**
   * 保存设置到 Chrome Storage
   * @returns {Promise<void>}
   */
  async saveConfig() {
    try {
      const currentProvider = document.getElementById('currentProvider').value;
      const apiKeys = {};

      // 收集所有非空的 API Keys
      this.providers.forEach(provider => {
        const key = document.getElementById(`${provider}Key`).value.trim();
        if (key) {
          apiKeys[provider] = key;
        }
      });

      // 验证当前选择的服务商是否有对应的 API Key
      if (!apiKeys[currentProvider]) {
        throw new Error(`请先设置 ${this.getProviderName(currentProvider)} 的 API Key`);
      }

      const settings = { currentProvider, apiKeys };

      // 保存到 storage
      await chrome.storage.sync.set(settings);
      
      // 通知 background script  中转更新 AIService 设置
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: settings
      });

      if (!response.success) {
        throw new Error(response.error?.message || '更新设置失败');
      }

      this.showStatus('设置已保存', 'success');
    } catch (error) {
      console.error('保存设置失败:', error);
      this.showStatus(error.message || '保存设置失败', 'error');
    }
  }

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
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_API_KEY',
        provider,
        key
      });

      if (response.success) {
        this.showStatus(`${this.getProviderName(provider)} API Key 测试成功`, 'success');
      } else {
        this.showStatus(`${this.getProviderName(provider)} API Key 测试失败：${response.error}`, 'error');
      }

      // 恢复按钮状态
      testBtn.textContent = originalText;
      testBtn.disabled = false;
    } catch (error) {
      this.showStatus(`测试失败：${error.message}`, 'error');
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
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
}); 
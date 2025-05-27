/**
 * @file chat-service.js
 * @description AI 聊天服务，处理各种 AI 请求
 */

import { CONFIG } from '../../shared/config.js';

export class ChatService {
  constructor() {
    this.requestCache = new Map();
  }

  /**
   * 处理聊天请求
   * @param {Object} data - 请求数据
   * @returns {Promise<Object>} 处理结果
   */
  async processRequest(data) {
    const { provider, text, action = 'chat', book, author, isTest = false, apiKey, context } = data;

    try {
      if ( provider === undefined) {
        throw new Error('provider is undefined');
      }
      if (isTest) {
        return await this.testApiConnection(provider, apiKey);
      }

      // 获取 API Key
      const key = apiKey || await this.getApiKey(provider);
      if (!key) {
        throw new Error(`请先配置 ${CONFIG.PROVIDERS[provider]} 的 API Key`);
      }

      // 构建提示词
      const { systemPrompt, userPrompt } = this.#buildPrompts(action, text, book, author, context );

      // 发送 AI 请求
      const response = await this.sendAIRequest(provider, key, systemPrompt, userPrompt);

      return {
        text: response,
        provider,
        action,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} AI 请求失败:`, error);
      throw error;
    }
  }

  /**
   * 构建提示词
   * @param {string} action - 动作类型
   * @param {string} text - 用户文本
   * @param {string} book - 书名
   * @param {string} author - 作者
   * @returns {Object} 提示词对象
   */
  #buildPrompts(action, text, book, author, context = []) {
    // 获取系统提示词模板
    const systemTemplate = CONFIG.PROMPTS.SYSTEM[action] || CONFIG.PROMPTS.SYSTEM.chat;
    const userTemplate = CONFIG.PROMPTS.USER[action] || CONFIG.PROMPTS.USER.chat;

    // 替换模板变量
    const systemPrompt = systemTemplate
      .replace('{book}', book || '未知书籍')
      .replace('{author}', author || '未知作者');

    const userPrompt = userTemplate
      .replace('{book}', book || '未知书籍')
      .replace('{author}', author || '未知作者')
      .replace('{text}', text)
      .replace('{context}', this.#buildContext(context));

    return { systemPrompt, userPrompt };
  }

  #buildContext(context) {
    return context.map(item => `${item.role == "user" ? "我问:" : "你的回答:"}: ${item.content}`).join('\n');
  }

  /**
   * 发送 AI 请求
   * @param {string} provider - 提供商
   * @param {string} apiKey - API Key
   * @param {string} systemPrompt - 系统提示词
   * @param {string} userPrompt - 用户提示词
   * @returns {Promise<string>} AI 响应
   */
  async sendAIRequest(provider, apiKey, systemPrompt, userPrompt) {
    const config = CONFIG.API_ENDPOINTS[provider];
    if (!config) {
      throw new Error(`未知的提供商: ${provider}`);
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const requestBody = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    };

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API 请求失败: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage += ` - ${errorData.error?.message || errorText}`;
      } catch {
        errorMessage += ` - ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // 根据不同提供商提取响应
    switch (provider) {
      case 'wenxin':
      case 'qianwen':
      case 'deepseek':
      case 'doubao':
        return data.choices?.[0]?.message?.content || '响应格式错误';
      default:
        throw new Error(`未支持的提供商: ${provider}`);
    }
  }

  /**
   * 测试 API 连接
   * @param {string} provider - 提供商
   * @param {string} apiKey - API Key
   * @returns {Promise<Object>} 测试结果
   */
  async testApiConnection(provider, apiKey) {
    try {
      const response = await this.sendAIRequest(
        provider,
        apiKey,
        '你是一个测试助手。',
        '请回复"连接成功"'
      );

      return {
        success: true,
        message: 'API 连接测试成功',
        response: response.substring(0, 50) // 截取前50字符作为验证
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取 API Key
   * @param {string} provider - 提供商
   * @returns {Promise<string>} API Key
   */
  async getApiKey(provider) {
    try {
      const { apiKeys = {} } = await chrome.storage.sync.get('apiKeys');
      return apiKeys[provider];
    } catch (error) {
      console.error('获取 API Key 失败:', error);
      return null;
    }
  }

  /**
   * 清理请求缓存
   */
  clearCache() {
    this.requestCache.clear();
  }
} 
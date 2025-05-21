/**
 * @file service.js
 * @description AI 服务类，处理与各 AI 提供商的通信
 */

import { CONFIG } from '/src/utils/config.esm.js';

/**
 * AI 服务错误类
 */
class AIServiceError extends Error {
  constructor(message, type = 'UNKNOWN', details = null) {
    super(message);
    this.name = 'AIServiceError';
    this.type = type;
    this.details = details;
  }
}

/**
 * AI 服务类
 */
export class AIService {
  // 存储当前实例
  static currentInstance = null;

  /**
   * 获取 AIService 单例
   * @param {string} [provider] - AI 提供商标识
   * @returns {AIService} 单例实例
   */
  static getInstance(provider) {
    if (!AIService.currentInstance) {
      if (!provider) {
        throw new AIServiceError('AIService 未初始化，请提供 provider');
      }
      AIService.currentInstance = new AIService(provider);
    }
    return AIService.currentInstance;
  }

  /**
   * 构造函数
   * @param {string} provider - AI 提供商标识（wenxin|qianwen|doubao|deepseek）
   */
  constructor(provider) {
    if (!CONFIG.API_ENDPOINTS[provider]) {
      throw new AIServiceError(`不支持的 AI 提供商: ${provider}`, 'INVALID_PROVIDER');
    }
    this.provider = provider;
    this.providerName = CONFIG.PROVIDERS[provider];
    AIService.currentInstance = this;
  }

  /**
   * 更新服务设置
   * @param {Object} settings - 新的设置
   * @param {string} settings.currentProvider - AI 提供商标识
   * @static
   */
  async updateSettings(settings) {
    //在当前 instance 中更新设置
    this.provider = settings.currentProvider;
    this.providerName = CONFIG.PROVIDERS[this.provider];
  }

  /**
   * 替换提示词中的变量
   * @param {string} prompt - 原始提示词
   * @param {Object} variables - 变量对象
   * @returns {string} 替换后的提示词
   * @private
   */
  replacePromptVariables(prompt, variables) {
    return Object.entries(variables).reduce((result, [key, value]) => {
      return result.replace(`{${key}}`, value || '');
    }, prompt);
  }

  /**
   * 发送聊天请求
   * @param {string} systemPrompt - 系统提示词
   * @param {string} userPrompt - 用户提示词
   * @returns {Promise<string>} AI 响应
   */
  async request(systemPrompt, userPrompt) {
    try {
      console.log("chat: ", this.provider);
      // 通过 background script 发送请求
      const response = await chrome.runtime.sendMessage({
        type: 'AI_CHAT',
        data: {
          provider: this.provider,
          systemPrompt,
          userPrompt
        }
      });

      if (response.error) {
        throw new AIServiceError(response.error.message, response.error.type);
      }

      return response.result;
    } catch (error) {
      if (error instanceof AIServiceError) throw error;
      throw new AIServiceError(
        `调用${this.providerName} API 时发生错误`,
        'API_ERROR',
        error
      );
    }
  }

  async test(provider, key) {
    try {
      const respone = await chrome.runtime.sendMessage({
        type: 'TEST_API_KEY',
        provider,
        key
      });
      console.log("test api key respone: ", respone);
      if (respone.error) {
        return {
          success: false,
          error: respone.error
        }
      }
      return {
        success: true,
        data: respone
      };
    } catch (error) {
      if (error instanceof AIServiceError) throw error;
      throw new AIServiceError('测试失败', 'TEST_ERROR', error);
    }
  }

  /**
   * 解释功能
   * @param {string} text - 需要解释的文本
   * @param {string} author - 作者名
   * @param {string} book - 书名
   * @returns {Promise<string>} 解释结果
   */
  async explain(text, author, book) {
    const systemPrompt = this.replacePromptVariables(CONFIG.PROMPTS.SYSTEM.explain, {
      author,
      book
    });
    const userPrompt = this.replacePromptVariables(CONFIG.PROMPTS.USER.explain, {
      author,
      book,
      text
    });
    return this.request(systemPrompt, userPrompt);
  }

  /**
   * 消化功能
   * @param {string} text - 需要消化的文本
   * @param {string} author - 作者名
   * @param {string} book - 书名
   * @returns {Promise<string>} 消化结果
   */
  async digest(text, author, book) {
    const systemPrompt = this.replacePromptVariables(CONFIG.PROMPTS.SYSTEM.digest, {
      author,
      book
    });
    const userPrompt = this.replacePromptVariables(CONFIG.PROMPTS.USER.digest, {
      author,
      book,
      text
    });
    return this.request(systemPrompt, userPrompt);
  }

  /**
   * 兼听功能
   * @param {string} text - 需要分析的文本
   * @param {string} author - 作者名
   * @param {string} book - 书名
   * @returns {Promise<string>} 分析结果
   */
  async analyze(text, author, book) {
    const systemPrompt = this.replacePromptVariables(CONFIG.PROMPTS.SYSTEM.analyze, {
      author,
      book
    });
    const userPrompt = this.replacePromptVariables(CONFIG.PROMPTS.USER.analyze, {
      author,
      book,
      text
    });
    return this.request(systemPrompt, userPrompt);
  }

  /**
   * 聊天功能
   * @param {string} text - 用户输入的文本
   * @param {string} author - 作者名
   * @param {string} book - 书名
   * @param {string[]} context - 上下文
   * @returns {Promise<string>} AI 响应
   */
  async chat(text, author, book, context) {
    const systemPrompt = this.replacePromptVariables(CONFIG.PROMPTS.SYSTEM.chat, {
      author,
      book
    });
    const userPrompt = this.replacePromptVariables(CONFIG.PROMPTS.USER.chat, {
      author,
      book,
      text,
      context
    });
    return this.request(systemPrompt, userPrompt);
  }
} 
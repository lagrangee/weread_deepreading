/**
 * @file chat-service.js
 * @description AI 聊天服务，处理各种 AI 请求，支持流式和非流式输出，使用Port连接简化流式通信
 */

import { CONFIG } from '../../shared/config.js';

export class ChatService {
  constructor() {
    this.requestCache = new Map();
    this.streamPorts = new Map(); // 存储流式连接的端口
  }

  /**
   * 处理聊天请求（非流式）
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
        userPrompt,
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
   * 处理流式聊天请求（简化版本，直接通过Port通信）
   * @param {Object} data - 请求数据
   * @param {chrome.runtime.Port} port - 通信端口
   * @returns {Promise<void>}
   */
  async processStreamRequest(data, port) {
    const { provider, text, action = 'chat', book, author, apiKey, context, requestId } = data;

    try {
      if (provider === undefined) {
        throw new Error('provider is undefined');
      }

      // 获取 API Key
      const key = apiKey || await this.getApiKey(provider);
      if (!key) {
        throw new Error(`请先配置 ${CONFIG.PROVIDERS[provider]} 的 API Key`);
      }

      // 构建提示词
      const { systemPrompt, userPrompt } = this.#buildPrompts(action, text, book, author, context);

      // 发送开始信号
      port.postMessage({
        type: 'start',
        requestId,
        userPrompt,
        provider,
        action,
        timestamp: Date.now()
      });

      // 发送流式 AI 请求
      await this.sendAIStreamRequest(provider, key, systemPrompt, userPrompt, (chunk) => {
        // 直接通过Port发送数据块
        port.postMessage({
          type: 'chunk',
          requestId,
          text: chunk,
          timestamp: Date.now()
        });
      });

      // 发送完成信号
      port.postMessage({
        type: 'complete',
        requestId,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(`${CONFIG.LOG_PREFIX} AI 流式请求失败:`, error);
      // 发送错误信号
      port.postMessage({
        type: 'error',
        requestId,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 注册流式连接端口
   * @param {string} requestId - 请求ID
   * @param {chrome.runtime.Port} port - 通信端口
   */
  registerStreamPort(requestId, port) {
    this.streamPorts.set(requestId, port);
    
    // 监听端口断开
    port.onDisconnect.addListener(() => {
      this.streamPorts.delete(requestId);
      console.log(`${CONFIG.LOG_PREFIX} 流式连接断开:`, requestId);
    });
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
   * 发送 AI 请求（非流式）
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
   * 发送流式 AI 请求
   * @param {string} provider - 提供商
   * @param {string} apiKey - API Key
   * @param {string} systemPrompt - 系统提示词
   * @param {string} userPrompt - 用户提示词
   * @param {Function} onChunk - 接收数据块的回调函数
   * @returns {Promise<void>}
   */
  async sendAIStreamRequest(provider, apiKey, systemPrompt, userPrompt, onChunk) {
    const config = CONFIG.API_ENDPOINTS[provider];
    if (!config) {
      throw new Error(`未知的提供商: ${provider}`);
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'text/event-stream'
    };

    const requestBody = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true  // 启用流式输出
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

    // 处理流式响应
    await this.#processStreamResponse(response, provider, onChunk);
  }

  /**
   * 处理流式响应数据
   * @param {Response} response - fetch 响应对象
   * @param {string} provider - AI 提供商
   * @param {Function} onChunk - 接收数据块的回调函数
   * @returns {Promise<void>}
   */
  async #processStreamResponse(response, provider, onChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // 解码数据块
        buffer += decoder.decode(value, { stream: true });
        
        // 按行分割数据
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留不完整的行

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          // 处理 SSE 格式的数据
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // 移除 "data: " 前缀
            
            if (data === '[DONE]') {
              // 流结束标志
              break;
            }

            try {
              const jsonData = JSON.parse(data);
              const content = this.#extractStreamContent(jsonData, provider);
              
              if (content) {
                onChunk(content);
              }
            } catch (error) {
              console.warn('解析流数据失败:', error, data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 从流式响应中提取内容
   * @param {Object} data - JSON 数据
   * @param {string} provider - AI 提供商
   * @returns {string|null} 提取的内容
   */
  #extractStreamContent(data, provider) {
    try {
      switch (provider) {
        case 'wenxin':
        case 'qianwen':
        case 'deepseek':
        case 'doubao':
          // 大多数提供商使用相似的格式
          return data.choices?.[0]?.delta?.content || null;
        default:
          return data.choices?.[0]?.delta?.content || null;
      }
    } catch (error) {
      console.warn('提取流内容失败:', error);
      return null;
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
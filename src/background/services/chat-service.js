/**
 * @file chat-service.js
 * @description AI 聊天服务，处理各种 AI 请求，支持流式和非流式输出，使用Port连接简化流式通信
 */

import { CONFIG } from '../../shared/config.js';

export class ChatService {
  /** @type {Map<string, AbortController>} 存储正在进行的请求，以便取消 */
  #abortControllers = new Map();

  constructor() {
    this.requestCache = new Map();
    this.streamPorts = new Map();
  }

  /**
   * 处理聊天请求（非流式）
   */
  async processRequest(data) {
    const { provider, text, action = 'chat', book, author, isTest = false, apiKey, context, model, temperature, requestId } = data;

    try {
      if (!provider) throw new Error('provider is required');
      if (isTest) return await this.testApiConnection(provider, apiKey, model, temperature);

      const config = await this.#getEffectiveConfig(provider, { apiKey, model, temperature });
      const { systemPrompt, userPrompt } = this.#buildPrompts(action, text, book, author, context);

      const response = await this.#makeRequest({
        provider,
        apiKey: config.apiKey,
        groupId: config.groupId,
        systemPrompt,
        userPrompt,
        model: config.model,
        temperature: config.temperature,
        requestId
      });

      return {
        userPrompt,
        text: response,
        provider,
        action,
        timestamp: Date.now()
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`${CONFIG.LOG_PREFIX} 请求已手动取消: ${requestId}`);
        return null;
      }
      console.error(`${CONFIG.LOG_PREFIX} AI 请求失败:`, error);
      throw error;
    }
  }

  /**
   * 处理流式聊天请求
   */
  async processStreamRequest(data, port) {
    const { provider, text, action = 'chat', book, author, apiKey, context, requestId, model, temperature } = data;

    try {
      if (!provider) throw new Error('provider is required');

      const config = await this.#getEffectiveConfig(provider, { apiKey, model, temperature });
      const { systemPrompt, userPrompt } = this.#buildPrompts(action, text, book, author, context);

      port.postMessage({
        type: 'start',
        requestId,
        userPrompt,
        provider,
        action,
        timestamp: Date.now()
      });

      await this.#makeRequest({
        provider,
        apiKey: config.apiKey,
        groupId: config.groupId,
        systemPrompt,
        userPrompt,
        model: config.model,
        temperature: config.temperature,
        requestId,
        stream: true,
        onChunk: (chunk) => {
          port.postMessage({
            type: 'chunk',
            requestId,
            text: chunk,
            timestamp: Date.now()
          });
        }
      });

      port.postMessage({ type: 'complete', requestId, timestamp: Date.now() });

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`${CONFIG.LOG_PREFIX} 流式请求已取消: ${requestId}`);
        return;
      }
      console.error(`${CONFIG.LOG_PREFIX} AI 流式请求失败:`, error);
      port.postMessage({
        type: 'error',
        requestId,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 统一请求层 (支持流式和非流式)
   */
  async #makeRequest({ provider, apiKey, systemPrompt, userPrompt, model, temperature, requestId, stream = false, onChunk }) {
    const apiConfig = CONFIG.API_ENDPOINTS[provider];
    if (!apiConfig) throw new Error(`未知的提供商: ${provider}`);

    // 管理 AbortController
    if (requestId) this.cancelRequest(requestId);
    const controller = new AbortController();
    if (requestId) this.#abortControllers.set(requestId, controller);

    // 模型兜底逻辑
    const finalModel = model || apiConfig.model;

    const requestBody = {
      model: finalModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream
    };
    if (temperature !== undefined) requestBody.temperature = temperature;

    // 清洗参数，确保没有不可见字符
    const sanitize = (val) => (val || '').trim().replace(/[^\x00-\x7F]/g, '');
    const sanitizedApiKey = sanitize(apiKey);

    // 构造请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sanitizedApiKey}`
    };

    // 动态设置 Accept 头部。智谱等服务商在非流式模式下对 Accept: text/event-stream 极为敏感
    if (stream) {
      headers['Accept'] = 'text/event-stream';
    } else {
      headers['Accept'] = 'application/json';
    }

    // 针对 MiniMax 等国产供应商的多重授权兼容方案
    if (provider === 'minimax') {
      headers['api-key'] = sanitizedApiKey; // 增加冗余头，提升网关识别鲁棒性
    }

    try {
      const response = await fetch(apiConfig.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.message || `API Error: ${response.status}`);
      }

      if (stream) {
        await this.#parseSSEResponse(response, provider, onChunk, controller.signal);
        return null;
      } else {
        const data = await response.json();
        return this.#extractContent(data, provider);
      }
    } finally {
      if (requestId) this.#abortControllers.delete(requestId);
    }
  }

  /**
   * 鲁棒的 SSE 解析引擎
   */
  async #parseSSEResponse(response, provider, onChunk, signal) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let partialLine = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (signal.aborted) throw new AbortError();

        const chunk = decoder.decode(value, { stream: true });
        const lines = (partialLine + chunk).split('\n');
        partialLine = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const dataStr = trimmedLine.slice(6);
          if (dataStr === '[DONE]') break;

          try {
            const json = JSON.parse(dataStr);
            const content = this.#extractContent(json, provider, true);
            if (content) onChunk(content);
          } catch (e) {
            console.warn(`${CONFIG.LOG_PREFIX} 解析 SSE 数据失败:`, e, dataStr);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 统一内容提取策略
   */
  #extractContent(data, provider, isStream = false) {
    // 适配绝大多数 OpenAI 格式及其变体 (DeepSeek, Doubao, Qianwen...)
    if (isStream) {
      return data.choices?.[0]?.delta?.content || null;
    }
    return data.choices?.[0]?.message?.content || data.choices?.[0]?.text || null;
  }

  /**
   * 获取最终生效配置 (防御性清洗)
   */
  async #getEffectiveConfig(provider, overrides) {
    const saved = await this.getCustomConfigs(provider);

    // 基础清洗：去除首尾空格及所有非 ASCII 字符（防止不可见干扰字符）
    const sanitize = (val) => typeof val === 'string' ? val.trim().replace(/[^\x00-\x7F]/g, '') : val;

    return {
      apiKey: sanitize(overrides.apiKey || saved.apiKey),
      model: sanitize(overrides.model || saved.model),
      temperature: overrides.temperature !== undefined ? overrides.temperature : saved.temperature
    };
  }

  /**
   * 取消指定请求
   */
  cancelRequest(requestId) {
    if (this.#abortControllers.has(requestId)) {
      this.#abortControllers.get(requestId).abort();
      this.#abortControllers.delete(requestId);
    }
  }

  /**
   * 构建提示词 (原逻辑保留并增强)
   */
  #buildPrompts(action, text, book, author, context = []) {
    const systemTemplate = CONFIG.PROMPTS.SYSTEM[action] || CONFIG.PROMPTS.SYSTEM.chat;
    const userTemplate = CONFIG.PROMPTS.USER[action] || CONFIG.PROMPTS.USER.chat;

    const systemPrompt = systemTemplate
      .replace('{book}', book || '未知书籍')
      .replace('{author}', author || '未知作者');

    const userPrompt = userTemplate
      .replace('{book}', book || '未知书籍')
      .replace('{author}', author || '未知作者')
      .replace('{text}', text)
      .replace('{context}', context.length > 0 ? this.#buildContext(context) : '');

    return { systemPrompt, userPrompt };
  }

  #buildContext(context) {
    return context.map(item => `${item.role == "user" ? "我问" : "AI回答"}: ${item.content}`).join('\n');
  }

  /**
   * 测试 API 连接 (验证完整逻辑：Key + Model + Temp)
   */
  async testApiConnection(provider, apiKey, model, temperature) {
    // 强制走一次配置清洗逻辑，确保测试路径与真实请求完全一致
    const config = await this.#getEffectiveConfig(provider, { apiKey, model, temperature });

    const response = await this.#makeRequest({
      provider,
      apiKey: config.apiKey,
      systemPrompt: '你是一个测试助手。',
      userPrompt: '请回复"OK"',
      model: config.model,
      temperature: config.temperature,
      requestId: 'test-connection'
    });

    let message = '连接成功';
    // 如果用户的输入被纠错逻辑修改了，明确告知用户
    if (model && model.trim() !== config.model) {
      message += ` (模型名已自动修正为: ${config.model})`;
    }

    return { success: true, message, response: response?.substring(0, 20) };
  }

  async getCustomConfigs(provider) {
    try {
      const result = await chrome.storage.sync.get(['apiKeys', 'models', 'temperatures']);
      return {
        apiKey: result.apiKeys?.[provider] || null,
        model: result.models?.[provider] || null,
        temperature: result.temperatures?.[provider] !== undefined ? Number(result.temperatures[provider]) : undefined
      };
    } catch {
      return { apiKey: null, model: null, temperature: undefined };
    }
  }

  registerStreamPort(requestId, port) {
    this.streamPorts.set(requestId, port);
    port.onDisconnect.addListener(() => {
      this.cancelRequest(requestId);
      this.streamPorts.delete(requestId);
    });
  }
}

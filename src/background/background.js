/**
 * @file background.js
 * @description 微信读书助手后台脚本，处理 AI 请求和其他需要特殊权限的操作
 */

import { AIService } from '../ai/service.js';
import { CONFIG } from '../utils/config.esm.js';

// 监听来自 popup 和 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_SETTINGS') {
    try {
      // 转发广播设置更新到所有tabs
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        for (const tab of tabs) {
          try {
            chrome.tabs.sendMessage(tab.id, {
              type: 'UPDATE_SETTINGS',
              settings: request.data
            });
            console.log(`${CONFIG.LOG_PREFIX} AI 设置更新已发送到标签页 ${tab.id}`);
          } catch (err) {
          }
      }});
      sendResponse({ success: true });
    } catch (error) {
      console.error('更新设置失败:', error);
      sendResponse({ 
        success: false, 
        error: { 
          message: error.message, 
          type: error.type 
        } 
      })
    };
    return true; // 保持消息通道开放以进行异步响应
  }

  if (request.type === 'AI_CHAT') {
    handleAIChat(request.data)
      .then(result => sendResponse({ result }))
      .catch(error => sendResponse({ 
        error: {
          message: error.message,
          type: error.type
        }
      }));
    return true; // 保持消息通道开放
  }

  if (request.type === 'TEST_API_KEY') {
    testApiKey(request.provider, request.key)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({
         success: false,
         error:{
          message: error.message,
          type: error.type
         }
      }));
    return true;
  }
});

/**
 * AI 请求处理函数
 * @param {Object} params - 请求参数
 * @param {string} params.provider - AI 提供商
 * @param {string} params.systemPrompt - 系统提示词
 * @param {string} params.userPrompt - 用户提示词
 * @returns {Promise<string>} AI 响应文本
 */
async function handleAIChat({ provider, systemPrompt, userPrompt }) {
  try {
    // 获取 API Key
    const { apiKeys = {} } = await chrome.storage.sync.get('apiKeys');
    const apiKey = apiKeys[provider];
    
    if (!apiKey) {
      throw new Error(`请先配置 ${CONFIG.PROVIDERS[provider]} 的 API Key`);
    }

    // 获取提供商配置
    const config = CONFIG.API_ENDPOINTS[provider];
    
    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    // 发送请求
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${JSON.parse(errorText).error.message}`);
    }

    const data = await response.json();
    
    // 根据不同提供商提取响应
    switch (provider) {
      case 'wenxin':
      case 'qianwen':
      case 'deepseek':
      case 'doubao':
        return data.choices[0].message.content;
      default:
        throw new Error('未知的提供商');
    }
  } catch (error) {
    console.error('AI 请求错误:', error);
    throw error;
  }
}

/**
 * 测试 API Key 是否有效
 * @param {string} provider - AI 提供商
 * @param {string} key - API Key
 * @returns {Promise<Object>} 测试结果
 */
async function testApiKey(provider, key) {
  try {
    const config = CONFIG.API_ENDPOINTS[provider];
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    };

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'user', content: '测试消息' }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("test api key response: ", response, errorText);
      throw new Error(`${response.status} - ${JSON.parse(errorText).error.message}`);
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
} 
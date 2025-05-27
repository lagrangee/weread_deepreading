/**
 * @file background.js
 * @description 微信读书助手后台脚本，使用简化的通信架构
 */

import { MessageRouter } from './message-router.js';
import { CONFIG } from '../utils/config.js';
import { BACKGROUND_MESSAGES } from '../shared/message-types.js';

// 初始化消息路由器
const messageRouter = new MessageRouter();

console.log(`${CONFIG.LOG_PREFIX} Background script initialized`);


// 简化的消息处理 - 直接处理来自 content 的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  return;
  console.log(`${CONFIG.LOG_PREFIX} Background 收到消息:`, request);
  
  // 处理聊天请求
  if (request.type === BACKGROUND_MESSAGES.CHAT.REQUEST) {
    console.log(`${CONFIG.LOG_PREFIX} 处理聊天请求:`, request.data);
    
    // 异步处理聊天请求
    messageRouter.chatService.processRequest(request.data)
      .then(response => {
        console.log(`${CONFIG.LOG_PREFIX} 聊天处理成功:`, response);
        sendResponse({
          status: 'success',
          data: response
        });
      })
      .catch(error => {
        console.error(`${CONFIG.LOG_PREFIX} 聊天处理失败:`, error);
        sendResponse({
          status: 'error',
          error: error.message
        });
      });
    
    return true; // 保持消息通道开放以支持异步响应
  }
  
  // 保持对旧版API的兼容性（临时）
  if (request.type && !request.id) {
    console.warn(`${CONFIG.LOG_PREFIX} 检测到旧版消息格式:`, request.type);
    
    switch (request.type) {
      case 'AI_CHAT':
        // 转换为新格式并处理
        messageRouter.chatService.processRequest({
          ...request.data,
          requestId: Date.now().toString()
        }).then(response => {
          sendResponse(response);
        }).catch(error => {
          sendResponse({ 
            error: {
              message: error.message,
              type: error.type
            }
          });
        });
        return true;
        
      case 'TEST_API_KEY':
        // 转换为新格式并处理
        messageRouter.chatService.processRequest({
          provider: request.provider,
          apiKey: request.key,
          text: 'test',
          isTest: true
        }).then(response => {
          sendResponse(response);
        }).catch(error => {
          sendResponse({
            success: false,
            error: {
              message: error.message,
              type: error.type
            }
          });
        });
        return true;
        
      case 'UPDATE_SETTINGS':
        // 处理设置更新
        sendResponse({ success: true });
        return true;
    }
  }
}); 
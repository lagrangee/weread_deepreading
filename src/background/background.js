/**
 * @file background.js
 * @description 微信读书助手后台脚本，使用简化的通信架构，支持流式和非流式AI请求，使用Port连接简化流式通信
 */

import { CONFIG } from '../shared/config.js';
import { BridgeService } from '../shared/bridge-service.js';
import { BACKGROUND_MESSAGES, MESSAGE_STATUS } from '../shared/message-types.js';
import { ChatService } from './services/chat-service.js';

export class MessageRouter {
  constructor() {
    this.bridge = new BridgeService('background');
    this.chatService = new ChatService();
    
    this.setupRoutes();
    this.setupPortConnections();
  }

  /**
   * 设置消息路由 - 非流式请求
   */
  setupRoutes() {
    // AI聊天路由 - 非流式
    this.bridge.on(BACKGROUND_MESSAGES.CHAT.REQUEST, async (data, sender) => {
      console.log(`${CONFIG.LOG_PREFIX} MessageRouter 收到 CHAT_REQUEST:`, data);
      try {
        const response = await this.chatService.processRequest(data);
        return {
          status: MESSAGE_STATUS.SUCCESS,
          data: response
        };
      } catch (error) {
        console.error(`${CONFIG.LOG_PREFIX} AI聊天处理失败:`, error);
        return {
          status: MESSAGE_STATUS.ERROR,
          error
        };
      }
    });

    this.bridge.on(BACKGROUND_MESSAGES.CHAT.TEST_API_KEY, async (data, sender) => {
      console.log(`${CONFIG.LOG_PREFIX} MessageRouter 收到 TEST_API_KEY:`, data);
      try {
        const response = await this.chatService.processRequest({
          provider: data.provider,
          apiKey: data.apiKey,
          isTest: true,
        });
        return {
          status: MESSAGE_STATUS.SUCCESS,
          data: response
        };
      } catch (error) {
        console.error(`${CONFIG.LOG_PREFIX} API Key 测试失败:`, error);
        return {
          status: MESSAGE_STATUS.ERROR,
          error,
        };
      }
    });
  }

  /**
   * 设置Port连接处理流式请求
   */
  setupPortConnections() {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === BACKGROUND_MESSAGES.CHAT.REQUEST_STREAM) {
        console.log(`${CONFIG.LOG_PREFIX} 建立流式聊天连接`);
        
        port.onMessage.addListener(async (data) => {
          const { requestId } = data;
          
          // 注册端口
          this.chatService.registerStreamPort(requestId, port);
          
          // 处理流式请求
          await this.chatService.processStreamRequest(data, port);
        });

        port.onDisconnect.addListener(() => {
          console.log(`${CONFIG.LOG_PREFIX} 流式聊天连接断开`);
        });
      }
    });
  }

  /**
   * 销毁路由器
   */
  destroy() {
    this.bridge.destroy();
  }
} 

// 初始化消息路由器
const messageRouter = new MessageRouter();
/**
 * @file communication-test.js
 * @description 通信架构测试脚本
 */

import { BridgeService } from '../src/shared/bridge-service.js';
import { MessageRouter } from '../src/background/message-router.js';

describe('通信架构测试', () => {
  let bridgeService;
  let messageRouter;

  beforeEach(() => {
    // 模拟 Chrome API
    global.chrome = {
      runtime: {
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn()
        }
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn()
      }
    };

    bridgeService = new BridgeService('test');
    messageRouter = new MessageRouter();
  });

  afterEach(() => {
    bridgeService?.destroy();
    messageRouter?.destroy();
  });

  test('BridgeService 初始化', () => {
    expect(bridgeService).toBeDefined();
    expect(bridgeService.isConnected()).toBe(false);
  });

  test('消息发送和接收', async () => {
    const testMessage = {
      type: 'TEST_MESSAGE',
      data: { test: 'data' }
    };

    // 模拟成功响应
    global.chrome.runtime.sendMessage.mockResolvedValue({
      status: 'success',
      data: { response: 'test response' }
    });

    const response = await bridgeService.sendMessage(testMessage);
    
    expect(response.status).toBe('success');
    expect(response.data.response).toBe('test response');
  });

  test('超时处理', async () => {
    const testMessage = {
      type: 'TIMEOUT_TEST',
      data: {}
    };

    // 模拟超时
    global.chrome.runtime.sendMessage.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 6000))
    );

    await expect(bridgeService.sendMessage(testMessage, { timeout: 1000 }))
      .rejects.toThrow('请求超时');
  });

  test('错误处理', async () => {
    const testMessage = {
      type: 'ERROR_TEST',
      data: {}
    };

    // 模拟错误响应
    global.chrome.runtime.sendMessage.mockResolvedValue({
      status: 'error',
      error: 'Test error message'
    });

    await expect(bridgeService.sendMessage(testMessage))
      .rejects.toThrow('Test error message');
  });

  test('事件监听和触发', () => {
    const mockHandler = jest.fn();
    
    bridgeService.on('test:event', mockHandler);
    bridgeService.emit('test:event', { data: 'test' });
    
    expect(mockHandler).toHaveBeenCalledWith({ data: 'test' });
  });

  test('健康检查', async () => {
    // 模拟健康检查响应
    global.chrome.runtime.sendMessage.mockResolvedValue({
      status: 'success',
      data: { healthy: true }
    });

    const isHealthy = await bridgeService.checkHealth();
    expect(isHealthy).toBe(true);
  });
}); 
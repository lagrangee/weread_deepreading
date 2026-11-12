/** @jest-environment node */

import { TextEncoder } from 'node:util';
import { ChatService as BackgroundChatService } from '../src/background/services/chat-service.js';
import { ChatService as ContentChatService } from '../src/content/services/chat-service.js';

function createPort() {
  const messageListeners = [];
  const disconnectListeners = [];
  return {
    onMessage: { addListener: listener => messageListeners.push(listener) },
    onDisconnect: { addListener: listener => disconnectListeners.push(listener) },
    postMessage: jest.fn(),
    disconnect: jest.fn(() => disconnectListeners.forEach(listener => listener())),
    receive: message => messageListeners.forEach(listener => listener(message)),
  };
}

function streamResponse(chunks) {
  const encoder = new TextEncoder();
  const encoded = chunks.map(chunk => (typeof chunk === 'string' ? encoder.encode(chunk) : chunk));
  const reader = {
    read: jest.fn(async () =>
      encoded.length ? { value: encoded.shift(), done: false } : { done: true }
    ),
    releaseLock: jest.fn(),
    cancel: jest.fn(async () => {}),
  };
  return { ok: true, body: { getReader: () => reader }, reader };
}

beforeEach(() => {
  jest.clearAllMocks();
  const config = { apiKeys: { qianwen: 'fake-test-key' }, models: {}, temperatures: {} };
  chrome.storage.sync.get.mockResolvedValue(config);
  chrome.storage.local.get.mockResolvedValue(config);
  chrome.storage.local.set.mockResolvedValue();
  chrome.storage.sync.remove.mockResolvedValue();
  global.window = { contentBridge: {} };
});

describe('后台流式回答', () => {
  async function request(response) {
    fetch.mockResolvedValue(response);
    const service = new BackgroundChatService();
    const port = createPort();
    await service.processStreamRequest(
      {
        provider: 'qianwen',
        action: 'chat',
        text: '测试问题',
        requestId: 'test-stream',
      },
      port
    );
    return { service, port, events: port.postMessage.mock.calls.map(([event]) => event) };
  }

  test('保留跨网络分块的中文，并在 DONE 后结束', async () => {
    const bytes = new TextEncoder().encode(
      'data: {"choices":[{"delta":{"content":"完整中文"}}]}\n\ndata: [DONE]\n\n'
    );
    const response = streamResponse([bytes.slice(0, 43), bytes.slice(43, 45), bytes.slice(45)]);
    const { events } = await request(response);
    expect(
      events
        .filter(event => event.type === 'chunk')
        .map(event => event.text)
        .join('')
    ).toBe('完整中文');
    expect(events.at(-1).type).toBe('complete');
  });

  test('支持 data 冒号后没有空格和 CRLF 换行', async () => {
    const { events } = await request(
      streamResponse(['data:{"choices":[{"delta":{"content":"无空格"}}]}\r\n\r\n'])
    );
    expect(
      events
        .filter(event => event.type === 'chunk')
        .map(event => event.text)
        .join('')
    ).toBe('无空格');
  });

  test('同一 SSE 事件的多行 data 合并后解析', async () => {
    const { events } = await request(
      streamResponse(['data: {"choices":\ndata: [{"delta":{"content":"多行事件"}}]}\n\n'])
    );
    expect(
      events
        .filter(event => event.type === 'chunk')
        .map(event => event.text)
        .join('')
    ).toBe('多行事件');
  });

  test('流结束时不丢弃没有末尾换行的最后一段', async () => {
    const { events } = await request(
      streamResponse(['data: {"choices":[{"delta":{"content":"最后一段"}}]}'])
    );
    expect(
      events
        .filter(event => event.type === 'chunk')
        .map(event => event.text)
        .join('')
    ).toBe('最后一段');
  });

  test('200 响应中的供应商错误仍返回失败', async () => {
    const { events } = await request(
      streamResponse(['event: error\ndata: {"error":{"message":"账户额度不足"}}\n\n'])
    );
    expect(events.at(-1)).toMatchObject({ type: 'error', error: '账户额度不足' });
    expect(events.some(event => event.type === 'complete')).toBe(false);
  });

  test('空回答不能被当作成功', async () => {
    const { events } = await request(streamResponse(['data: [DONE]\n\n']));
    expect(events.at(-1)).toMatchObject({ type: 'error' });
    expect(events.at(-1).error).toMatch(/未返回/);
  });

  test('模型请求使用 Chrome 同步的 Key，保留模型与温度配置', async () => {
    chrome.storage.local.get.mockResolvedValue({ apiKeys: { qianwen: 'unused-local-key' } });
    chrome.storage.sync.get.mockImplementation(async _key => ({
      apiKeys: { qianwen: 'sync-test-key' },
      models: { qianwen: 'configured-model' },
      temperatures: { qianwen: 0 },
    }));
    await request(streamResponse(['data: {"choices":[{"delta":{"content":"回答"}}]}\n\n']));
    const [, options] = fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer sync-test-key');
    expect(JSON.parse(options.body)).toMatchObject({ model: 'configured-model', temperature: 0 });
  });

  test('损坏的事件数据不能被当作成功回答', async () => {
    const { events } = await request(streamResponse(['data: {invalid-json}\n\n']));
    expect(events.at(-1).type).toBe('error');
    expect(events.some(event => event.type === 'complete')).toBe(false);
  });

  test('DONE 后不继续接收后续内容', async () => {
    const { events } = await request(
      streamResponse([
        'data: {"choices":[{"delta":{"content":"正确回答"}}]}\n\ndata: [DONE]\n\n',
        'data: {"choices":[{"delta":{"content":"不应追加"}}]}\n\n',
      ])
    );
    expect(
      events
        .filter(event => event.type === 'chunk')
        .map(event => event.text)
        .join('')
    ).toBe('正确回答');
  });

  test('配置读取期间端口断开，不再请求模型', async () => {
    const service = new BackgroundChatService();
    const port = createPort();
    service.registerStreamPort('early-disconnect', port);
    const pending = service.processStreamRequest(
      {
        provider: 'qianwen',
        action: 'chat',
        text: '测试问题',
        requestId: 'early-disconnect',
      },
      port
    );
    port.disconnect();
    await pending;
    expect(fetch).not.toHaveBeenCalled();
    expect(port.postMessage).not.toHaveBeenCalled();
  });

  test('向已关闭端口发送失败后清理请求，不再次向端口抛错', async () => {
    const service = new BackgroundChatService();
    const port = createPort();
    fetch.mockResolvedValue(
      streamResponse(['data: {"choices":[{"delta":{"content":"内容"}}]}\n\n'])
    );
    port.postMessage.mockImplementation(event => {
      if (event.type === 'chunk') {
        throw new Error('Port disconnected');
      }
    });
    await expect(
      service.processStreamRequest(
        {
          provider: 'qianwen',
          action: 'chat',
          text: '测试问题',
          requestId: 'closed-port',
        },
        port
      )
    ).resolves.toBeUndefined();
    expect(service.streamPorts.size).toBe(0);
  });
});

describe('页面端流式生命周期', () => {
  async function start() {
    const port = createPort();
    chrome.runtime.connect = jest.fn(() => port);
    const service = new ContentChatService();
    const callbacks = {
      onStart: jest.fn(),
      onChunk: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };
    const id = await service.sendStreamMessage(
      { text: '原始问题', provider: 'qianwen' },
      callbacks
    );
    return { port, service, callbacks, id };
  }

  test('意外断开通知错误，结束生成状态', async () => {
    const { port, service, callbacks, id } = await start();
    port.receive({ type: 'start', requestId: id });
    port.disconnect();
    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    expect(callbacks.onError.mock.calls[0][0].error).toMatch(/连接/);
    expect(service.getActiveStreamCount()).toBe(0);
  });

  test('正常完成后断开不会重复通知错误', async () => {
    const { port, callbacks, id } = await start();
    port.receive({ type: 'start', requestId: id });
    port.receive({ type: 'chunk', requestId: id, text: '完整回答' });
    port.receive({ type: 'complete', requestId: id });
    port.disconnect();
    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  test('主动停止保留已经收到的回答，用于后续追问', async () => {
    const { port, service, callbacks, id } = await start();
    port.receive({ type: 'start', requestId: id });
    port.receive({ type: 'chunk', requestId: id, text: '已经收到的' });
    port.receive({ type: 'chunk', requestId: id, text: '部分回答' });
    service.cancelStreamRequest(id);
    expect(service.getConversationHistory('default').map(message => message.content)).toEqual([
      '原始问题',
      '已经收到的部分回答',
    ]);
    expect(callbacks.onError).not.toHaveBeenCalled();
    expect(service.getActiveStreamCount()).toBe(0);
  });

  test('网络中断保留部分回答，并向界面提供已收到的内容', async () => {
    const { port, service, callbacks, id } = await start();
    port.receive({ type: 'start', requestId: id });
    port.receive({ type: 'chunk', requestId: id, text: '尚未完成的回答' });
    port.disconnect();
    expect(callbacks.onError.mock.calls[0][0].partialText).toBe('尚未完成的回答');
    expect(service.getConversationHistory('default').map(message => message.content)).toEqual([
      '原始问题',
      '尚未完成的回答',
    ]);
  });

  test('取消后收到迟到消息不会改动下一轮对话', async () => {
    const { port, service, callbacks, id } = await start();
    port.receive({ type: 'start', requestId: id });
    service.cancelStreamRequest(id);
    port.receive({ type: 'chunk', requestId: id, text: '迟到回答' });
    port.receive({ type: 'complete', requestId: id });
    expect(callbacks.onChunk).not.toHaveBeenCalled();
    expect(callbacks.onComplete).not.toHaveBeenCalled();
    expect(service.getConversationHistory('default').map(message => message.content)).toEqual([
      '原始问题',
    ]);
  });

  test('开始事件重复送达时不重复保存用户问题', async () => {
    const { port, service, id } = await start();
    port.receive({ type: 'start', requestId: id });
    port.receive({ type: 'start', requestId: id });
    expect(service.getConversationHistory('default')).toHaveLength(1);
  });

  test('销毁服务时停止请求，并清空历史而不报意外断连', async () => {
    const { port, service, callbacks, id } = await start();
    port.receive({ type: 'start', requestId: id });
    port.receive({ type: 'chunk', requestId: id, text: '部分回答' });
    service.destroy();
    expect(service.getActiveStreamCount()).toBe(0);
    expect(service.getConversationHistory('default')).toEqual([]);
    expect(callbacks.onError).not.toHaveBeenCalled();
  });
});

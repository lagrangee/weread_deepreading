import { ChatComponent } from '../src/content/components/chat/chat-component.js';

describe('聊天内容的安全渲染', () => {
  let container;
  let chat;

  beforeEach(() => {
    document.body.innerHTML = '<section><main class="chat-container"></main></section>';
    container = document.querySelector('.chat-container');
    chat = new ChatComponent(container);
  });

  afterEach(() => {
    chat.destroy();
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  test('保留正文、代码块、列表和表格，并安全打开外链', () => {
    const element = chat.appendMessage(
      '**重点**\n\n- 条目\n\n```js\nconst value = 1;\n```\n\n' +
        '| 概念 | 解释 |\n| --- | --- |\n| A | B |\n\n[参考](https://example.com/book)',
      'ai'
    );

    expect(element.querySelector('strong').textContent).toBe('重点');
    expect(element.querySelector('li').textContent).toBe('条目');
    expect(element.querySelector('pre code').textContent).toContain('const value = 1;');
    expect(element.querySelector('td').textContent).toBe('A');
    const link = element.querySelector('a');
    expect(link.href).toBe('https://example.com/book');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  test('普通回答和选文都不能插入脚本、事件属性或远程资源', () => {
    const payload =
      '正文<img src="https://example.com/collect?selection=private" onerror="alert(1)">' +
      '<script>alert(1)</script><iframe src="https://example.com"></iframe>' +
      '<svg onload="alert(1)"><image href="https://example.com/image"></image></svg>' +
      '<style>body { display:none; }</style><p onclick="alert(1)">安全文字</p>';

    for (const type of ['ai', 'user']) {
      const element = chat.appendMessage(payload, type);
      expect(element.querySelector('img, script, iframe, svg, style')).toBeNull();
      expect(element.querySelector('[onerror], [onclick], [onload], [src]')).toBeNull();
      expect(element.textContent).toContain('安全文字');
    }
  });

  test.each([
    '<a href="javascript:alert(1)">危险链接</a>',
    '<a href="java&#x09;script:alert(1)">危险链接</a>',
    '<a href="data:text/html,<script>alert(1)</script>">危险链接</a>',
    '<a href="/web/reader/other">相对链接</a>',
  ])('移除危险或会在阅读站点内导航的链接：%s', payload => {
    const element = chat.appendMessage(payload, 'ai');
    expect(element.querySelector('a[href]')).toBeNull();
  });

  test('流式渲染的每个阶段均清洗内容，完成后仍保留正常Markdown', () => {
    const element = chat.startStreamMessage('解释这段文字');
    chat.appendStreamChunk('**回答** ![追踪图片](https://example.com/collect)');
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('strong').textContent).toContain('回答');
    expect(element.querySelector('.stream-cursor')).not.toBeNull();

    chat.appendStreamChunk('<a href="javascript:alert(1)">危险链接</a>');
    expect(element.querySelector('a[href]')).toBeNull();
    chat.finishStreamMessage();

    expect(element.querySelector('img, [onclick], a[href]')).toBeNull();
    expect(element.querySelector('.stream-cursor')).toBeNull();
    expect(element.querySelector('strong').textContent).toBe('回答');
    expect(chat.isStreaming()).toBe(false);
  });

  test('收到部分回答后断线，保留回答并显示持续可见的中断原因', () => {
    jest.useFakeTimers();
    const element = chat.startStreamMessage('解释这段文字');
    chat.appendStreamChunk('已经收到的**重要解释**。');
    chat.handleStreamError('网络连接已断开，请重试。');
    jest.advanceTimersByTime(6000);

    expect(container.contains(element)).toBe(true);
    expect(element.querySelector('strong').textContent).toBe('重要解释');
    expect(element.classList.contains('error')).toBe(true);
    expect(element.querySelector('.stream-cursor')).toBeNull();
    expect(element.querySelector('[role="status"]').textContent).toContain('内容已保留');
    expect(element.textContent).toContain('网络连接已断开，请重试。');
    expect(chat.isStreaming()).toBe(false);
  });

  test('尚未收到回答时断线，移除空占位并提示错误', () => {
    jest.useFakeTimers();
    chat.startStreamMessage();
    chat.handleStreamError('网络连接已断开，请重试。');

    expect(container.querySelector('.message.ai')).toBeNull();
    expect(container.querySelector('.message.error').textContent).toContain('网络连接已断开');
    expect(chat.isStreaming()).toBe(false);
  });
});

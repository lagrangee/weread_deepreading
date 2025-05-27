# Chrome扩展通信架构使用指南

## 📋 架构概述

本架构提供了一套完整的 Chrome 扩展通信解决方案，实现了 content script、popup、background 之间的高效、可靠通信。

## 🏗 核心组件

### 1. 消息类型定义 (`src/shared/message-types.js`)
- 统一定义所有消息类型
- 避免字符串硬编码
- 提供类型安全检查

### 2. 桥接服务 (`src/shared/bridge-service.js`)
- 通用通信桥接基类
- 处理消息发送、接收、路由
- 提供超时、重试、错误处理

### 3. 环境特定服务
- **Background**: `MessageRouter` - 消息路由和业务处理
- **Content**: `ContentBridge` - 页面环境通信桥接  
- **Popup**: `PopupBridge` - 弹窗环境通信桥接

## 🚀 快速开始

### Background Script 集成

```javascript
// src/background/background.js
import { MessageRouter } from './message-router.js';

// 初始化消息路由器
const messageRouter = new MessageRouter();

console.log('Background script ready');
```

### Content Script 集成

```javascript
// src/content/content.js
import { ContentBridge } from './services/content-bridge.js';
import { MESSAGE_TYPES } from '../shared/message-types.js';

// 初始化通信桥接
const bridge = new ContentBridge();

// 监听bridge事件
bridge.on('bridge:connected', () => {
  console.log('Content bridge connected');
});

// 发送聊天请求示例
async function sendChatMessage(text) {
  try {
    const response = await bridge.sendChatRequest({
      text,
      book: '当前书名',
      author: '作者'
    });
    console.log('Chat response:', response);
  } catch (error) {
    console.error('Chat failed:', error);
  }
}
```

### Popup Script 集成

```javascript
// src/popup/popup.js
import { PopupBridge } from './services/popup-bridge.js';

// 初始化popup桥接
const bridge = new PopupBridge();

// 页面状态检查
async function checkPageStatus() {
  const status = await bridge.getPageStatus();
  if (!status.isWereadPage) {
    showError(status.message);
    return;
  }
  console.log('Page status:', status);
}

// 设置保存示例
async function saveSettings(settings) {
  try {
    const success = await bridge.saveSettings(settings);
    if (success) {
      showSuccess('设置已保存');
    }
  } catch (error) {
    showError('保存失败: ' + error.message);
  }
}
```

## 📝 常用操作示例

### 1. AI聊天通信

```javascript
// Content Script 发送聊天请求
const response = await bridge.sendChatRequest({
  text: selectedText,
  action: 'explain', // 'explain' | 'digest' | 'analyze'
  book: bookName,
  author: authorName
});

// Background Script 处理聊天请求
messageRouter.bridge.on(MESSAGE_TYPES.CHAT.REQUEST, async (data) => {
  const aiResponse = await chatService.processRequest(data);
  return { status: 'success', data: aiResponse };
});
```

### 2. 设置同步

```javascript
// Popup 保存设置
await bridge.saveSettings({
  currentProvider: 'qianwen',
  apiKeys: { qianwen: 'sk-xxx' }
});

// Content Script 监听设置变更
bridge.on('settings:changed', (changes) => {
  if (changes.currentProvider) {
    updateProvider(changes.currentProvider);
  }
});
```

### 3. 面板控制

```javascript
// Popup 控制content中的面板
await bridge.controlPanel('toggle');

// Content Script 响应面板控制
bridge.on('panel:toggle', () => {
  assistantPanel.toggle();
});
```

## 🔧 高级功能

### 1. 健康检查

```javascript
// 检查各环境连接状态
const backgroundHealthy = await bridge.checkBackgroundHealth();
const contentHealthy = await bridge.healthCheck('content');
```

### 2. 广播消息

```javascript
// Background 广播到所有content scripts
await messageRouter.broadcastToContent(MESSAGE_TYPES.SETTINGS.CHANGED, {
  theme: 'dark'
});
```

### 3. 错误处理

```javascript
try {
  const response = await bridge.sendMessage(type, data);
} catch (error) {
  if (error.message.includes('timeout')) {
    // 处理超时
  } else if (error.message.includes('not ready')) {
    // 处理未就绪状态
  }
}
```

## 🎯 最佳实践

### 1. 消息命名规范
```javascript
// 使用命名空间
MESSAGE_TYPES.CHAT.REQUEST     // ✅ 清晰的层级
MESSAGE_TYPES.SETTINGS.UPDATE  // ✅ 语义明确

// 避免混乱命名
'chatMsg'                      // ❌ 不清晰
'update'                       // ❌ 过于宽泛
```

### 2. 错误处理模式
```javascript
// 统一错误响应格式
return {
  status: MESSAGE_STATUS.ERROR,
  error: 'specific error message',
  code: 'ERROR_CODE'
};
```

### 3. 性能优化
```javascript
// 使用超时控制
await bridge.sendMessage(type, data, { timeout: 5000 });

// 及时清理资源
window.addEventListener('beforeunload', () => {
  bridge.destroy();
});
```

### 4. 调试技巧
```javascript
// 开启详细日志
const bridge = new ContentBridge({ debug: true });

// 监听所有消息
bridge.on('*', (type, data) => {
  console.log('Message:', type, data);
});
```

## 🔍 故障排除

### 常见问题

1. **消息超时**
   - 检查目标环境是否准备就绪
   - 确认消息类型正确注册
   - 检查网络连接状态

2. **Content Script 无响应**
   - 验证页面URL匹配manifest配置
   - 检查script注入是否成功
   - 查看控制台错误信息

3. **设置不同步**
   - 确认广播消息正常发送
   - 检查事件监听器绑定
   - 验证存储权限配置

### 调试工具

```javascript
// 查看当前连接状态
console.log('Bridge status:', {
  content: await bridge.healthCheck('content'),
  background: await bridge.healthCheck('background'),
  popup: bridge.isReady()
});

// 监听所有系统事件
bridge.on('system:*', (event, data) => {
  console.log('System event:', event, data);
});
```

## 🔄 扩展指南

### 添加新消息类型

1. 在 `message-types.js` 中定义
2. 在相应的路由器中添加处理器
3. 更新使用文档

### 集成新环境

1. 继承 `BridgeService` 基类
2. 实现环境特定的初始化逻辑
3. 设置消息路由和事件处理

这套架构提供了可扩展、可维护的通信基础，支持复杂的Chrome扩展功能开发。 
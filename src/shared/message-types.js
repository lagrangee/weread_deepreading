/**
 * @file message-types.js
 * @description Chrome扩展统一消息类型定义 - 简化架构版本
 */

// Background 消息类型（仅 AI 相关）
export const BACKGROUND_MESSAGES = {
  // AI聊天相关 
  CHAT: {
    REQUEST: 'CHAT_REQUEST',           // AI 请求（非流式）
    REQUEST_STREAM: 'CHAT_REQUEST_STREAM', // AI 流式请求
    RESPONSE: 'CHAT_RESPONSE',         // AI 响应（广播）
    TEST_API_KEY: 'TEST_API_KEY'       // 测试 API Key
    // 注意：流式请求现在通过Port连接 'stream-chat' 处理，不需要额外的消息类型
  }
};

// 直接通信消息类型（Popup ↔ Content）
export const POPUP_MESSAGES = {
  // 设置管理 - Content Script 直接操作 chrome.storage
  SETTINGS: {
    GET: 'SETTINGS_GET',       // 获取设置
    SET: 'SETTINGS_SET',       // 保存设置
    CHANGED: 'SETTINGS_CHANGED' // 设置变更通知
  },
  
  // 系统状态查询
  SYSTEM: {
    STATUS: 'SYSTEM_STATUS'    // 获取系统状态（供 popup 显示）
  }
};

export const MESSAGE_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending'
};

export const MESSAGE_SOURCE = {
  CONTENT: 'content',
  POPUP: 'popup',
  BACKGROUND: 'background'
}; 
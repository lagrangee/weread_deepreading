/**
 * @file content.js
 * @description 微信读书助手内容脚本 - 简化架构版本
 * @author lagrangee
 * @version 2.0.0
 */

import { CONFIG } from '../shared/config.js';
import { AssistantPanel } from './components/assistant-panel.js';
import { ContentBridge } from './services/content-bridge.js';
import { EventUtils } from './utils/index.js';

/** @type {string} 当前阅读书籍名称 */
let bookName;
/** @type {string} 当前阅读书籍作者 */
let authorName;
/** @type {AssistantPanel} 助手面板实例 */
let assistantPanel;

/**
 * 初始化内容脚本
 * @async
 * @throws {Error} 初始化失败时抛出错误
 */
async function initContentScript() {
  try {
    // 解析页面信息
    await parsePageInfo();

    // 设置为全局变量供其他组件使用
    window.contentBridge = new ContentBridge();

    // 在 bridge 可用后初始化助手面板
    assistantPanel = await AssistantPanel.getInstance(bookName, authorName);

    // 设置页面监听器
    setupPageListeners();

    EventUtils.emit('page:change', { isCover: isInCoverPage() });

    console.log(`${CONFIG.LOG_PREFIX} Content script 初始化成功`);
  } catch (error) {
    console.error(`${CONFIG.LOG_PREFIX} 初始化失败:`, error);
    throw new Error(`初始化失败: ${error.message}`);
  }
}

/**
 * 解析页面信息
 */
async function parsePageInfo() {
  const pageTitle = document.title;
  const parts = pageTitle.split('-').map(part => part.trim());

  if (parts.length >= 3) {
    bookName = parts[0];
    authorName = parts.length === 3 ? parts[1] : parts[2];
    console.log(`${CONFIG.LOG_PREFIX} 页面信息 - 书名: ${bookName}, 作者: ${authorName}`);
  } else {
    console.warn(`${CONFIG.LOG_PREFIX} 无法解析页面标题: ${pageTitle}`);
    bookName = '未知书籍';
    authorName = '未知作者';
  }
}

/**
 * 设置页面监听器
 */
function setupPageListeners() {
  setupCoverPageListener();
  setupTabVisibilityListener();
}

/**
 * 检查是否在封面页
 * @returns {boolean} 是否在封面页
 */
function isInCoverPage() {
  const coverPage = document.querySelector('.horizontalReaderCoverPage');
  return coverPage && window.getComputedStyle(coverPage).display !== 'none';
}

/**
 * 监听封面页状态变化
 */
function setupCoverPageListener() {
  const coverPage = document.querySelector('.horizontalReaderCoverPage');
  if (!coverPage) {
    return;
  }

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const displayValue = window.getComputedStyle(coverPage).display;
        EventUtils.emit('page:change', { isCover: displayValue !== 'none' });
      }
    });
  });

  observer.observe(coverPage, {
    attributes: true,
    attributeFilter: ['style'],
  });
}

/**
 * 监听标签页可见性变化
 */
function setupTabVisibilityListener() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // 标签页变为可见，可以进行一些状态检查
      console.log(`${CONFIG.LOG_PREFIX} 标签页变为可见`);
    }
  });
}

/**
 * 页面卸载前清理
 */
function cleanup() {
  window.contentBridge?.destroy();
  assistantPanel.destroy();
}

/**
 * 初始化函数
 */
function initialize() {
  initContentScript().catch(error => {
    console.error(`${CONFIG.LOG_PREFIX} 初始化错误:`, error);
  });
}

// 页面卸载前清理资源
window.addEventListener('beforeunload', cleanup);

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  setTimeout(initialize, 500);
}

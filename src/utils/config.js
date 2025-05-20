/**
 * @file config.js
 * @description 微信读书助手全局配置（普通版本，供content script使用）
 */

window.CONFIG = {
  // 日志前缀
  LOG_PREFIX: '阅读助手:',
  PROJECT: 'DeepReadingHelper',
  
  // DOM 相关
  COPY_BUTTON_CLASS: 'wr_copy',
  MAX_CONTEXT_LENGTH: 2000,
};

Object.assign(window.CONFIG, {
    LOCAL_STORAGE_KEY: `${window.CONFIG.PROJECT}_Settings`,
  }
);
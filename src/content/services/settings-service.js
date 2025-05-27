/**
 * @file settings-service.js
 * @description 处理所有设置相关的功能，包括位置、模式、字体等设置的保存和加载
 */
import { CONFIG } from '../../utils/config.js';

export class SettingsService {
  /** @type {string} 存储键名前缀 */
  static #STORAGE_KEY_PREFIX = '';

  /** @type {Object} 默认设置 */
  static #DEFAULT_SETTINGS = {
    floating: {
      left: '70%',
      top: '20%',
      width: '300px',
      height: '500px'
    },
    inline: {
      width: '400px',
      height: '100vh',
    },
    mode: 'inline',
    showing: true,
    fontSize: 14,
    pin: {
      right: '20px',
      bottom: '20px'
    },
    darkMode: false,
    provider: CONFIG.DEFAULT_PROVIDER,
  };

  async saveFloating(position) {
    await this.#saveSettings('floating', position);
  }

  async loadFloating() {
    return await this.#loadSettings('floating');
  }

  /**
   * 保存大小设置
   * @param {Object} size - 大小信息
   * @param {string} size.width - 宽度
   * @param {string} size.height - 高度
   */
  async saveInline(size) {
    await this.#saveSettings('inline', size);
  }

  /**
   * 加载大小设置
   * @returns {Promise<Object>} 大小信息
   */
  async loadInline() {
    return await this.#loadSettings('inline');
  }

  /**
   * 保存模式设置
   * @param {Object} mode - 模式信息
   * @param {boolean} mode.isInlineMode - 是否为内联模式
   * @param {boolean} mode.closed - 是否关闭
   */
  async saveMode(mode) {
    await this.#saveSettings('mode', mode);
  }

  /**
   * 加载模式设置
   * @returns {Promise<Object>} 模式信息
   */
  async loadMode() {
    return await this.#loadSettings('mode');
  }

  async saveShowing(showing) {
    await this.#saveSettings('showing', showing);
  }

  async loadShowing() {
    return await this.#loadSettings('showing');
  }

  /**
   * 保存字体大小设置
   * @param {number} fontSize - 字体大小
   */
  async saveFontSize(fontSize) {
    await this.#saveSettings('fontSize', fontSize);
  }

  /**
   * 加载字体设置
   * @returns {Promise<Object>} 字体信息
   */
  async loadFontSize() {
    return await this.#loadSettings('font');
  }

  /**
   * 加载暗黑模式
   * @returns {Promise<boolean>} 是否为暗黑模式
   */
  async loadDarkMode() {
    return await this.#loadSettings('darkMode');
  }

  /**
   * 保存暗黑模式
   * @param {boolean} isDarkMode - 是否为暗黑模式
   */
  async saveDarkMode(isDarkMode) {
    await this.#saveSettings('darkMode', isDarkMode);
  }

  /**
   * 保存Pin按钮位置
   * @param {Object} position - 位置信息
   * @param {string} position.right - 右边距
   * @param {string} position.bottom - 下边距
   */
  async savePinPosition(position) {
    await this.#saveSettings('pin', position);
  }

  /**
   * 加载Pin按钮位置
   * @returns {Promise<Object>} 位置信息
   */
  async loadPinPosition() {
    return await this.#loadSettings('pin');
  }

  async loadProvider() {
    return await this.#loadSettings('provider');
  }

  async saveProvider(provider) {
    await this.#saveSettings('provider', provider);
  }

  /**
   * 保存设置到存储
   * @param {string} key - 设置键名
   * @param {Object} value - 设置值
   * @private
   */
  async #saveSettings(key, value) {
    const storageKey = SettingsService.#STORAGE_KEY_PREFIX + key;
    await chrome.storage.sync.set({ [storageKey]: value });
  }

  /**
   * 从存储加载设置
   * @param {string} key - 设置键名
   * @returns {Promise<Object>} 设置值
   * @private
   */
  async #loadSettings(key) {
    const storageKey = SettingsService.#STORAGE_KEY_PREFIX + key;
    const result = await chrome.storage.sync.get(storageKey);
    return result[storageKey] || SettingsService.#DEFAULT_SETTINGS[key];
  }

  /**
   * 清除所有设置
   * @returns {Promise<void>}
   */
  async clearAllSettings() {
    const keys = Object.keys(SettingsService.#DEFAULT_SETTINGS).map(
      key => SettingsService.#STORAGE_KEY_PREFIX + key
    );
    await chrome.storage.sync.remove(keys);
  }
} 
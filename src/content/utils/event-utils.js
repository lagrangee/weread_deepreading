/**
 * @file event-utils.js
 * @description 事件处理相关的工具函数
 */

import { CONFIG } from '../../shared/config.js';

export class EventUtils {
  /**
   * 事件总线，用于组件间通信
   * @type {Map<string, Set<Function>>}
   */
  static #eventBus = new Map();

  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  static on(event, callback) {
    if (!EventUtils.#eventBus.has(event)) {
      EventUtils.#eventBus.set(event, new Set());
    }
    EventUtils.#eventBus.get(event).add(callback);
  }

  /**
   * 取消订阅事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  static off(event, callback) {
    if (EventUtils.#eventBus.has(event)) {
      EventUtils.#eventBus.get(event).delete(callback);
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  static emit(event, data) {
    if (EventUtils.#eventBus.has(event)) {
      EventUtils.#eventBus.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`${CONFIG.LOG_PREFIX} 事件处理错误:`, error);
        }
      });
    }
  }

  /**
   * 只订阅一次事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  static once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      EventUtils.off(event, wrapper);
    };
    EventUtils.on(event, wrapper);
  }

  /**
   * 清除特定事件的所有订阅
   * @param {string} event - 事件名称
   */
  static clear(event) {
    if (EventUtils.#eventBus.has(event)) {
      EventUtils.#eventBus.delete(event);
    }
  }

  /**
   * 清除所有事件订阅
   */
  static clearAll() {
    EventUtils.#eventBus.clear();
  }

  /**
   * 获取事件的所有订阅者数量
   * @param {string} event - 事件名称
   * @returns {number} 订阅者数量
   */
  static getSubscriberCount(event) {
    return EventUtils.#eventBus.has(event) ? 
      EventUtils.#eventBus.get(event).size : 0;
  }

  /**
   * 检查是否有订阅者
   * @param {string} event - 事件名称
   * @returns {boolean} 是否有订阅者
   */
  static hasSubscribers(event) {
    return EventUtils.getSubscriberCount(event) > 0;
  }
} 
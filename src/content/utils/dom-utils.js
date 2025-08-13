/**
 * @file dom-utils.js
 * @description DOM 操作相关的工具函数
 */

export class DOMUtils {
  /**
   * 创建元素
   * @param {string} tag - 标签名
   * @param {Object} options - 选项
   * @param {string} [options.className] - 类名
   * @param {string} [options.id] - ID
   * @param {Object} [options.styles] - 样式对象
   * @param {Object} [options.attributes] - 属性对象
   * @param {string} [options.text] - 文本内容
   * @param {string} [options.html] - HTML内容
   * @returns {HTMLElement} 创建的元素
   */
  static createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    if (options.className) {
      element.className = options.className;
    }
    
    if (options.id) {
      element.id = options.id;
    }
    
    if (options.styles) {
      Object.assign(element.style, options.styles);
    }
    
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    
    if (options.text) {
      element.textContent = options.text;
    }
    
    if (options.html) {
      element.innerHTML = options.html;
    }
    
    return element;
  }

  /**
   * 获取元素的绝对位置
   * @param {HTMLElement} element - 目标元素
   * @returns {{top: number, left: number}} 位置信息
   */
  static getAbsolutePosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX
    };
  }

  /**
   * 检查元素是否在视口内
   * @param {HTMLElement} element - 目标元素
   * @returns {boolean} 是否在视口内
   */
  static isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  /**
   * 生成唯一ID
   * @param {string} [prefix=''] - ID前缀
   * @returns {string} 唯一ID
   */
  static generateUniqueId(prefix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const uniqueId = `${timestamp}_${random}`;
    return prefix ? `${prefix}_${uniqueId}` : uniqueId;
  }

  /**
   * 确保元素在视口内
   * @param {HTMLElement} element - 目标元素
   */
  static ensureInViewport(element) {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    
    // 转换位置样式为数值
    const top = parseInt(styles.top);
    const left = parseInt(styles.left);
    
    // 调整垂直位置
    if (rect.top < 0) {
      element.style.top = '0px';
    } else if (rect.bottom > window.innerHeight) {
      element.style.top = `${window.innerHeight - rect.height}px`;
    }
    
    // 调整水平位置
    if (rect.left < 0) {
      element.style.left = '0px';
    } else if (rect.right > window.innerWidth) {
      element.style.left = `${window.innerWidth - rect.width}px`;
    }
  }

  /**
   * 防抖函数
   * @param {Function} func - 要执行的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 节流函数
   * @param {Function} func - 要执行的函数
   * @param {number} limit - 时间限制（毫秒）
   * @returns {Function} 节流后的函数
   */
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }
} 
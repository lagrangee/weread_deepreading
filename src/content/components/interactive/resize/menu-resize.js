import { BaseResize } from './base-resize.js';

/**
 * 菜单大小调整组件
 */
export class MenuResize extends BaseResize {
  constructor(element, callbacks) {
    super(element);
    this.onResizeEndCallback = callbacks.onResizeEnd;
  }

  /**
   * 获取手柄配置
   * @returns {Array<{className: string}>}
   */
  getHandleConfigs() {
    return [
      { className: 'se' }, // 右下角
      { className: 'sw' }, // 左下角
      { className: 'e' },  // 右边
      { className: 'w' }   // 左边
    ];
  }

  /**
   * 调整大小移动时的回调
   * @param {number} dx 
   * @param {number} dy 
   * @param {string} direction 
   */
  onResizeMove(dx, dy, direction) {
    // 获取视口尺寸
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    switch (direction) {
      case 'se':
        // 右下角调整：直接改变宽度和高度
        const seWidth = Math.min(this.elementWidth + dx, vw - this.elementX);
        const seHeight = Math.min(this.elementHeight + dy, vh - this.element.offsetTop);
        
        this.element.style.width = `${seWidth}px`;
        this.element.style.height = `${seHeight}px`;
        break;

      case 'sw':
        // 左下角调整：改变宽度和高度，同时调整左边位置
        const swWidth = Math.min(this.elementWidth - dx, this.elementX + this.elementWidth);
        const swHeight = Math.min(this.elementHeight + dy, vh - this.element.offsetTop);
        
        this.element.style.left = `${this.elementX + this.elementWidth - swWidth}px`;
        this.element.style.width = `${swWidth}px`;
        this.element.style.height = `${swHeight}px`;
        break;

      case 'e':
        // 右边调整：只改变宽度
        const eWidth = Math.min(this.elementWidth + dx, vw - this.elementX);
        this.element.style.width = `${eWidth}px`;
        break;

      case 'w':
        // 左边调整：改变宽度和左边位置
        const wWidth = Math.min(this.elementWidth - dx, this.elementX + this.elementWidth);
        if (wWidth < parseInt(this.element.style.minWidth)) 
          break;
        this.element.style.left = `${this.elementX + this.elementWidth - wWidth}px`;
        this.element.style.width = `${wWidth}px`;
        break;
    }
  }

  /**
   * 窗口大小变化时的回调
   */
  onWindowResize() {
    const rect = this.element.getBoundingClientRect();
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    
    // 确保调整后的位置在视口内
    const x = Math.min(rect.left, vw - rect.width);
    const y = Math.min(rect.top, vh - rect.height);
    
    this.element.style.left = `${Math.max(0, x)}px`;
    this.element.style.top = `${Math.max(0, y)}px`;
  }

  /**
   * 结束调整大小时的回调
   */
  onResizeEnd() {
    if (this.onResizeEndCallback) {
      this.onResizeEndCallback();
    }
  }
} 
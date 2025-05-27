import { BaseDrag } from './base-drag.js';

/**
 * Pin按钮拖拽组件
 * @param {HTMLElement} element - 元素
 * @param {Object} callbacks - 回调函数
 * @param {Function} callbacks.onClick - 点击回调
 * @param {Function} callbacks.onDragEnd - 拖拽结束回调
 */
export class PinDrag extends BaseDrag {
  constructor(element, callbacks) {
    super(element);
    this.onClickCallback = callbacks.onClick;
    this.onDragEndCallback = callbacks.onDragEnd;
    this.moveThreshold = 5;
    this.hasMoved = false;
  }

  /**
   * 拖拽开始时的回调
   */
  onDragStart() {
    this.hasMoved = false;
    this.element.classList.add('dragging');
  }

  /**
   * 拖拽移动时的回调
   * @param {number} deltaX 
   * @param {number} deltaY 
   */
  onDragMove(deltaX, deltaY) {
    // 检查是否超过移动阈值
    if (!this.hasMoved && (Math.abs(deltaX) > this.moveThreshold || Math.abs(deltaY) > this.moveThreshold)) {
      this.hasMoved = true;
    }
    
    // 如果没有超过移动阈值，不进行移动
    if (!this.hasMoved) return;
    
    // 计算新位置
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const rect = this.element.getBoundingClientRect();
    
    // 计算相对于右边和底部的距离
    const right = vw - (this.elementX + deltaX + rect.width);
    const bottom = vh - (this.elementY + deltaY + rect.height);
    
    // 边界检查
    const minRight = 0;
    const minBottom = 0;
    const maxRight = vw - rect.width;
    const maxBottom = vh - rect.height;
    
    this.element.style.right = `${Math.min(Math.max(right, minRight), maxRight)}px`;
    this.element.style.bottom = `${Math.min(Math.max(bottom, minBottom), maxBottom)}px`;
    this.element.style.left = 'auto';
    this.element.style.top = 'auto';
  }

  /**
   * 拖拽结束时的回调
   * @param {MouseEvent} e 
   */
  onDragEnd(e) {
    // 如果超过了移动阈值，说明是拖拽操作
    if (this.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      // 保存 pin 位置
      if (this.onDragEndCallback) {
        this.onDragEndCallback();
      }
    } else {
      // 如果没有超过移动阈值，触发点击事件
      if (this.onClickCallback) {
        this.onClickCallback();
      }
    }
    
    this.hasMoved = false;
    this.element.classList.remove('dragging');
  }
} 
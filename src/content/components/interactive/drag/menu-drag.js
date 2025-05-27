import { BaseDrag } from './base-drag.js';

/**
 * 菜单拖拽组件
 */
export class MenuDrag extends BaseDrag {
  constructor(element, callbacks) {
    super(element);
    this.onDragEndCallback = callbacks.onDragEnd;
  }

  /**
   * 判断是否应该忽略拖拽
   * @param {MouseEvent} e 
   * @returns {boolean}
   */
  shouldIgnoreDrag(e) {
    // 如果点击的是关闭按钮，不触发拖拽
    return e.target.closest('.menu-close');
  }

  /**
   * 拖拽开始时的回调
   * @param {MouseEvent} e 
   */
  onDragStart(e) {
    this.element.style.cursor = 'grabbing';
  }

  /**
   * 拖拽移动时的回调
   * @param {number} deltaX 
   * @param {number} deltaY 
   */
  onDragMove(deltaX, deltaY) {
    // 计算新位置
    let newX = this.elementX + deltaX;
    let newY = this.elementY + deltaY;
    
    // 获取视口和元素尺寸
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const rect = this.element.getBoundingClientRect();
    
    // 边界检查
    newX = Math.min(Math.max(newX, 0), vw - rect.width);
    newY = Math.min(Math.max(newY, 0), vh - rect.height);
    
    // 更新位置
    this.element.style.left = `${newX}px`;
    this.element.style.top = `${newY}px`;
  }

  /**
   * 拖拽结束时的回调
   */
  onDragEnd() {
    this.element.style.cursor = '';
    if (this.onDragEndCallback) {
      this.onDragEndCallback();
    }
  }
} 
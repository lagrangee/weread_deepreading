/**
 * 基础拖拽组件
 */
export class BaseDrag {
  constructor(element) {
    this.element = element;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.elementX = 0;
    this.elementY = 0;

    this.initDrag();
  }

  /**
   * 初始化拖拽功能
   */
  initDrag() {
    this.element.addEventListener('mousedown', this.handleDragStart);
  }

  /**
   * 处理拖拽开始
   * @param {MouseEvent} e 
   */
  handleDragStart = (e) => {
    // 如果是从不应该触发拖拽的元素开始的，则返回
    if (this.shouldIgnoreDrag(e)) {
      return;
    }

    document.addEventListener('mousemove', this.handleDragMove);
    document.addEventListener('mouseup', this.handleDragEnd);

    this.isDragging = true;
    const rect = this.element.getBoundingClientRect();
    
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.elementX = rect.left;
    this.elementY = rect.top;
    
    this.onDragStart(e);
  }

  /**
   * 处理拖拽移动
   * @param {MouseEvent} e 
   */
  handleDragMove = (e) => {
    if (!this.isDragging) return;
    
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    
    this.onDragMove(deltaX, deltaY, e);
  }

  /**
   * 处理拖拽结束
   */
  handleDragEnd = (e) => {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleDragMove);
    document.removeEventListener('mouseup', this.handleDragEnd);

    this.onDragEnd(e);
  }

  /**
   * 判断是否应该忽略拖拽
   * @param {MouseEvent} e 
   * @returns {boolean}
   */
  shouldIgnoreDrag(e) {
    return false;
  }

  /**
   * 拖拽开始时的回调
   * @param {MouseEvent} e 
   */
  onDragStart(e) {}

  /**
   * 拖拽移动时的回调
   * @param {number} deltaX 
   * @param {number} deltaY 
   * @param {MouseEvent} e 
   */
  onDragMove(deltaX, deltaY, e) {}

  /**
   * 拖拽结束时的回调
   * @param {MouseEvent} e 
   */
  onDragEnd(e) {}
} 
/**
 * 基础大小调整组件
 */
export class BaseResize {
  constructor(element) {
    this.element = element;
    this.isResizing = false;
    this.startX = 0;
    this.startY = 0;
    this.elementWidth = 0;
    this.elementHeight = 0;
    this.elementX = 0;
    this.resizeDirection = null;

    this.initResize();
  }

  /**
   * 初始化大小调整功能
   */
  initResize() {
    // 创建调整手柄
    this.createHandles();

    // 监听窗口大小变化
    this.initWindowResize();
  }

  /**
   * 创建调整手柄
   */
  createHandles() {
    const handles = this.getHandleConfigs();
    handles.forEach(({className}) => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${className}`;
      handle.addEventListener('mousedown', this.handleResizeStart);
      this.element.appendChild(handle);
    });
  }

  /**
   * 获取手柄配置
   * @returns {Array<{className: string}>}
   */
  getHandleConfigs() {
    return [];
  }

  /**
   * 初始化窗口大小变化监听
   */
  initWindowResize() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        this.onWindowResize();
      }, 100);
    });
  }

  /**
   * 处理开始调整大小
   * @param {MouseEvent} e 
   */
  handleResizeStart = (e) => {
    e.stopPropagation();
    document.addEventListener('mousemove', this.handleResizeMove);
    document.addEventListener('mouseup', this.handleResizeEnd);

    this.isResizing = true;
    this.resizeDirection = e.target.classList.contains('se') ? 'se' :
                          e.target.classList.contains('sw') ? 'sw' :
                          e.target.classList.contains('e') ? 'e' : 'w';
    
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.elementWidth = this.element.offsetWidth;
    this.elementHeight = this.element.offsetHeight;
    this.elementX = this.element.offsetLeft;

    this.onResizeStart(e);
  }

  /**
   * 处理调整大小移动
   * @param {MouseEvent} e 
   */
  handleResizeMove = (e) => {
    if (!this.isResizing) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    this.onResizeMove(dx, dy, this.resizeDirection);
  }

  /**
   * 处理结束调整大小
   */
  handleResizeEnd = () => {
    if (!this.isResizing) return;
    
    this.isResizing = false;
    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.handleResizeEnd);

    this.onResizeEnd();
  }

  /**
   * 窗口大小变化时的回调
   */
  onWindowResize() {}

  /**
   * 开始调整大小时的回调
   * @param {MouseEvent} e 
   */
  onResizeStart(e) {}

  /**
   * 调整大小移动时的回调
   * @param {number} deltaX 
   * @param {number} deltaY 
   * @param {string} direction 
   */
  onResizeMove(deltaX, deltaY, direction) {}

  /**
   * 结束调整大小时的回调
   */
  onResizeEnd() {}
} 
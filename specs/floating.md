# 微信读书深度阅读助手 - 浮动菜单设计规范

## 📋 概述

本文档详细描述微信读书深度阅读助手浮动菜单的设计需求、交互规范和技术实现。

## 🎨 界面设计规范

### 1. 默认位置与尺寸

#### 浮动模式 (Floating Mode)
- **默认位置**: 屏幕右侧，距离右边缘 20px，距离顶部 100px
- **默认尺寸**: 
  - 宽度：`min(400px, 30vw)` (最小400px，最大视口宽度的30%)
  - 高度：`min(600px, 80vh)` (最小600px，最大视口高度的80%)
- **最小尺寸**: 300px × 400px
- **最大尺寸**: 800px × 1000px

#### 内嵌模式 (Inline Mode)
- **位置**: 页面右侧，与内容并排显示
- **宽度**: 固定 400px
- **高度**: 跟随页面内容高度，最小 600px

### 2. 交互功能

#### 拖拽功能 (Drag)
- **拖拽区域**: 面板顶部标题栏（高度 40px）
- **拖拽范围**: 限制在视口内，不允许拖拽到屏幕外
- **拖拽反馈**: 
  - 鼠标悬停时显示拖拽光标 (`cursor: move`)
  - 拖拽时面板透明度降低到 0.8
  - 拖拽时显示位置预览线

#### 调整大小功能 (Resize)
- **调整手柄**: 面板右下角 10px × 10px 区域
- **调整方向**: 支持右下角双向调整
- **调整反馈**:
  - 鼠标悬停时显示调整光标 (`cursor: nw-resize`)
  - 调整时显示尺寸提示
  - 实时更新内容布局

#### 模式切换
- **切换按钮**: 标题栏右侧图标按钮
- **切换动画**: 300ms 缓动动画
- **状态保持**: 用户选择的模式会被记住

## ⌨️ 键盘快捷键

### 全局快捷键

| 快捷键 | 功能 | 作用域 | 说明 |
|--------|------|--------|------|
| `E` | 解释一下 | 全局 | 对选中文本进行解释 |
| `X` | 消化一下 | 全局 | 对选中文本进行消化 |
| `M` | 兼听一下 | 全局 | 对选中文本进行多角度分析 |
| `Esc` | 关闭面板 | 面板激活时 | 隐藏助手面板 |
| `?` | 显示帮助 | 面板激活时 | 显示快捷键帮助 |

### 面板内快捷键

| 快捷键 | 功能 | 作用域 | 说明 |
|--------|------|--------|------|
| `Enter` | 发送消息 | 输入框聚焦时 | 发送当前输入内容 |
| `Shift + Enter` | 换行 | 输入框聚焦时 | 在输入框中插入换行 |
| `Ctrl + K` | 清空对话 | 面板内 | 清空当前对话历史 |
| `Ctrl + C` | 复制消息 | 消息悬停时 | 复制AI回复内容 |

### 快捷键自定义

```javascript
// 快捷键配置结构
const ShortcutConfig = {
  explain: { key: 'E', modifiers: [] },
  digest: { key: 'X', modifiers: [] },
  analyze: { key: 'M', modifiers: [] },
  close: { key: 'Escape', modifiers: [] },
  help: { key: '?', modifiers: [] }
}
```

## 🎯 AI功能按钮

### 按钮布局

```
┌─────────────────────────────────────┐
│  💡 解释一下    📖 消化一下    👂 兼听一下  │
│     (E)          (X)          (M)    │
└─────────────────────────────────────┘
```

### 按钮状态

#### 默认状态
- **背景色**: `#f8f9fa`
- **边框**: `1px solid #e9ecef`
- **文字色**: `#495057`
- **圆角**: `6px`

#### 悬停状态
- **背景色**: `#e9ecef`
- **边框**: `1px solid #dee2e6`
- **过渡**: `all 0.2s ease`

#### 加载状态
- **背景色**: `#6c757d`
- **文字色**: `#ffffff`
- **禁用**: `pointer-events: none`
- **动画**: 旋转加载图标

#### 错误状态
- **背景色**: `#dc3545`
- **文字色**: `#ffffff`
- **持续时间**: 2秒后恢复默认状态

### 按钮交互逻辑

```javascript
// 按钮点击处理流程
const ButtonClickFlow = {
  1: '检查是否有选中文本',
  2: '设置按钮为加载状态',
  3: '发送AI请求',
  4: '等待AI响应',
  5: '更新聊天界面',
  6: '恢复按钮状态'
}
```

## 💬 会话式交互

### 对话界面结构

```
┌─────────────────────────────────────┐
│ 📚 《书名》 - 作者名    🔄 豆包      │  ← 标题栏
├─────────────────────────────────────┤
│                                     │
│  [用户消息气泡]                      │  ← 消息区域
│           [AI回复气泡]               │
│  [用户消息气泡]                      │
│           [AI回复气泡]               │
│                                     │
├─────────────────────────────────────┤
│ [输入框]                    [发送]   │  ← 输入区域
└─────────────────────────────────────┘
```

### 消息气泡设计

#### 用户消息
- **位置**: 右对齐
- **背景色**: `#007bff`
- **文字色**: `#ffffff`
- **最大宽度**: 80%
- **圆角**: `18px 18px 4px 18px`

#### AI消息
- **位置**: 左对齐
- **背景色**: `#f8f9fa`
- **文字色**: `#212529`
- **最大宽度**: 85%
- **圆角**: `18px 18px 18px 4px`

#### 加载消息
- **样式**: 三个跳动的点
- **动画**: 1.4s 无限循环
- **颜色**: `#6c757d`

### 消息功能

#### 消息操作
- **复制**: 每条AI消息右上角显示复制按钮
- **重新生成**: AI消息下方显示重新生成按钮
- **点赞/点踩**: 用于改进AI回复质量

#### 上下文保持
- **会话历史**: 保持当前页面的对话上下文
- **最大消息数**: 限制为50条，超出时删除最早的消息
- **清空功能**: 提供清空对话历史的功能

## 🎨 Markdown 渲染

### 支持的语法

#### 基础语法
- **标题**: `# ## ### #### ##### ######`
- **段落**: 自动换行处理
- **强调**: `**粗体**` `*斜体*`
- **删除线**: `~~删除线~~`

#### 列表
- **无序列表**: `- * +`
- **有序列表**: `1. 2. 3.`
- **嵌套列表**: 支持多级嵌套

#### 代码
- **行内代码**: `` `code` ``
- **代码块**: ``` 三个反引号
- **语法高亮**: 支持常见编程语言

#### 其他
- **引用**: `> 引用内容`
- **链接**: `[文本](URL)`
- **图片**: `![alt](URL)` (仅显示链接)
- **表格**: 标准Markdown表格语法

### 渲染配置

```javascript
// Marked.js 配置
const markedOptions = {
  breaks: true,           // 支持换行
  gfm: true,             // GitHub风格Markdown
  sanitize: true,        // 安全过滤HTML
  highlight: function(code, lang) {
    // 代码高亮处理
    return hljs.highlightAuto(code).value;
  }
}
```

### 样式定制

```css
/* Markdown内容样式 */
.markdown-content {
  line-height: 1.6;
  color: #333;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.markdown-content code {
  background-color: #f6f8fa;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Monaco', 'Consolas', monospace;
}

.markdown-content pre {
  background-color: #f6f8fa;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
}
```

## 📱 响应式设计

### 屏幕适配

#### 大屏幕 (≥ 1200px)
- **默认宽度**: 400px
- **最大宽度**: 500px
- **位置**: 右侧固定

#### 中等屏幕 (768px - 1199px)
- **默认宽度**: 350px
- **最大宽度**: 40vw
- **位置**: 右侧浮动

#### 小屏幕 (< 768px)
- **宽度**: 90vw
- **高度**: 70vh
- **位置**: 居中浮动
- **模式**: 强制浮动模式

### 触摸设备优化

#### 触摸目标
- **最小尺寸**: 44px × 44px
- **间距**: 至少 8px
- **反馈**: 触摸时显示高亮

#### 手势支持
- **拖拽**: 支持触摸拖拽
- **调整大小**: 支持双指缩放
- **滚动**: 支持惯性滚动

## 🔧 技术实现

### 组件结构

```javascript
// AssistantPanel 组件结构
class AssistantPanel {
  constructor() {
    this.mode = 'floating';      // 'floating' | 'inline'
    this.position = { x: 0, y: 0 };
    this.size = { width: 400, height: 600 };
    this.isDragging = false;
    this.isResizing = false;
  }
  
  // 核心方法
  show()                    // 显示面板
  hide()                    // 隐藏面板
  toggleMode()              // 切换模式
  updatePosition(x, y)      // 更新位置
  updateSize(width, height) // 更新尺寸
}
```

### 事件处理

```javascript
// 拖拽事件处理
const DragHandler = {
  onMouseDown(e) {
    this.isDragging = true;
    this.startPos = { x: e.clientX, y: e.clientY };
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  },
  
  onMouseMove(e) {
    if (!this.isDragging) return;
    const deltaX = e.clientX - this.startPos.x;
    const deltaY = e.clientY - this.startPos.y;
    this.updatePosition(this.position.x + deltaX, this.position.y + deltaY);
  },
  
  onMouseUp() {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}
```

### 状态持久化

```javascript
// 状态保存
const StateManager = {
  async saveState() {
    const state = {
      mode: this.mode,
      position: this.position,
      size: this.size,
      isVisible: this.isVisible
    };
    await chrome.storage.local.set({ panelState: state });
  },
  
  async loadState() {
    const result = await chrome.storage.local.get(['panelState']);
    if (result.panelState) {
      Object.assign(this, result.panelState);
    }
  }
}
```

## 🎯 用户体验优化

### 性能优化

#### 渲染优化
- **虚拟滚动**: 消息列表超过50条时启用
- **懒加载**: 图片和代码块按需加载
- **防抖**: 拖拽和调整大小事件防抖处理

#### 内存管理
- **消息清理**: 自动清理超出限制的历史消息
- **事件清理**: 组件销毁时清理所有事件监听器
- **缓存管理**: 合理使用缓存，避免内存泄漏

### 可访问性

#### 键盘导航
- **Tab顺序**: 合理的Tab键导航顺序
- **焦点管理**: 明确的焦点指示器
- **快捷键**: 完整的键盘快捷键支持

#### 屏幕阅读器
- **ARIA标签**: 完整的ARIA属性支持
- **语义化HTML**: 使用语义化的HTML结构
- **文本替代**: 为图标提供文本描述

### 错误处理

#### 网络错误
- **重试机制**: 自动重试失败的请求
- **错误提示**: 友好的错误信息显示
- **降级方案**: 网络异常时的备用方案

#### 用户错误
- **输入验证**: 实时输入验证和提示
- **操作确认**: 重要操作的确认对话框
- **撤销功能**: 支持撤销误操作

## 📋 测试用例

### 功能测试

#### 基础功能
- [ ] 面板显示/隐藏
- [ ] 模式切换（浮动/内嵌）
- [ ] 拖拽功能
- [ ] 调整大小功能
- [ ] 快捷键响应

#### AI功能
- [ ] 解释功能
- [ ] 消化功能
- [ ] 兼听功能
- [ ] 连续对话
- [ ] 错误处理

#### 交互测试
- [ ] 消息发送
- [ ] 消息复制
- [ ] 对话清空
- [ ] Markdown渲染
- [ ] 代码高亮

### 兼容性测试

#### 浏览器兼容
- [ ] Chrome 88+
- [ ] Edge 88+
- [ ] Firefox (扩展版本)

#### 屏幕尺寸
- [ ] 1920×1080 (大屏)
- [ ] 1366×768 (中屏)
- [ ] 768×1024 (平板)
- [ ] 375×667 (手机)

#### 设备类型
- [ ] 桌面设备
- [ ] 触摸设备
- [ ] 高DPI屏幕

---

## 📚 参考资料

- [Material Design - Floating Action Button](https://material.io/components/buttons-floating-action-button)
- [Human Interface Guidelines - Panels](https://developer.apple.com/design/human-interface-guidelines/panels)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Chrome Extension UI Guidelines](https://developer.chrome.com/docs/extensions/mv3/user_interface/)

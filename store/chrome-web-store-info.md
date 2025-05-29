# Chrome Web Store 发布信息

## 基本信息

### 扩展名称
**中文**: 微信读书深度阅读助手
**英文**: WeRead Deep Reading Assistant

### 简短描述 (132字符以内)
**中文**: 微信读书AI助手，提供解释、消化、兼听功能，让阅读更深入高效
**英文**: AI reading assistant for WeRead with explain, digest, and analyze features

### 详细描述

**中文版本**:
```
微信读书深度阅读助手是一个强大的Chrome浏览器扩展，通过集成多个AI大模型，为微信读书用户提供智能阅读辅助功能。

🎯 核心功能：

💡 解释一下 (快捷键: E)
- 对选中文本进行术语解释、背景补充
- 适用于专业术语、人名、概念等

📖 消化一下 (快捷键: X)  
- 将复杂内容转化为易理解的解读
- 包含核心观点、思想流派、历史演进
- 适用于长段落、复杂理论

👂 兼听一下 (快捷键: M)
- 提供多角度分析和不同观点
- 包含支持/反对论据、学者观点、扩展阅读
- 适用于争议性内容、观点分析

🔧 技术特性：
- 支持多AI服务商：文心一言、通义千问、豆包、DeepSeek
- 智能面板系统：浮动/内嵌模式切换，支持拖拽和调整大小
- 会话式交互：支持连续对话，保持上下文
- Markdown渲染：富文本显示，支持代码高亮
- 本地存储：API Key安全存储，设置自动同步
- 快捷键支持：全局快捷键，提升使用效率

🛡️ 隐私安全：
- 本地数据处理，用户数据不上传到服务器
- API Key加密存储在本地
- 权限最小化，只请求必要权限

让阅读更加深入和高效，开启智能阅读新体验！
```

**英文版本**:
```
WeRead Deep Reading Assistant is a powerful Chrome extension that integrates multiple AI models to provide intelligent reading assistance for WeRead users.

🎯 Core Features:

💡 Explain (Shortcut: E)
- Provides term explanations and background information for selected text
- Perfect for technical terms, names, and concepts

📖 Digest (Shortcut: X)  
- Transforms complex content into easy-to-understand interpretations
- Includes core viewpoints, schools of thought, and historical evolution
- Ideal for long paragraphs and complex theories

👂 Analyze (Shortcut: M)
- Offers multi-perspective analysis and different viewpoints
- Includes supporting/opposing arguments, scholarly opinions, and extended reading
- Perfect for controversial content and opinion analysis

🔧 Technical Features:
- Multiple AI providers: Wenxin, Qianwen, Doubao, DeepSeek
- Smart panel system: floating/inline mode switching with drag and resize support
- Conversational interaction: continuous dialogue with context preservation
- Markdown rendering: rich text display with code highlighting
- Local storage: secure API key storage with automatic settings sync
- Keyboard shortcuts: global hotkeys for improved efficiency

🛡️ Privacy & Security:
- Local data processing, no user data uploaded to servers
- Encrypted API key storage locally
- Minimal permissions, only requesting necessary access

Make your reading deeper and more efficient with intelligent reading assistance!
```

### 类别
- 生产力工具 (Productivity)

### 语言
- 中文 (简体)
- English

## 图片素材

### 图标要求
- ✅ 已准备: 16x16, 32x32, 48x48, 64x64, 128x128 PNG格式
- 位置: `assets/icons/`

### 截图要求 (需要准备)
1. **主界面截图** (1280x800)
   - 显示微信读书页面和助手面板
   - 展示三个AI功能按钮

2. **解释功能演示** (1280x800)
   - 选中文本并使用解释功能
   - 显示AI回复结果

3. **消化功能演示** (1280x800)
   - 长段落文本的消化分析
   - 展示结构化的分析结果

4. **兼听功能演示** (1280x800)
   - 多角度分析展示
   - 显示不同观点对比

5. **设置界面** (1280x800)
   - 显示popup设置页面
   - 展示多AI服务商选择

### 宣传图片 (可选)
- 小型宣传图片: 440x280
- 大型宣传图片: 920x680

## 权限说明

### 必需权限
- **storage**: 存储用户设置和API密钥
- **activeTab**: 访问当前标签页内容
- **scripting**: 注入内容脚本
- **clipboardRead**: 读取剪贴板内容

### 主机权限
- **https://weread.qq.com/**: 微信读书网站
- **AI服务商API域名**: 用于AI请求

### 权限使用说明
```
本扩展需要以下权限来提供完整功能：

1. 存储权限 (storage)
   - 用途：保存用户的API密钥和偏好设置
   - 说明：所有数据仅存储在本地，不会上传到任何服务器

2. 活动标签页权限 (activeTab)
   - 用途：在微信读书页面注入助手功能
   - 说明：仅在用户主动使用时访问页面内容

3. 脚本注入权限 (scripting)
   - 用途：在微信读书页面添加AI助手界面
   - 说明：仅在微信读书域名下工作

4. 剪贴板读取权限 (clipboardRead)
   - 用途：快速获取用户复制的文本进行分析
   - 说明：仅在用户主动触发时读取

5. 网络请求权限
   - 用途：向AI服务商发送分析请求
   - 说明：仅向用户配置的AI服务商发送请求
```

## 隐私政策

### 隐私政策URL
需要创建并托管隐私政策页面，建议URL：
`https://github.com/lagrangee/weread_deepreading/blob/main/PRIVACY.md`

### 隐私政策内容要点
1. 数据收集：仅收集用户主动输入的文本和设置
2. 数据存储：所有数据本地存储，不上传到服务器
3. 数据使用：仅用于提供AI分析功能
4. 第三方服务：可能向用户选择的AI服务商发送请求
5. 数据安全：API密钥加密存储

## 支持信息

### 支持网站
`https://github.com/lagrangee/weread_deepreading`

### 支持邮箱
需要提供一个支持邮箱地址

## 发布检查清单

### 技术检查
- [x] 扩展包大小 < 128MB
- [x] 所有必需文件包含在内
- [x] manifest.json格式正确
- [x] 图标文件完整
- [x] 权限声明准确

### 内容检查
- [ ] 截图准备完成
- [ ] 描述文本无语法错误
- [ ] 隐私政策页面创建
- [ ] 支持联系方式确认

### 合规检查
- [x] 不包含恶意代码
- [x] 权限使用合理
- [x] 用户数据保护
- [x] 功能描述准确

## 发布流程

1. **登录开发者控制台**
   - 访问: https://chrome.google.com/webstore/developer/dashboard
   - 使用Google开发者账号登录

2. **创建新项目**
   - 点击"新增项目"
   - 上传 `weread-deepreading-v1.0.0.zip`

3. **填写商店信息**
   - 复制上述描述和信息
   - 上传截图和图标
   - 设置价格（免费）

4. **提交审核**
   - 检查所有信息
   - 提交审核
   - 等待Google审核（通常1-3个工作日）

5. **发布后维护**
   - 监控用户反馈
   - 及时修复问题
   - 定期更新功能 
# 微信读书助手 (WeRead Assistant)

## 项目介绍
微信读书AI助手是一个Chrome浏览器扩展，为微信读书用户提供智能阅读辅助功能，包括文本解释、内容消化、兼听等功能。

## 功能特性
- 智能文本解释：对选中文本进行智能解释和分析
- 内容消化：将长文本转化为易于理解的摘要
- 兼听功能：支持文本到语音的转换
- 跨设备同步：支持阅读进度和笔记的跨设备同步

## 项目结构
```
src/
  ├── ai/            # AI服务相关代码
  │   └── service.js
  ├── background/    # 后台服务脚本
  │   └── background.js
  ├── content/       # 内容脚本
  │   ├── content.js
  │   ├── floating-menu.html
  │   └── floating-menu.css
  ├── popup/         # 弹出窗口相关
  │   ├── popup.html
  │   ├── popup.css
  │   └── popup.js
  └── utils/         # 工具函数
      ├── config.js
      └── config.esm.js
assets/              # 静态资源
  └── icons/         # 图标文件
```

## 开发指南

### 环境要求
- Chrome浏览器 (最新版本)
- Node.js >= 14.0.0

### 安装步骤
1. 克隆仓库
```bash
git clone https://github.com/lagrangee/weread-deepreading.git
cd weread_deepreading
```

2. 安装依赖
```bash
npm install
```

3. 在Chrome中加载扩展
- 打开Chrome浏览器，访问 `chrome://extensions/`
- 开启"开发者模式"
- 点击"加载已解压的扩展程序"
- 选择项目目录

### 开发规范
- 代码风格遵循ESLint配置
- 使用ES6+语法
- 所有新功能需要添加相应的测试
- 提交代码前进行本地测试

### 调试指南
1. 后台脚本调试
   - 在扩展管理页面点击"背景页"进行调试
2. 内容脚本调试
   - 在微信读书页面打开开发者工具
   - 在Console面板查看日志输出
3. 弹出窗口调试
   - 右键扩展图标，检查弹出内容

## API文档

### 存储API
使用`chrome.storage.sync`进行数据存储和同步：
```javascript
// 存储数据
chrome.storage.sync.set({key: value});

// 读取数据
chrome.storage.sync.get(['key'], function(result) {
  console.log('Value currently is ' + result.key);
});
```

### AI服务API
详细的AI服务API文档请参考 `src/ai/service.js`

## 贡献指南
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 版本历史
- 1.0.0
  - 初始版本发布
  - 基本功能实现：文本解释、内容消化、兼听

## 许可证
MIT License - 查看 LICENSE 文件了解详情

## 联系方式
项目维护者 - lagrangee

项目链接: https://github.com/lagrangee/weread-deepreading

## 核心功能

通过 AI 大模型增强阅读体验，提供以下交互能力：

1. **💡 解释一下**  
   - 功能：对选中的文本进行术语解释、背景补充 。
   - 输入：用户选中的文本（如 `"哈耶克","扩展秩序"，"自由主义"`）。  
   - 输出：通俗易懂的解释。
   - 错误处理：当 AI 无法理解或解释时的后备方案
   - 展示形式：支持富文本（如加粗、列表等）

2. **📖 消化一下**  
   - 功能：选中文本内容可能专业性很强或者难以理解，对大众读者不友好，需要进行扩展解读，降低理解门槛，方便学习记忆
   - 输入：长段落文本。
   - 输出：容易理解、学习和记忆的解读:最好可以分为"核心观点"、"思想流派"、"历史演进"三个部分
   - 输出长度限制：控制在 300-1000 字

3. **👂 兼听一下**  
   - 功能：对于选中文本内容中的观点提供多角度分析（如正反观点、相关案例）,兼听则明，帮助读者更全面的学习了解。  
   - 输入：可能有争议性的内容（如 `"自由意志是否存在"`）。  
   - 输出：结构化分析（如 `"支持观点：...；反对观点：..."`）, 最好能引用具体的学者或文献链接方便读者做扩展阅读，做到清晰有条理有重点的排版

---

## 技术实现

### 1. AI 服务选择

- **API 提供商**：文心一言、通义千问、豆包、 deepseek
- **请求方式**：通过 `fetch` 调用 RESTful API，需处理鉴权（API Key）。  

### 2. 代码结构

```plaintext
src/
├── ai/
│   ├── service.js      # 封装 AI 请求逻辑
│   └── prompts.js      # 存储不同功能的提示词模板
├── content.js          # 绑定按钮事件
└── background.js       # 管理敏感操作（如 API Key）
```

### 3. 用户配置

- **API KEY配置**
用户可对每个 AI 服务商输入自己的 API_KEY，并安全保存在本地

## 性能优化

### 1. 请求优化

- 请求防抖（避免频繁调用）
- 失败重试机制
- 超时处理

### 2. 展示优化

- 骨架屏加载

## 依赖与权限

- **Chrome 权限**：需在 `manifest.json` 声明：  
- **环境变量**：API Key 应通过 `chrome.storage.local` 安全存储。

---

## 后续计划

- [ ] 支持用户自定义提示词  
- [ ] 添加多模型切换

---

## 用户体验设计

### 1. 交互反馈

- 加载状态展示
- 错误提示样式
- 复制功能
- 分享功能

### 2. 个性化配置

- 字体大小调整
- 暗黑模式支持
- 快捷键支持
- 历史记录管理

## 安全性设计

### 1. 数据安全

- API Key 加密存储方案
- 用户数据本地存储加密
- 敏感信息处理策略

### 2. 合规性

- 用户隐私政策
- 数据使用声明
- 免责声明

## 发布计划

### 1. 版本规划

- v1.0: 基础功能（解释、消化、兼听）
- v1.1: 性能优化和bug修复
- v1.2: 用户体验改进

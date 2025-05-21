# Chrome Web Store 提交清单 / Submission Checklist

## 准备材料 / Preparation Materials

### 1. 开发者账号 / Developer Account
- [ ] 注册 Chrome Web Store 开发者账号
- [ ] 支付一次性注册费 ($5)
- [ ] 完成开发者信息验证
- [ ] 设置双因素认证（推荐）

### 2. 扩展打包 / Extension Package
- [ ] 更新 manifest.json 版本号为 1.0.0
- [ ] 检查所有必要文件是否包含
  - [x] manifest.json
  - [x] 后台脚本 (background.js)
  - [x] 内容脚本 (content.js)
  - [x] 弹出窗口 (popup.html/js)
  - [x] 图标文件
  - [x] 样式文件
- [ ] 移除开发时的调试代码和注释
- [ ] 压缩和优化 JavaScript 文件
- [ ] 创建发布版本的 zip 包

### 3. 商店素材 / Store Assets
- [x] 图标文件 (必需)
  - [x] 16x16 图标
  - [x] 32x32 图标
  - [x] 48x48 图标
  - [x] 128x128 图标
- [ ] 商店宣传图 (必需)
  - [ ] 小图 (440x280)
  - [ ] 大图 (920x680)
- [ ] 功能截图
  - [ ] 文本选择和快捷菜单截图
  - [ ] 文本解释功能截图
  - [ ] 内容消化功能截图
  - [ ] 设置界面截图
- [x] 简短描述 (最多 132 字符)
- [x] 详细描述 (最多 16,000 字符)
- [x] 隐私政策说明

### 4. 功能测试 / Feature Testing
- [ ] 核心功能测试
  - [ ] 文本选择和复制
  - [ ] AI 服务调用
  - [ ] 结果显示和格式化
  - [ ] 设置保存和加载
- [ ] 错误处理测试
  - [ ] API 调用失败处理
  - [ ] 网络错误处理
  - [ ] 输入验证
- [ ] 界面测试
  - [ ] 响应式布局
  - [ ] 主题切换
  - [ ] 动画效果
- [ ] 性能测试
  - [ ] 内存使用
  - [ ] CPU 占用
  - [ ] 启动时间

## 提交步骤 / Submission Steps

### 1. 准备提交 / Preparation
- [ ] 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [ ] 登录开发者账号
- [ ] 点击 "New Item" (新建项目)
- [ ] 上传打包好的 zip 文件

### 2. 填写商店信息 / Store Information
- [ ] 选择分类：生产力工具 (Productivity)
- [ ] 填写语言信息
  - [ ] 中文描述
  - [ ] 英文描述（可选）
- [ ] 上传promotional assets
  - [ ] 宣传图
  - [ ] 截图
- [ ] 设置可见性和发布范围
  - [ ] 选择目标国家/地区
  - [ ] 设置为公开或私有测试
- [ ] 添加隐私政策链接

### 3. 合规性检查 / Compliance Check
- [ ] 确保符合 [Chrome Web Store 政策](https://developer.chrome.com/docs/webstore/program_policies)
- [ ] 检查权限使用是否合理
- [ ] 验证隐私政策是否完整
- [ ] 确认没有使用未经授权的第三方内容

### 4. 提交审核 / Submit for Review
- [ ] 最终检查所有必需项
- [ ] 提交审核申请
- [ ] 记录提交时间和版本号

## 审核后 / Post-Review

### 1. 审核通过 / Approval
- [ ] 在社交媒体宣传推广
- [ ] 监控用户反馈
- [ ] 准备后续更新计划

### 2. 审核未通过 / Rejection
- [ ] 仔细阅读拒绝原因
- [ ] 根据反馈修改问题
- [ ] 准备重新提交
  - [ ] 更新版本号
  - [ ] 添加更新说明
  - [ ] 重新打包

## 维护计划 / Maintenance Plan
1. 定期检查和更新
   - [ ] 每月检查一次功能是否正常
   - [ ] 及时响应用户反馈
   - [ ] 定期更新依赖包

2. 版本更新计划
   - [ ] 建立版本更新路线图
   - [ ] 准备更新说明模板
   - [ ] 设置自动化测试流程

3. 用户支持
   - [ ] 建立问题反馈渠道
   - [ ] 准备常见问题解答
   - [ ] 设置响应时间目标

## 重要提醒 / Important Notes
1. 保存所有开发和发布相关的账号信息
2. 记录每次提交和更新的详细信息
3. 备份所有源代码和资源文件
4. 保持与用户的积极沟通 
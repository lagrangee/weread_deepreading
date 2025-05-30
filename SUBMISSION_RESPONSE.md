# Chrome扩展商店重新提交说明

## 问题修复报告

### 原问题
**违规行为**: 请求但不使用以下权限：
- `scripting`
- `notifications`

**违规行为参考 ID**: Purple Potassium

### 已修复的问题

#### 1. 移除未使用的权限
我们已经从 `manifest.json` 中移除了以下未使用的权限：

**移除的权限：**
- ❌ `scripting` - 已从 `permissions` 数组中移除
- ❌ `notifications` - 已从 `optional_permissions` 数组中移除
- ❌ `clipboardRead` - 经过代码审查发现未实际使用，已移除

**当前保留的权限（已验证实际使用）：**
- ✅ `storage` - 用于保存用户的API密钥和偏好设置
- ✅ `activeTab` - 用于在微信读书页面注入助手功能

#### 2. 更新相关文档
同时更新了以下文档以保持一致性：
- `PRIVACY.md` - 隐私政策中的权限说明
- `store/chrome-web-store-info.md` - 商店信息中的权限描述
- `store/final-publish-guide.md` - 发布指南中的权限列表

### 技术实现说明

#### 为什么不需要 `scripting` 权限
我们的扩展使用 `content_scripts` 配置在 `manifest.json` 中声明式地注入内容脚本，而不是使用动态脚本注入：

```json
"content_scripts": [
  {
    "matches": ["https://weread.qq.com/web/reader/*"],
    "js": ["content-vendor.bundle.js", "content.bundle.js"],
    "css": ["content/assistant-panel.css"],
    "run_at": "document_end"
  }
]
```

这种方式完全不需要 `scripting` 权限。

#### 为什么不需要 `notifications` 权限
我们的扩展目前不使用系统通知功能，所有的用户反馈都通过扩展内的UI界面提供。

### 验证方法

可以通过以下方式验证我们确实不使用这些权限：

1. **代码搜索验证**：
   - 搜索 `chrome.scripting` - 无匹配结果
   - 搜索 `chrome.notifications` - 无匹配结果

2. **功能测试验证**：
   - 扩展在移除这些权限后功能完全正常
   - 所有核心功能（AI文本分析、设置管理、界面交互）均可正常使用

### 当前版本信息

- **版本**: 1.0.0
- **构建时间**: 2025-05-30T05:31:36.382Z
- **包文件**: `weread-deepreading-v1.0.0.zip`

### 合规性确认

✅ **权限最小化**: 现在只请求实际使用的最小权限集  
✅ **功能完整性**: 移除权限后所有功能正常工作  
✅ **文档一致性**: 所有相关文档已同步更新  
✅ **隐私保护**: 权限使用符合隐私政策声明  

## 重新提交请求

我们已经根据审核反馈完全修复了权限问题，请重新审核我们的扩展。我们确保：

1. 严格遵循Chrome Web Store的权限政策
2. 只请求为实现产品功能而必须具备的最基本权限
3. 不会为了保障产品的未来发展而请求不必要的权限

感谢审核团队的反馈，这帮助我们提供了一个更加安全和合规的扩展。

---

**联系方式**:
- GitHub: https://github.com/lagrangee/weread-deepreading
- Email: lagrangee@gmail.com 
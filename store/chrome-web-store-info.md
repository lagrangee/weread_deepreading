# Chrome Web Store 更新材料：v1.2.0

本次更新现有扩展，不新建项目。

- 扩展 ID：`fpfnheijilacdeckokegbnkafecnmkia`
- 名称：微信读书深度阅读助手
- 版本：1.2.0
- 类别：工具
- 支持邮箱：lagrangee@gmail.com
- 官网/源码：https://github.com/lagrangee/weread_deepreading
- 数据说明：https://github.com/lagrangee/weread_deepreading/blob/main/PRIVACY.md
- 详细描述：使用本目录 [description.md](description.md) 的中文版本。
- 上传包：`weread-deepreading-v1.2.0.zip`

## 新版说明

新增同一作者的深读 iPhone App 下载入口，二维码和链接直接打开 App Store。面板入口可隐藏；设置页「关于」保留入口。修复中文输入法误发送、面板关闭状态、流式尾帧/错误帧处理和连接中断的恢复；清洗回答中的 HTML 并保留中断前收到的内容。

## 数据实践

API Key 与配置继续使用 `chrome.storage.sync`，可按 Chrome 账号与同步设置同步；扩展不额外加密密钥。选文、书籍信息与会话直接交给用户选择的 AI 服务商，不经过开发者服务器。开发者不采集使用统计。推荐关闭状态保存在 `chrome.storage.local`，二维码随包提供，无跟踪参数。

## 发布前核对

1. 运行 `npm ci`、`npm test -- --runInBand`、`npm run package`、`npm run pre-publish`。
2. 在原有扩展中上传新版，不创建重复扩展。
3. 核对包版本、商店描述和线上隐私说明，保持一致。
4. 按实际可观察行为核对商店隐私字段；读取书籍信息和调用 AI 的说明不得写成“所有数据都不离开本机”。
5. 核对新版截图与审核结果，提交后记录实际状态。

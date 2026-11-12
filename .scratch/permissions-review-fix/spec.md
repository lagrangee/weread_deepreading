# 审核修复：最小权限

## 用户决定

- Yellow Argon 的描述修改已经由用户完成。本轮不重改、不恢复原来的服务商名单。
- 保留当前后台 701 字描述，上传新包前后逐字核对。
- 先撤回待审核的 1.2.0，再尝试用修复包直接替换 1.2.0；若后台要求递增版本，以实际校验为准。
- 保留 API Key 随 Chrome 账号同步。

## 当前证据

2026-11-12 后台为待审核，软件包修订号 00011、版本 1.2.0，仍含 storage、activeTab 和主机授权；线上已发布版本为 1.1.4。
Google 的 Purple Potassium 通知要求移除未使用的 activeTab 并检查其他权限。邮件没有标出具体修订号，不推断两条拒绝通知对应同一次提交。

## 权限核对

| 权限或域名 | 实际用途与处理 |
| --- | --- |
| storage | 保存/同步 API Key、模型和界面偏好，保留 |
| activeTab | 图标点击只打开设置页，无临时标签页授权需求；移除 |
| weread.qq.com | 设置页按 URL 查询阅读标签页并发送配置更新；保留 |
| qianfan.baidubce.com | 实际模型 API；由 *.baidubce.com 收窄 |
| ark.cn-beijing.volces.com | 实际模型 API；由 *.volces.com 收窄 |
| dashscope.aliyuncs.com、api.moonshot.cn、api.minimaxi.com、open.bigmodel.cn | 实际模型 API，保留 |
| open.bigmodel.ai | 仅作为外部控制台链接，无扩展 fetch；移除 |

阅读界面由 content_scripts.matches 声明式加载；tabs.query/sendMessage 并不因此需要 activeTab 或 tabs。

## 修复与验证

- 修复旧权限检查脚本的错误判断：不再把任意 chrome.tabs 调用当作 activeTab 用途。
- 发布前按实际 API 配置验证精确域名和 storage；阻止无关权限回归。
- 新权限测试在旧 manifest 上 2 项失败；修复后 6 套、41 项测试通过。
- 隔离 Chromium 真实加载插件：16 项场景通过；实际授权为 storage，加已声明的 API/微信读书域名及阅读页匹配。
- 真实验证无 activeTab/tabs 时的阅读页注入、按 URL 查询微信读书标签页、设置服务商往返同步与页面刷新。
- 生产构建、发布前检查和 ZIP 一致性检查通过。未调用真实收费模型。

## 官方依据

- https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- https://developer.chrome.com/docs/webstore/cancel-review

## 提交结果

- 取消审核请求曾显示“取消时出错”；刷新后后台变为可编辑的“已拒绝”草稿，不再有在审任务。无法仅据此判断是取消生效还是原审核完成。
- 后台接受了同版本替换：版本保持 1.2.0，上传后草稿权限仅显示 storage 与 host permission。
- 用户原有 701 字说明在上传前后逐字相同，未重新处理 Yellow Argon。
- 更新 storage / host 用途说明，并按真实数据流披露身份验证信息、个人通讯和网站内容。
- 重新提审关闭“审核通过后自动发布”，审核通过后由发布者手动发布。
- 最终后台显示“已将您的扩展程序提交送审”，并提示分阶段发布在审核通过 30 天后过期。当前为已送审、等待审核，关闭自动发布；不代表审核通过或线上已更新。
- 实际提交修订号未读取；不根据旧修订号推算。

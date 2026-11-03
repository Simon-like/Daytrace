# OWNER-001：真实主人身份与双端私密检索报告

日期：2026-11-04。范围：F1 协议、持久会话、主人检索和双端本地功能验收；不包含真实 Auth0 账户、真实 iPhone/Safari 或生产发布验收。

## 交付结果

- `5b72990`：主人搜索在 Nest 会话授权后读取独立 owner 索引，支持状态与可见性过滤；公开与主人游标、内容修订隔离。
- `9598938`：接入 `openid-client` 6.8.8 的 Auth0 OIDC discovery、授权码、PKCE S256、state、nonce 和 claims 校验；长期 SQLite 会话可重启恢复，不保存 access token。
- `10c0a1d`：桌面主人搜索、私密阅读、退出和 401 清空／重新登录。
- `5c2a631`：H5 `/owner` 与主人阅读路由，复用相同搜索状态机和服务端权限边界。
- `5e34646`：`main`、`dev` 推送触发同一 CI，H5 浏览器纳入托管回归；release-build 仍只接受受信 `main`。

以上提交均已推送 `dev`，未合并 `main`、未部署。F2 内容维护继续复用 Codex CONTENT-003 的已交付能力，没有另写第二套后台。

## 实际验证

| 验证 | 结果 |
| --- | --- |
| 单元测试 | 54／54，通过；含 OIDC 协议、公开／主人搜索解析、会话失效状态 |
| HTTP 与 Demo 集成 | 11＋14＋5，通过；含访客 401、公开 canary 负例、SQLite 重启、旧事务防重放 |
| 内容管理 | 10／10，通过；确认本轮没有破坏 F2 发布、恢复与导出 |
| 桌面 Chromium | 19 条用户路径、56 组视口通过，脚本错误 0；[证据](../evidence/OWNER-001/desktop-browser.json) |
| H5 Chromium | 6 组检查、26 组布局通过，脚本错误 0；[证据](../evidence/OWNER-001/mobile-browser.json) |
| lint / typecheck / test:content / build | 全部通过；桌面、H5 与 API 生产构建成功 |
| GitHub Actions | dev 提交 `5e34646` 的 CI 运行 `41673478290` 已完成且结论为 success；[运行证据](../evidence/OWNER-001/ci-run.json) |

本机执行使用 Node 24.22.1，对项目声明的 24.18.0 仅有 pnpm engine warning；托管 CI 使用锁定的 24.18.0。Chromium 视口不是 iPhone 或 Safari。

## 尚未通过的外部门槛

- 没有用用户真实 Auth0 租户与账户做浏览器登录验收；协议客户端使用注入操作的自动化测试，合成身份只用于隔离 Demo。
- 没有真实 iPhone／Safari、生产 HTTPS／CDN、备份恢复或生产回滚证据。
- 桌面阅读页必要脚本 gzip 为 141951 bytes，仍高于 81920 bytes 初始预算；功能通过不等于性能预算通过。

下一步按已登记的 LINK-001 推进记录关联与菜谱实践对照，继续保持公开与主人投影隔离。

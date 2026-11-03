# 任务交接

| 项目 | 内容 |
| --- | --- |
| 任务ID / owner / 工具 | OWNER-001 / `kimi-F1-001-owner` / Kimi |
| 用户授权与范围 | 梳理 Codex 与里程碑，迭代完整功能并建设 CI/CD；本轮完成 F1 和 dev 门禁，不合并 main、不部署 |
| 基线 / 分支 / 提交 | dev；`5b72990`、`9598938`、`10c0a1d`、`5c2a631`、`5e34646`，均已推送 |

## 改了什么

接通 Auth0 OIDC 协议客户端和持久 SQLite 会话；增加授权后的独立主人索引；桌面与 H5 都可登录、检索、阅读、退出和从 401 恢复。CI 对 main/dev 使用同一门禁，并增加 H5 浏览器证据。公开搜索仍使用独立公开投影，没有在浏览器过滤私密字节。

## 怎样验证

单元 54／54；HTTP／Demo 11＋14＋5；内容管理 10／10；桌面 19 路径／56 视口；H5 6 检查／26 布局；lint、typecheck、build 全通过。托管 CI 运行 `41673478290` 结论 success。完整数据见 `docs/project/evidence/OWNER-001/` 与 `docs/project/reports/OWNER-001.md`。

## 下一位怎么接

- 尚未完成：真实 Auth0 账户、真实 iPhone/Safari、生产 HTTPS、备份恢复和性能预算不是本轮已通过项。
- 下一步：认领 LINK-001，先实现 relatedRecords 的快照校验与 public／owner 详情投影，再接双端 UI。
- 恢复与现场：不覆盖既有 next-env、ARCH-001 evidence 和未跟踪设计资产；测试只用合成内容，生产配置只保留占位模板。

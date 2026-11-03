# OWNER-001：真实主人身份与双端私密检索

## 目标

在现有 SQLite 会话、OwnerGuard 与内容权限边界上，接通 Auth0 OIDC 授权码 + PKCE + nonce 校验，交付桌面与 H5 主人搜索、私密阅读、退出和会话失效恢复。公开搜索继续使用独立公开投影。

## 交付与验收

- `openid-client` 正式客户端接入运行时；生产配置要求 HTTPS、主人白名单与持久会话数据库。
- 主人搜索先授权后读取独立索引，支持标题、标签、正文及状态／可见性过滤；访客 401，公开 scope 不泄露私密 canary。
- 桌面与 H5 可登录、检索、打开私密记录、退出；401 清空旧结果并提供重新登录，不当作空结果。
- 协议单测、HTTP 正负例、持久会话、双端浏览器、lint/typecheck/build 全量通过。
- 真实 Auth0 账户、真实 iPhone/Safari 与生产部署是独立外部验收，未执行不得标通过。

实施细节见[实施计划](../../plans/2026-11-03-owner-identity-search.md)。

## 边界与交接

owner 为 `kimi-OWNER-001-owner`，只在 `dev` 串行集成，不新建任务分支，不合并 `main` 或部署。允许修改 API auth/search/app 入口、桌面与 H5 owner/search 适配、共享搜索 API、相关测试、Auth0 配置模板和本任务文档；不覆盖既有未提交现场。每个功能边界独立提交并推送 `dev`。

# LOCAL-002 本地 OIDC 双端来源

真实 OIDC 的 development 配置可显式设置 `LOCAL_H5_ORIGIN`：仅接受与 `PUBLIC_ORIGIN` 协议和回环主机相同的来源；默认不开放额外端口，生产拒绝该变量和额外写入来源。开发 HTTP 主站必须使用回环主机，登录回调仍固定主站，既有 Origin、CSRF 与会话保护继续生效。本地配置和持久目录使用方法见开发手册。

Node 24.18.0：完整 HTTP／身份／Demo 集成、typecheck、lint、文档检查通过。注入的合成 OIDC 协议客户端、临时 SQLite 和真实 Nest HTTP 验证主站登录、指定 H5 导入、主站提交私密草稿、未授权端口拒绝；覆盖生产、不同主机／协议、非回环来源等负例。隔离 Chromium 与该合成协议客户端验证登录、H5 直连私密保存与公开读取 404。尚未使用真实 Auth0 租户、真实身份或 iPhone/Safari；不代表上线验收。基线 `21fae40` 的 GitHub Actions 运行 42464397104 全部通过，本次提交托管结果待确认；未合并 main、未部署。

# SECURITY-001 集成交接

- 日期：2026-10-30
- 执行者：kimi-security；基线：203d204
- 最终任务提交：4ba4842d3c0c6d886f037092fbb4df68c824bc72
- 集成交接：已合并 main；未部署

详细交接见 `experiments/SECURITY-001/handoff.md`，方案见 `docs/architecture/security/主人身份与访问边界.md`。

推荐 Auth0 托管 OIDC + Nest 精确 issuer/subject 白名单 + 不透明可撤销服务端会话；Next 仅向固定 Nest 接口转发唯一会话 Cookie。私密正文、附件、搜索、错误均 no-store；单实例持久会话建议 SQLite，多实例前迁移 PostgreSQL。

17 组真实回环 HTTP 安全模型测试覆盖访客、主人、非主人、过期、注销、撤销、CSRF、路径逃逸、缓存与错误。未接真实 Auth0、真实 Next/Nest、持久数据库、HTTPS/CDN 或 iPhone；合成模型不能冒充生产登录和独立安全评审。

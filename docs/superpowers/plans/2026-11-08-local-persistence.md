# 本地登录与内容持久化贯通 Implementation Plan

**Goal:** 验证登录后的受保护内容写入及服务重启恢复。

**Architecture:** 用临时内容副本、SQLite 和合成 OIDC provider 启动真实 Nest 应用；通过 HTTP 走授权回调、CSRF、Markdown 导入与草稿提交，重启同一应用后复用会话检查私密与公开边界。

**Tech Stack:** NestJS、Node test、SQLite、TypeScript。

## Global Constraints

不使用真实凭据或内容；合成身份不代表真实 Auth0 验收；结束后清理临时数据。

### 贯通测试

- 新增 `tests/integration/access/local-persistence.integration.test.ts`：通过真实 HTTP 登录、保存私密草稿并重启服务，再验证主人读取与访客拒绝。
- 运行新增测试及现有内容／身份集成测试；记录环境、结果和身份范围，提交推送 dev。

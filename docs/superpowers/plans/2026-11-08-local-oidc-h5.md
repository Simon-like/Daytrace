# 本地 OIDC 双端来源 Implementation Plan

**Goal:** 让使用真实 OIDC 配置的本地 PC 与独立 H5 共用主人会话和受保护写入。

**Architecture:** 仅 development 显式配置 `LOCAL_H5_ORIGIN` 时，在公开来源为回环地址且协议、主机一致的前提下增加一个 H5 写入来源；AuthModule 再次校验，生产拒绝此配置。登录回调仍固定主站；CSRF、会话和来源检查不变。

**Tech Stack:** NestJS、OIDC、SQLite、TypeScript。

## Global Constraints

不要求或记录真实凭据；禁止生产额外来源及非回环 HTTP；注入的合成 OIDC 客户端不代表真实 Auth0 验收。

### 本地双端

- 修改 `auth.config.ts` 和 `auth.module.ts` 校验并传递显式本地 H5 来源，默认无额外来源。
- 通过真实 Nest HTTP 和临时 SQLite 测试授权回调、主站及 H5 的 CSRF 写入，拒绝其他端口、不同主机和生产配置。
- 更新 `.env.example` 和本地手册说明回调、同主机 Cookie、持久路径和真实账户验证限制；运行相关集成与静态检查。

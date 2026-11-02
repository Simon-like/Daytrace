> 文档已集中管理。原素材/实验目录：[experiments/SECURITY-001](../../../../experiments/SECURITY-001)。文中“本目录”和历史运行步骤以该原目录为准；验收状态保持原记录。

# SECURITY-001 可执行安全模型

本目录是 SECURITY-001 的隔离实验，不是正式 Next.js/NestJS 应用，也未连接 Auth0、Google、真实域名、真实身份或真实私密内容。

## 运行

要求 Node.js 24 或更高版本；无第三方运行时依赖，不需要安装包或修改根锁文件。

```bash
cd experiments/SECURITY-001
node --test tests/*.test.ts
```

也可在支持 pnpm 的环境执行 `pnpm --dir experiments/SECURITY-001 test`。本机若没有 pnpm，直接使用上面的 Node 命令即可。

## 模型边界

- 两个独立的 `node:http` 服务分别模拟 Next SSR 适配层和 Nest 权威 API，请求通过真实回环 HTTP，而不是直接调用权限函数。
- 合成身份只用于建立测试会话。`/__synthetic/login` 是永远不能复制到生产的测试入口，不验证真实 OIDC 凭据。
- 会话只保存在内存，用于验证过期、注销、撤销和转发语义；它不证明重启持久化、多实例一致性或备份恢复。
- Next 侧共享 Map 只缓存明确公开的响应；私密、认证和错误响应均绕过缓存并要求 `no-store`。
- 私密标题、正文、附件和站外目标均为合成 canary。测试输出不打印响应正文、Cookie、CSRF token 或 canary。

正式推荐、持久化要求及 ENGINE/ACCESS 实现契约见 `docs/architecture/security/主人身份与访问边界.md`。

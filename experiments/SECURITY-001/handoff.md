# SECURITY-001 交接

日期：2026-10-30。分支：`agent/SECURITY-001/kimi`。

- 基线：`203d20409b7537c369e7404eaca6e705299b51d5`
- 方案与实现提交：`9b499bf057422357fa37b198d42716fd74c423c8`
- 交接文档提交：本文件所在分支的最终 HEAD，完整 SHA 在任务最终回报给出
- 写入范围：仅 `experiments/SECURITY-001/`、`docs/architecture/security/`
- 状态：未合并 main、未推送远端、未部署、未接真实 Auth0/域名/生产身份/真实私密内容
- 评审：本交接是执行者自检与可复现证据，不是独立安全评审

## 1. 推荐结论

采用 **Auth0 托管 OIDC + NestJS 精确 `issuer + subject` 主人白名单 + NestJS 服务端不透明可撤销会话**。Next.js 仅向固定 Nest 内部接口转发唯一会话 Cookie，不复制权限逻辑。

- Cookie：`__Host-daytrace_session`，`Path=/`、无 Domain、HttpOnly、Secure、SameSite=Lax；建议 30 分钟空闲、8 小时绝对有效期。
- 所有写操作要求精确 Origin + synchronizer CSRF token；logout 为 POST，删除服务端会话并清 Cookie。
- 缺 visibility 的内容隔离校验，不进入公开或主人正常索引；公开/主人索引物理或逻辑分离，公开查询即使带主人 Cookie 也只读 public index。
- 私密正文、附件、搜索、认证与错误响应全部 `no-store` 并绕过共享缓存；私密对象未授权统一通用 404。
- 单实例生产起步使用持久卷 SQLite，不用内存会话；多实例/滚动部署前迁移 PostgreSQL。恢复备份默认作废旧会话。

完整比较、成本、密钥轮换和 ENGINE/ACCESS/FIND/QA/RELEASE 契约见 `docs/architecture/security/主人身份与访问边界.md`。

## 2. 运行方式

环境：macOS 本机，Node.js `v24.22.1`。实验零第三方依赖，不需要 pnpm 安装，不修改根锁文件。

```bash
cd /Users/yingdonglin.1/Desktop/development/personal/Daytrace/.local/worktrees/SECURITY-001/experiments/SECURITY-001
node --test tests/*.test.ts
```

项目只读校验：

```bash
cd /Users/yingdonglin.1/Desktop/development/personal/Daytrace/.local/worktrees/SECURITY-001
python3 scripts/project_check.py
git diff --check
```

## 3. 实际验证证据

### HTTP 安全模型

最终命令 `node --test tests/*.test.ts`：**17 tests / 17 pass / 0 fail**，最终记录耗时约 `570 ms`。证据：`experiments/SECURITY-001/evidence/node-test.txt`。

两个独立 `node:http` 服务模拟 Next SSR 与 Nest API，通过真实回环 HTTP 请求验证，不是直接调用 guard 的假测试。覆盖：

1. 公开正文访客可读且不含私密 canary。
2. 访客经 Nest 直链和 Next SSR 均无法读取私密记录，响应不缓存。
3. 非主人合成身份无法建立会话或取得 Cookie。
4. 主人 Cookie 的 `__Host-`、Path、无 Domain、HttpOnly、Secure、SameSite=Lax、Max-Age 属性。
5. 主人正向控制可读取私密 SSR，HTML 不包含 Cookie/token。
6. Next 只转发 session Cookie；不转发其他 Cookie、Authorization、X-Forwarded-Host；固定 Nest 路径且 `no-store`。
7. 空闲过期后主人搜索和私密对象均拒绝。
8. 会话持续活动仍不能越过 8 小时绝对期限。
9. logout 拒绝跨站 Origin 和缺 CSRF；成功后服务端撤销、清 Cookie，旧 Cookie 重放失败。
10. revoke-all 使两个主人会话同时失效。
11. 篡改会话 token 不泄露私密记录存在性。
12. 登录轮换 session ID，并撤销登录时出示的旧会话。
13. 公开/主人搜索隔离；主人正向可命中私密 canary；缺 visibility 不进入主人索引。
14. 私密附件访客拒绝、主人正向可读，双向均 `no-store`。
15. 原始/编码路径逃逸、斜杠、反斜杠、绝对路径和直接文件名均不能读取站外 canary。
16. 公开缓存可 HIT 且不带私密内容；私密重复请求和访客后续请求始终 BYPASS/no-store。
17. 私密错误与公开缓存上游错误均通用、无堆栈/路径/canary，且不可缓存。

测试还断言相关响应没有允许跨域的 CORS 头。测试输出不打印 Cookie、CSRF token、响应正文或 canary；所有身份与内容均为合成材料。

### 仓库检查

- `python3 scripts/project_check.py`：通过，`documents_checked=94`、`catalog_entries=27`、`tasks=14`、`errors=[]`。
- `git diff --check`：通过。
- 提交前 staged 文件仅位于两个允许目录；无 board、任务卡、共享 README、apps/packages 或根锁文件变更。
- 证据目录扫描未发现 canary、会话 Cookie、CSRF token 或 Bearer 字符串。

## 4. 模拟与真实提供商差异

本实验的 `/__synthetic/login` 直接接受合成 `issuer/subject`，仅用于建立测试会话，**绝不能复制到生产**。它没有验证：

- Auth0 redirect、Authorization Code、state、nonce、PKCE、discovery、JWKS、audience、ID token 签名和一次性登录事务；
- Auth0 client secret 保管/轮换、提供商 logout、MFA、账号恢复、限流、真实套餐和可用性；
- 真实 Next.js/NestJS 包、框架中间件顺序、RSC/standalone 行为或版本兼容；
- SQLite/PostgreSQL 持久化、重启、迁移、多实例、备份和恢复；
- HTTPS/HSTS、真实浏览器 Cookie 策略、CDN、BFCache、Service Worker 或 iPhone Safari。

因此“17 组通过”只证明实验模型的访问边界，不是生产登录、真实框架、持久化或真机验收。

## 5. 风险与后续要求

### ENGINE-001

- 建立服务端-only 配置校验和固定内部 API client；秘密不得进入 `NEXT_PUBLIC_*`、共享 contracts 或 Next 镜像。
- 保留 Nest 为唯一权限权威；不得用临时内存会话或假登录标记生产可用。
- 与 ARCH/CONTENT 对齐精确版本、稳定记录/asset ID、visibility 隔离和统一错误契约。

### ACCESS-001 / FIND-001

- 使用维护中的 OIDC 库实现 Auth0 code+state+nonce+PKCE；一次性登录事务最长 10 分钟，returnTo 仅站内。
- 实现 SQLite 会话 schema、哈希 token、CSRF、idle/absolute expiry、logout/revoke-all、白名单移除；配置迁移和持久卷。
- 私密响应禁止 Next ISR/RSC 共享缓存和公共图片优化器；附件 realpath 根目录校验并补 symlink 自动测试。
- public/owner 索引分离，搜索失败不能伪装空结果，不记录私密搜索原词。
- 多实例前迁移 PostgreSQL；不得共享本地 SQLite 文件伪装多实例。

### CICD-001 / QA-001 / RELEASE-001

- 将本实验负例迁移到正式 site/api 和临时真实存储，增加进程重启、白名单移除、备份恢复后会话失效测试。
- 在独立 staging Auth0 application 验证真实 OIDC、secret/JWKS 轮换、提供商 logout 与 MFA 套餐；不得复用生产身份。
- 经真实 HTTPS/CDN 和双浏览器会话验证缓存；iPhone Safari 验证注销、过期、BFCache/pageshow 和附件直链。
- 扫描 HTML、RSC、客户端包、公开索引、错误、日志和 CI artifact 的私密 canary；证据不得包含真实私密正文。
- RELEASE 前完成持久备份/恢复、密钥轮换和独立安全评审；生产默认缺可见性不公开。

## 6. 成本与运维提醒

2026-10-30 Auth0 公开价格页列 Free 为 $0/月、最多 25,000 MAU，一名主人数量足够；但免费套餐只有 1 tenant、1 天日志，Pro MFA/更多环境能力可能需要付费。该信息不是采购承诺，域名、宿主、持久卷、备份和流量成本仍未确定。

初期 SQLite 是有意控制运维规模，不是多实例方案。恢复会话库可能复活已注销状态，默认恢复后全部重新登录；会话备份与私密内容备份都要受保护，不上传普通 GitHub artifact。

# ACCESS-001 集成交接

日期：2026-10-30。分支：`agent/ACCESS-001/kimi`。基线：`0381904161d095dd8ca14c24a72a37ffa0cee9fa`。

- 写入范围仅限 `apps/api/src/modules/{auth,assets}/`、`apps/site/src/{server,features/owner}/`、`tests/integration/access/`。
- 未修改 `app.module`、content/search、共享路由/布局/globals、共享 contracts/config、根 package/lock、board 或真实 `content/private`。
- 未合并、未推送、未部署。最终提交 SHA 在任务回报给出。
- 本交接是执行者自检，不是独立安全评审；所有身份和 canary 均为合成数据。

## 1. 已实现范围

### Nest auth

- `Auth0OidcProvider` 定义真实 OIDC 协议适配边界；`Auth0ProtocolClient` 负责托管 discovery/JWKS/ID token 验证，应用授权只接受验证后的精确 `issuer + subject`。
- `SyntheticOidcProvider` 仅用于 `NODE_ENV=test` 且显式启用合成认证的测试。生产环境拒绝合成 provider、内存会话和非 HTTPS `PUBLIC_ORIGIN`；缺 Auth0、白名单、持久库或协议适配配置会失败。
- 主人白名单每请求重新检查；移除身份会清理该身份全部会话。邮箱和客户端身份头都不是授权依据。
- SQLite 持久化登录事务与会话：256 bit 不透明随机会话 ID，数据库仅保存 SHA-256 会话/CSRF 哈希；支持登录轮换、30 分钟空闲与 8 小时绝对期限、注销、全部撤销和白名单移除。
- 登录事务包含 state、nonce 哈希、PKCE verifier、最长 10 分钟有效期和一次性消费；`returnTo` 仅允许站内路径。
- 会话 Cookie 为 `__Host-daytrace_session`，固定 `Path=/`、无 Domain、HttpOnly、Secure、SameSite=Lax；登录事务使用独立短期 HttpOnly Cookie。
- `OwnerGuard` 用于主人集合，`OwnerObjectGuard` 用于私密对象统一 404，`OriginCsrfGuard` 用于写操作。logout/revoke-all 均为 POST，要求精确 Origin 和 synchronizer CSRF；CSRF 获取会轮换 token。
- 认证、私密和错误响应禁止共享缓存，不开放跨域 CORS。

### Nest assets

- `AssetCatalog` 是内容模块需要实现的元数据端口，不复制 Markdown/content 模块。
- 附件只接受稳定 ID；私密附件由 Nest 会话逐次授权，访客/过期/撤销会话统一 404。
- 对元数据路径执行相对路径检查、`realpath` 根目录约束和 `O_NOFOLLOW` 普通文件读取；符号链接和路径逃逸失败关闭。
- 使用文件流、受控 MIME、nosniff 和无用户文件名的 Content-Disposition；私密成功与失败响应均 `no-store`。

### Next owner/server

- `createOwnerApiClient` 只访问固定 owner records/auth 路径，只重写唯一会话 Cookie；不转发整段 Cookie、Authorization、Host、X-Forwarded-* 或自定义身份头。
- 上游请求使用固定 `API_INTERNAL_ORIGIN`、`cache: no-store`、手动 redirect 和 2 秒超时；SSR 不透传上游 Set-Cookie。
- owner 列表/详情在本地做运行时校验，因为共享 owner 契约不在本任务写入范围。
- 提供登录链接、CSRF logout form、主人列表和详情展示组件；没有修改共享路由，因此这些组件尚未成为可访问页面。

## 2. 可复现验证

环境：Node.js `v24.22.1`，依赖按既有锁文件以 pnpm `11.23.0` 安装，未改锁文件。

```bash
node_modules/.bin/tsx --tsconfig tests/integration/access/tsconfig.json --test tests/integration/access/*.test.ts
```

结果：**13 tests / 13 pass / 0 fail**。测试启动真实 Nest 回环 HTTP 服务，覆盖：

1. 生产配置缺项和合成 provider 边界。
2. 访客主人集合、私密详情和附件负例，公开附件正向控制。
3. 非主人登录拒绝、主人 Cookie 属性及私密正文/附件正向控制。
4. 登录会话轮换、篡改与重复 Cookie。
5. 服务端空闲和绝对过期。
6. Origin、缺失/错误/轮换 CSRF、注销与旧 Cookie 重放。
7. 全部撤销和白名单移除。
8. 元数据路径逃逸、编码路径、反斜杠、绝对路径和 symlink。
9. 通用错误、缓存和私密 canary 不泄露。
10. SQLite 进程重启后会话保留，数据库不含原始会话/CSRF token。
11. 一次性登录事务和站内 returnTo。
12. Next SSR 只转发固定会话 Cookie，主人正向读取。
13. SSR 无会话和过期会话负例。

其他实测：

- `pnpm lint`：0 warnings / 0 errors。
- `pnpm typecheck`：通过。
- `pnpm test:unit`：15 / 15 通过。
- `pnpm test:integration`：既有 API 4 / 4 通过。
- `pnpm test:e2e`：Next/Nest 生产构建成功，既有 SSR 1 / 1 通过。
- 测试启动的服务均已停止；测试输出不打印会话、CSRF token 或私密正文。

## 3. 必须由集成者完成的变更

### 应用注册和启动配置

1. 在 `app.module` 串行注册唯一 `AuthModule.fromEnvironment(...)` 和 `AssetsModule.register(...)`；不得创建第二份 SessionService/SQLite store。
2. 在启动链路接入 `PUBLIC_ORIGIN`、`SESSION_DATABASE_PATH`、`OWNER_IDENTITIES`、`AUTH_PROVIDER=auth0`、`AUTH0_ISSUER`、`AUTH0_CLIENT_ID`、`AUTH0_CLIENT_SECRET`。生产缺少任一项必须阻止 listen，ready 检查需覆盖会话库。
3. 将真实 Auth0 client secret 仅注入 Nest 运行时；不得进入 `NEXT_PUBLIC_*`、contracts、镜像或日志。
4. 配置同域反向代理和 HTTPS/HSTS；生产 Cookie 浏览器行为必须在真实 HTTPS 下复验。

### ContentService、搜索和共享契约

1. 给 ContentService 增加 owner list/detail 方法，基于同一已校验快照返回主人集合；缺 visibility 的记录仍不得进入正常 owner 集合。公开方法不得因收到主人 Cookie 改变结果。
2. 让 ContentService 实现 `AssetCatalog.findPublishedAsset`，只映射 published 记录中的元数据，并接入唯一 AssetsController。移除/替换原 ContentController 的公开 asset 路由，避免同一路由两个 controller。
3. owner 集合使用 `OwnerGuard`，owner 详情使用 `OwnerObjectGuard`；FIND 的主人搜索也必须复用 Nest guard 和独立 owner index，不能在 Next 判 owner。
4. 将 `CSRF_REJECTED`、`LOGIN_FAILED` 和 owner list/detail 运行时契约加入 `@daytrace/contracts`，再以共享 parser 替换 `apps/site/src/server/owner-api.ts` 的本地 parser。
5. 私密摘要、分享卡、RSS、sitemap 和公共构建产物仍需 content/search 集成与 canary 扫描；本任务没有修改这些模块。

### 真实 Auth0 OIDC 适配

当前没有新增根依赖，因此没有伪造 JWT 验签实现。集成者需用维护中的 `openid-client` 等库实现 `Auth0ProtocolClient`，并锁定依赖后实测：

- Authorization Code Flow、`state`、`nonce`、PKCE、一次性 code；
- issuer discovery、JWKS/kid、签名、issuer、audience、`exp/iat/azp`（适用时）；
- 用保存的 nonce 哈希校验已验签 claims，不接受浏览器直接提供的 issuer/subject；
- Auth0 client secret 轮换、提供商 logout、MFA、限流和独立 staging tenant。

完成该适配前不得把合成登录标为生产可用。

### Next 路由和缓存

1. 集成 `/owner` 与 `/owner/records/[id]` 路由，使用 request-time cookies、动态渲染和私密 `no-store` 响应；不得 ISR/静态生成或共享 RSC/HTML 缓存。
2. 私密附件不得进入 Next 图片优化器、公共静态目录或 CDN；公开页面不转发会话。
3. logout/过期后的 UI 清理及 `pageshow`/BFCache 重新验证需在真实浏览器补齐。

## 4. 未验证与生产差距

- **真实 Auth0 未验证**：没有 tenant、真实 OIDC 重定向、JWKS、MFA、secret 轮换或账号恢复证据。
- **真实 HTTPS/CDN 未验证**：回环 HTTP 只验证 Cookie 属性与服务端逻辑，不冒充 TLS、HSTS、浏览器 Secure Cookie 或 CDN 验收。
- **iPhone Safari 未验证**：没有真机登录、注销、过期、BFCache、附件直链或横竖屏证据。
- 当前模块尚未注册到正式 AppModule，owner 页面尚未挂共享路由；因此不是正式 AC-13 全链路通过。
- SQLite 仅适合单 Nest 实例。多实例/滚动部署前迁移 PostgreSQL；持久卷、备份加密、恢复默认全撤销、迁移和兼容回滚仍需 RELEASE 演练。
- 未做独立渗透测试、依赖 CVE 扫描、登录/CSRF 限流、附件 Range/大文件容量、公共产物全量 canary 扫描或性能验收。

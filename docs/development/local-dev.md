# 本地开发与验证

固定运行时：Node.js `24.18.0`、pnpm `11.23.0`，以根`.nvmrc`、`.node-version`和`package.json`为准。依赖只从 `https://registry.npmjs.org/` 获取；使用 `pnpm install --frozen-lockfile` 做可复现安装。历史报告中的其他Node版本只代表当时实验环境，不是当前开发基准。

## 快捷启动

| 目的 | 命令 | 地址与说明 |
| --- | --- | --- |
| 一键开发：桌面＋H5＋API | `pnpm dev` | 桌面 `:3000`，H5 `:3002/h5/`，API `:3001/api/v1` |
| 自定义双前端端口 | `pnpm dev -- --port 7100 --h5-port 7102` | 桌面 `:7100`，H5 `:7102/h5/` |
| 只启动桌面 | `pnpm dev:site` | `:3000`；需要另启 API |
| 只启动 H5 | `pnpm dev:h5` | `:3002/h5/`；需要另启 API |
| 只启动 API | `pnpm dev:api` | `:3001/api/v1` |
| 桌面生产构建 Demo | `pnpm demo` | `:3000`；包含 API，不包含独立 H5 |

没有全局 pnpm 时，将上述命令中的 `pnpm` 换成 `npm run`，例如 `npm run dev -- --port 7100 --h5-port 7102`。

## 一键开发启动

```bash
pnpm dev
# 可显式指定监听主机与双前端端口：
pnpm dev -- --host localhost --port 7100 --h5-port 7102
```

默认同时启动：

- 桌面 Next 站点：`http://127.0.0.1:3000`
- Nest API：`http://127.0.0.1:3001/api/v1`
- 独立 H5：`http://127.0.0.1:3002/h5/`
- 主站移动入口：`http://127.0.0.1:3000/h5/`
- 公开详情示例：`http://127.0.0.1:3000/records/rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111/`

`--host` 同时调整桌面和 H5 监听地址；`--port` 只调整桌面，`--h5-port` 调整 H5。主站的 `H5_INTERNAL_ORIGIN` 默认跟随 `--host`，避免 `localhost` 与 `127.0.0.1` 混用造成代理失败；需要时可用环境变量显式覆盖。

Nest 使用 `API_HOST` / `API_PORT`，两个 Next 服务端通过 `API_INTERNAL_ORIGIN` 固定访问 Nest，这些内部地址不会进入浏览器。首版不做 UA 自动跳转。

`CONTENT_ROOT` 默认是 `./apps/api/fixtures/content`，全部为合成内容。可复制 `.env.example` 为 `.env` 后调整；不要填入真实私密内容或凭据。

按 `Ctrl+C` 停止三个服务。验证结束后不应遗留 Next、Nest、tsx 或 Node 开发进程。

## 根命令

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm test:e2e
pnpm test:h5
pnpm content:validate
pnpm docs:validate
```

`test:integration` 启动真实 Nest HTTP 服务并使用临时合成内容。`test:e2e` 先构建，再启动真实 Nest 与 Next 生产服务，检查 API、SSR 正文、私密隔离和错误反馈。两者都不是部署、真机或性能验收。

## 主人内容库本地体验

`pnpm dev -- --demo` 启动隔离合成身份与示例内容，打开 `/owner` 后进入“内容库”，可上传 Markdown、附件/ZIP，预览并保存或发布。此显式模式不改变默认 `pnpm dev` 的身份边界。资料存储与操作详见[内容库手册](content.md)，仅用合成资料验证；真实身份接入仍有独立门槛。


## 本地 OIDC 与持久内容

默认启动不注册主人登录；演示身份只用于合成数据。需要验证真实账户时，使用单独的 Auth0 开发应用与独立本地内容目录；不要将真实凭据或私密内容提交到 Git。Auth0 的回调地址必须与请求完全一致，见 [Auth0 回调地址说明](https://support.auth0.com/center/s/article/Callback-URL-Mismatch-Error-Is-Not-in-the-List-of-Allowed-Callback-URLs)。

在被忽略的 `.env` 中按 `.env.example` 配置 `AUTH_PROVIDER=auth0`、Auth0 issuer、client ID、client secret 和精确的主人 issuer／subject；`SESSION_DATABASE_PATH` 指向绝对路径的本地私密文件，`CONTENT_ROOT` 指向仓库外的持久内容根（包括 `public` 和 `private`）。例如本机主站使用 `PUBLIC_ORIGIN=http://localhost:3000` 时，Auth0 开发应用的 Allowed Callback URLs 需包含 `http://localhost:3000/api/v1/auth/callback`。启动使用 `pnpm dev -- --host localhost`；域名、协议和端口应与实际访问地址一致。

通过主站 `/h5/` 访问使用同一来源；若还需直连 `http://localhost:3002/h5/` 并在内容库写入，显式设置 `LOCAL_H5_ORIGIN=http://localhost:3002`。它仅在 development 接受与 `PUBLIC_ORIGIN` 相同的回环主机和协议；主站和 H5 使用相同主机名以共享 host-only Cookie。未设置时只有主站来源允许写入，生产不接受该变量。回环 HTTP 的 Secure Cookie 行为需在目标浏览器实测，不能将合成身份或 Chromium 视口当成真实账户及 iPhone 验收。

完成真实账户登录后，应验证重启后的主人读取、导入私密草稿和访客拒绝，并独立备份整个内容根（包含 `.daytrace`）及会话数据库；操作和恢复边界见[内容库手册](content.md)。

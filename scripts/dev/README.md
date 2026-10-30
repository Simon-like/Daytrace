# 本地开发与验证

固定运行时：Node.js `24.22.1`、pnpm `11.23.0`。依赖只从 `https://registry.npmjs.org/` 获取；使用 `pnpm install --frozen-lockfile` 做可复现安装。

## 启动

```bash
pnpm dev
# 没有全局 pnpm 时，同样可使用 npm 运行脚本：
npm run dev
# Next 参数会转发给底层开发服务：
npm run dev -- --host 0.0.0.0 --port 7100
```

默认同时启动：

- Next 站点：`http://127.0.0.1:3000`
- Nest API：`http://127.0.0.1:3001/api/v1`
- 公开详情示例：`http://127.0.0.1:3000/records/rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111/`

`--host` / `--port` 只调整 Next。Nest 使用 `API_HOST` / `API_PORT`；Next 服务端通过 `API_INTERNAL_ORIGIN` 固定访问 Nest，该变量不会进入浏览器。`CONTENT_ROOT` 默认是 `./apps/api/fixtures/content`，全部为合成内容。可复制 `.env.example` 为 `.env` 后调整；不要填入真实私密内容或凭据。

按 `Ctrl+C` 停止两个服务。验证结束后不应遗留 Next、Nest、tsx 或 Node 开发进程。

## 根命令

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm test:e2e
pnpm content:validate
pnpm docs:validate
```

`test:integration` 启动真实 Nest HTTP 服务并使用临时合成内容。`test:e2e` 先构建，再启动真实 Nest 与 Next 生产服务，检查 API、SSR 正文、私密隔离和错误反馈。两者都不是部署、真机或性能验收。

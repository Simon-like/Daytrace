# Daytrace 正式站点

Next.js `16.4.3` + React `19.3.1` 的 App Router 站点。当前实现 ENGINE-001 的公开阅读纵向切片，使用 `apps/api/fixtures/content/` 中的合成样本，不代表用户真实经历。

## 本地启动

从仓库根目录运行：

```bash
npm run dev
# 或指定 Next 监听地址：
npm run dev -- --host 127.0.0.1 --port 3000
```

默认地址：

- Next 站点：`http://127.0.0.1:3000`
- Nest API：`http://127.0.0.1:3001/api/v1`
- 公开详情样本：`http://127.0.0.1:3000/records/rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111/`

`API_INTERNAL_ORIGIN` 只供 Next 服务端访问 Nest，不进入浏览器。Nest 的监听地址由 `API_HOST` / `API_PORT` 配置。详见 `scripts/dev/README.md`。

## 数据与权限边界

- `src/app/` 只负责路由、运行时 SSR 和状态页面；首页与详情均为动态服务端渲染，不做构建时内容快照。
- `src/server/api.ts` 是唯一的公开 API 适配层，使用共享运行时契约校验响应；不读取 Markdown，不扫描内容目录，不判断公开或私密权限。
- Nest 只投影 `published + public` 记录。Next 不接收私密正文、附件、摘要或索引后再用客户端隐藏。
- `src/features/records/` 负责公开记录展示；`src/layouts/` 与 `src/styles/` 维护共享站点壳和视觉令牌。
- 身份登录和主人视图由 ACCESS 任务实现，本切片没有临时登录或前端伪权限。

## 验证

从仓库根目录运行 `pnpm typecheck`、`pnpm build` 和 `pnpm test:e2e`。端到端测试会启动真实 Nest 与 Next 生产服务，验证 SSR、公开边界、旧链接重定向和 API 故障反馈；这些检查不等于部署、iPhone 真机或性能验收。

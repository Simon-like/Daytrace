# MOBILE-001：独立移动 H5 应用与触摸导航

日期：2026-11-03。结论：独立 H5 已在 monorepo 内落地，桌面回归与移动 Chromium 预检通过；可交付本地预览，未集成、未部署、未完成真机或生产验收。

## 范围与实现

- 新建 `apps/h5`，使用 Next.js 16.4.3、React 19.3.1 和 Tailwind CSS 4.3.3；复用 `@daytrace/ui`、`@daytrace/content` 与既有 Nest API。
- 移动首页、归档、搜索、关于、阅读与 404 均使用独立编排，不把桌面侧栏或汉堡菜单压缩成移动方案。
- 顶部品牌区与四项底部导航处理 safe-area；归档使用原生 `<dialog>` 底部筛选面板，保留已选摘要、筛选与滚动恢复。
- 搜索包含建议词、请求取消、结果高亮、空结果／失败区分；阅读直接消费服务端 Markdown HTML，提供目录、代码复制、局部代码／表格横滑、图片灯箱和无 JavaScript 正文。
- 主站代理 `/h5/:path*`，H5 的 `/api/v1` rewrite 显式绕过 `basePath`；首版不增加 UA 自动跳转。
- `scripts/dev/run-dev.mjs` 同时启动桌面、H5 和 API，支持 `--h5-port`；根命令纳入 H5 typecheck、build 与 `test:h5`。

## 共享包变更

`packages/ui/src/select.tsx` 新增可选 `container?: HTMLElement | null`，仅用于把 H5 筛选选项挂入原生 modal dialog 的 top layer，避免默认 body portal 无法接收指针。桌面未传该参数，保持原行为。这是对 SYSTEM-001 共享包的最小向后兼容增量，需在集成时一并审阅，不是第二套 Select。

## 关键修复

1. H5 直连端口的 `/api/v1/health/ready` 曾因 `basePath` 返回 404；为 API rewrite 设置 `basePath: false` 后通过。
2. Radix Select 默认 portal 在原生 dialog 外，选项被页面拦截；改为传入 dialog 容器后，类别选择、标签多选和提交均通过。
3. 搜索建议词显式复用 `run(word)`，避免同路由导航与本地 effect 重复检索；提交、清除、建议和结果进入均通过。
4. 证据截图禁用动画并固定 390px 筛选视口，避免把过渡中帧误判为透明面板；关闭 H5 开发指示器，避免遮挡底部导航。

## 实际验证

环境：Node.js 24.18.0、pnpm 11.23.0、Chromium 156.0.8078.4，合成演示内容。

| 检查 | 实际结果 |
| --- | --- |
| `pnpm lint` | 158 文件，0 warning／error |
| `pnpm typecheck` | API、桌面、H5 全通过 |
| `pnpm build` | API、桌面、H5 生产构建全通过 |
| `pnpm test:unit` | 43／43 |
| `pnpm test:integration` | 8＋13＋5，全通过 |
| `pnpm test:h5` | 5／5；320／390／430／768 共 24 个页面视口无整页横溢出，page error 0 |
| 桌面 Chromium 回归 | 19／19，56 视口通过，page error 0 |

证据：`docs/project/evidence/MOBILE-001/browser-results.json` 与 `docs/project/evidence/MOBILE-001-desktop/browser-results.json`。首页、归档、搜索、阅读、320／768 首页和筛选面板截图已实际查看；稳定状态下筛选纸张层不透明，底部导航不遮挡面板。

桌面回归命令：

```sh
DEMO_MANAGED_SERVER=1 DEMO_PORT=3160 DEMO_API_PORT=3161 \
DEMO_EVIDENCE_DIR=docs/project/evidence/MOBILE-001-desktop \
node tests/e2e/acceptance/demo.browser.mjs
```

## 保留缺口

- Chromium 移动视口不等于 iPhone／Safari 真机；safe-area、触摸手感、地址栏收缩和真实键盘仍需设备验收。
- UI-002 的 Select 4 倍 CPU 52ms 长事件未在本轮重测或解决，保持 blocked。
- 阅读页必要脚本 141768 gzip bytes，仍高于 81920 bytes 预算；本报告不宣称性能通过。
- `pnpm demo` 仍只启动桌面生产构建与 API；独立 H5 当前通过 `pnpm dev` 预览。
- 代码未 commit、未 push、未集成、未部署；完整 18 组 AC／NFR、真实身份、真实内容和发布恢复不属于本轮完成范围。

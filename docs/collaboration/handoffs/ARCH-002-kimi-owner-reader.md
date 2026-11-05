# ARCH-002 主人读取与模块导航交接

- 日期：2026-11-05
- 执行者：`kimi-ARCH-002-owner-reader`
- 功能提交：`27deaab`、`2a17f78`
- 导航提交：`f0445e0`
- 报告：`docs/project/reports/ARCH-002.md`
- 验证：`docs/project/evidence/ARCH-002/validation.json`

## 接手入口

1. 按业务概念先读 `docs/architecture/模块导航.md`，不要从路由开始全仓扫描。
2. 主人读取规则只看 `packages/content/src/owner-api.ts`；桌面和 H5 的 `src/server/owner-api.ts` 仅是 Cookie 组合根。
3. 公开与 owner 响应入口都在 `packages/contracts/src/index.ts`，但权限语义不同，不得互相替换。
4. SSR 边界测试位于 `tests/integration/access/ssr-forwarding.integration.test.ts`，外部 origin 与 fetch 可显式注入。

## 状态与边界

本地 lint、typecheck、64 单元、12＋15＋5 集成、11 内容测试、三端构建、桌面 23 路径／56 视口、H5 6 检查／28 布局及最终 221 文档检查通过。Node 实际为 24.22.1，声明为 24.18.0，存在 patch engine warning。

阅读页 142850／81920 gzip bytes 预算差距仍在；真实 iPhone、生产身份、完整 QA、发布与恢复未验收。内容发布、搜索工作流和阅读增强留作独立后续切片。

未合并 `main`、未部署。GitHub 认证不可用，本轮及此前本地提交均未推送，当前 SHA 无托管 CI 结论。保留 `apps/site/next-env.d.ts`、DEMO-001、MOBILE-001、ARCH-001 实验证据和设计素材等既有未提交现场，不还原、不混入 ARCH-002 提交。

# MOTION-002：动效参考实现与组件推广报告

日期：2026-11-02
分支：`agent/MOTION-002/reference-motion`
基线：`1079863`，补丁带入尚未集成的 UI-001／MOTION-001。
性质：本地 Demo 实施与执行者自检，未提交、未集成、未部署。

## 实施结果

- 建立共享时长、曲线和位移令牌；Button、Input、Checkbox、筛选状态和搜索结果复用同一反馈语言。
- Select 使用 200ms 进入／140ms 退出，仅改变透明度与 4px 位移，chevron 同步反馈。
- 移动导航与图片灯箱复用原生 dialog，以 CSS 离散过渡完成遮罩和面板进入／退出，没有新增 JavaScript 关闭计时器。
- 列表只使用单容器淡入，不逐项交错；正文和路由不增加入场动画。
- 浏览器测试覆盖快速开关、Escape、焦点返回、滚动恢复和减少动态效果。未新增依赖。

## 实际验证

在工作区 `.local/worktrees/MOTION-002`，Node.js 24.18.0、Chromium 156.0.8078.4：

- `pnpm lint`：125 个文件，0 warning、0 error。
- `pnpm typecheck`、`pnpm build`：通过。
- `pnpm test:unit`：42／42 通过。
- `pnpm test:integration`：26／26 通过。
- `python3 scripts/project_check.py`、`git diff --check`：通过。
- `DEMO_MANAGED_SERVER=1 DEMO_PORT=3120 DEMO_API_PORT=3121 DEMO_EVIDENCE_DIR=docs/project/evidence/MOTION-002 pnpm test:browser`：15／15 关键流程通过，56 组视口／页面组合无整页横向溢出，console error 0。
- `DEMO_MANAGED_SERVER=1 DEMO_PORT=3120 DEMO_API_PORT=3121 DEMO_EVIDENCE_DIR=docs/project/evidence/MOTION-002 node tests/e2e/acceptance/motion-performance.mjs`：Select、移动导航、灯箱在正常与 4× CPU 下共 6／6 场景通过；各场景 >50ms RunTask、observer long task、DroppedFrame、unexpected layout shift 均为 0。

证据位于 `docs/project/evidence/MOTION-002/`，其中 `motion-results.json` 与六份 trace 是本地实验室交互记录，不是线上 Web Vitals 或真机结论。

## 未完成与边界

1. 正文页必要且实际请求的脚本为 142121 gzip bytes，高于 81920 bytes 初始预算，**性能资源预算未通过**。
2. 未验证真实 iPhone、跨浏览器、生产环境与正式发布。
3. Markdown 正文语义与排版重写属于 READER-002，不在本任务完成范围内。
4. 全部改动仍未 commit／push；后续工作区需保留 UI-001、MOTION-001 和本任务的未集成依赖。

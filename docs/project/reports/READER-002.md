# READER-002：完整 Markdown 正文阅读实施报告

日期：2026-11-02
分支：`agent/READER-002/markdown-reader`
基线：`1079863`，补丁带入 UI-001、MOTION-001、MOTION-002。
性质：本地 Demo 实施与执行者自检，未提交、未集成、未部署。

## 实施结果

- 保留 marked 18.1.2 的服务端单次 token 解析、GFM、安全 URL／附件映射、原始 HTML 拒绝和 sanitize-html 固定白名单，没有引入 MDX 或新解析依赖。
- 代码工具栏、复制按钮、局部滚动区、表格容器、图片按钮、caption 和错误容器均在服务端 HTML 中直接输出；hydration 后不再包装或搬动正文 DOM。
- 客户端只绑定复制、ResizeObserver、图片错误和灯箱。复制失败选择纯代码文本，不包含工具栏；未知语言、无 JavaScript 和缺图状态均保持可读。
- 第一张内容图 eager，其余 lazy；保留附件尺寸、异步解码、alt，Markdown 图片 title 作为可见 caption。
- 重排中文正文、标题、嵌套／任务列表、删除线、引用、行内代码、长链接、表格和代码；移动端正文为 17px，代码／表格只在自身区域横滑。
- 使用稳定 data 属性衔接服务端 HTML 与 CSS Modules，修复固定类名被局部编译后样式不命中的问题。
- `parseRevision` 按契约递增为 `daytrace-markdown-2`，共享契约、访问测试、独立运行包检查和 API 示例同步更新。

## 实际验证

在工作区 `.local/worktrees/READER-002`，Node.js 24.18.0、Chromium 156.0.8078.4：

- `pnpm lint`：125 个文件，0 warning、0 error。
- `pnpm typecheck`、`pnpm build`：通过。
- `pnpm test:unit`：43／43 通过。
- `pnpm test:integration`：26／26 通过。
- `python3 scripts/project_check.py`、`git diff --check`：通过。
- `DEMO_MANAGED_SERVER=1 DEMO_PORT=3140 DEMO_API_PORT=3141 DEMO_EVIDENCE_DIR=docs/project/evidence/READER-002 pnpm test:browser`：18／18 关键流程通过，56 组视口／页面组合无整页横向溢出，page error 0。
- 浏览器覆盖 GFM、两个代码块、未知语言、局部横滑、移动端字号、长链接、复制成功／失败、缺图、无 JavaScript、图片 caption／灯箱、权限、导航和减少动态效果。
- `DEMO_MANAGED_SERVER=1 DEMO_PORT=3140 DEMO_API_PORT=3141 DEMO_EVIDENCE_DIR=docs/project/evidence/READER-002 node tests/e2e/acceptance/motion-performance.mjs`：正常与 4× CPU 共 6／6 场景通过，各场景 >50ms RunTask、observer long task、DroppedFrame、unexpected layout shift 均为 0。
- 已逐张复核工程与菜谱的桌面、手机截图。证据位于 `docs/project/evidence/READER-002/`。

## 未完成与边界

1. 正文必要且实际请求的脚本为 **141627 gzip bytes**，高于 **81920 bytes** 初始预算，**资源预算未通过**。相较 MOTION-002 的 142121 bytes 略有下降，但不能据此宣称性能预算达标。
2. 本地 Chromium 视口、CPU 节流失真和合成内容不是线上 Web Vitals，也不代替真实 iPhone、跨浏览器或生产验收。
3. 全部改动未 commit／push、未集成主分支。共享 `parseRevision` 常量与独立运行包检查需和正文改动作为同一批集成，不能只合入前端。

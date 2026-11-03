# UI-001 任务交接

| 项目 | 内容 |
| --- | --- |
| 任务ID / owner / 工具 | UI-001 / `kimi-UI-001-shell` / Kimi |
| 用户授权与范围 | 重塑 Demo 信息层级与页面密度，使用 Tailwind CSS + 无头组件建立本地基础组件；先解决主题、模块编排和控件，再单独处理 Markdown。 |
| 基线 / 分支 / 提交或PR | 基线 `1079863`；分支 `agent/UI-001/design-system`；worktree `.local/worktrees/UI-001`；未 commit、未 push、未集成、未部署。 |

## 改了什么

- 建立 Tailwind CSS v4 与设计令牌，本地新增 Button、Input、Select、Checkbox；Radix 只提供无头行为。
- 首页移除次级推荐和重分类卡，侧栏删除重复分类与装饰碎片，保留最近记录作为主焦点。
- 归档改为日期索引，标签渐进披露；搜索统一输入、按钮和焦点样式，失败重试同步迁移。
- 修复旧全局按钮样式覆盖 Tailwind、本地组件焦点线型缺失，以及正文桌面目录／正文列分配颠倒。
- 更新浏览器测试，支持独立端口和证据目录；新增键盘、焦点、渐进披露与正文宽栏断言。
- 实施报告：`.local/worktrees/UI-001/docs/project/reports/UI-001.md`；调研和设计基线也在该 worktree。

依赖变化限于站点 Tailwind / PostCSS 与 Radix Checkbox / Select；`pnpm-lock.yaml` 有对应更新。没有修改 API、权限、内容数据或公共契约。

## 怎样验证

使用项目 Node.js 24.18.0，在 `.local/worktrees/UI-001` 执行：

```sh
pnpm test:unit
pnpm test:integration
pnpm lint
pnpm typecheck
pnpm build
DEMO_MANAGED_SERVER=1 DEMO_PORT=3100 DEMO_API_PORT=3101 DEMO_EVIDENCE_DIR=docs/project/evidence/UI-001 pnpm test:browser
```

实际结果：单元 42／42、集成 26／26、浏览器 12／12 通过；lint 124 文件 0 warning / 0 error；类型与生产构建通过；56 组视口无整页横溢出，脚本错误 0。

最终截图与 `browser-results.json` 在 worktree 的 `docs/project/evidence/UI-001/`。已人工复核 1440px / 390px 的首页、归档、搜索和正文页。证据仅为本地 Chromium + 合成数据，不是真机或生产验收。

## 下一位怎么接

- 尚未完成或存在的风险：Markdown 解析与正文渲染未重做；正文页脚本 142121 gzip bytes，未满足 81920 bytes 原预算；未做真实 iPhone、跨浏览器和生产验收。
- 下一步最具体的一件事：集成者先审阅并串行合入 UI-001，再以当前设计令牌和本地组件为基准开启 Markdown 阅读专项，不恢复旧原生控件或重复首页栏目。
- 失败如何恢复：基于 `1079863` 检查 `agent/UI-001/design-system` 的未提交 diff；不要覆盖主 checkout 已有 DOCS-002、ARCH 证据与图标改动。默认 3000／3001 端口有主 checkout Demo，本轮使用 3100／3101，未停止主 checkout 服务。

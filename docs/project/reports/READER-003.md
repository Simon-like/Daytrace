# READER-003 文章目录滚动定位报告

日期：2026-11-03。性质：执行者自检与本地 Chromium 回归，非独立 QA、Safari 或真机验收。

## 基线与交付

用户要求同步 Codex 工作进度，并修复桌面文章页右侧目录不能随页面滚动实时定位的问题。已同步 Codex 完成的 CONTENT-003；本任务从 `dev` 基线 `0465550` 开始，不新建任务分支，不改 API、内容契约、H5 或依赖。

- 用标题几何位置计算替换原先依赖窄观察带的 `IntersectionObserver`，以视口顶部 24%、最高 180px 为阅读线，选择阅读线上方最后一个标题。
- 滚动和缩放事件通过一个 `requestAnimationFrame` 合并更新，标题元素只在目录变化时重新缓存，不接管原生滚动。
- 首屏保留首个目录项，到达文档底部时明确选择最后一项；向上和向下滚动使用同一计算规则。
- 点击目录立即更新 `aria-current="location"`，保留既有 hash、键盘焦点、减少动态效果和移动目录行为。

## 实际验证

| 检查 | 结果 |
| --- | --- |
| `pnpm lint` | 175 个文件，0 警告／错误 |
| `pnpm typecheck` | API、桌面、H5 全部通过 |
| `pnpm exec tsx --tsconfig apps/api/tsconfig.json --test tests/unit/reader/reader-interactions.test.ts` | 10／10 通过，其中新增 2 条覆盖双向滚动、首屏、页底与空目录 |
| `node tests/e2e/reader/toc-scroll.browser.mjs` | Chromium 2／2 通过，页面脚本错误 0 |

[结构化浏览器结果](../evidence/READER-003/browser-results.json)记录向下、向上、页底与点击 hash／active location。两张截图分别保存中间小节和页底高亮状态；测试针对当前主工作区 `http://127.0.0.1:3000`，不是旧 worktree。

测试调整过一次场景：原先选用的“这次真正需要记住的”在短文章最大滚动位置仍低于阅读线，同时页面已经到底，因此正确结果应为最后一项。改用能够实际滚过阅读线的“一个白屏问题的排查顺序”验证中间状态，没有为通过测试修改业务算法。

## 限制

本轮只验证桌面 Chromium，不代表真实 Safari、iPhone、性能预算或完整阅读页 QA 已通过。既有 UI-002 长事件和阅读页脚本预算问题保持开放。接手时已有的 `apps/site/next-env.d.ts`、ARCH-001 两个证据文件修改和未跟踪设计目录均保留，不纳入本任务。

# READER-002 任务交接

| 项目 | 内容 |
| --- | --- |
| 任务 / owner / 工具 | READER-002 / `kimi-READER-002-reader` / Kimi |
| 用户授权与范围 | 按已批准计划连续完成动效与完整 Markdown 阅读，交付可检查页面；不含生产、真实私密内容或部署。 |
| 基线 / 分支 / 提交 | `1079863` / `agent/READER-002/markdown-reader` / 无提交、PR、集成或部署；补丁带入 UI-001、MOTION-001、MOTION-002。 |

## 改了什么

交付位于 `.local/worktrees/READER-002`。marked 服务端直接输出代码、表格和图片的完整语义，客户端仅绑定交互；重排中文正文并补齐 caption、复制失败、缺图、无 JavaScript、长链接与局部横滑。`parseRevision` 递增为 `daytrace-markdown-2`，同时更新共享常量、访问 fixture、独立运行包检查和 API 文档。

主要文件：`apps/api/src/modules/content/markdown.ts`、`apps/site/src/features/reader/`、`packages/contracts/src/index.ts`、`scripts/ci/prepare-standalone.mjs`、`tests/e2e/acceptance/`、`docs/architecture/contracts/`。

## 怎样验证

- lint、typecheck、unit 43／43、integration 26／26、build、project_check、diff check 全部通过。
- Chromium 18／18 流程，56 组视口无整页横溢出，page error 0；已复核桌面／手机正文截图。
- 正常与 4× CPU 的 Select／移动导航／灯箱 6／6 场景通过，长任务、DroppedFrame 和 unexpected layout shift 均为 0。
- 证据：`docs/project/evidence/READER-002/`；正文脚本 141627 gzip bytes，高于 81920 bytes 预算，未达标。

## 下一位怎么接

- 预览根目录：`/Users/yingdonglin.1/Desktop/development/personal/Daytrace/.local/worktrees/READER-002`，使用项目既有 `npm run dev`。
- 集成时必须同批包含共享 `parseRevision` 与 standalone 检查，不能只取 reader 文件；不得覆盖主 checkout 和其他 worktree 未提交现场。
- 未验证真实 iPhone、跨浏览器、生产或线上 Web Vitals；后续性能工作应单独拆解必要客户端脚本，而非隐藏预算失败。

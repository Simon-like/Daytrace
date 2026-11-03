# UI-003 任务交接

| 项目 | 填写内容 |
| --- | --- |
| 任务ID / owner / 工具 | UI-003 / kimi-UI-003-focus / Kimi |
| 用户授权与范围 | 修复桌面与 H5 点击控件出现过重黑框，补充移动搜索键盘语义；不承诺关闭 iOS 原生辅助栏 |
| 基线 / 分支 / 提交或PR | 基线 `3cb5bbf`；`dev`；本交接随修复提交并推送，未合并 `main`、未部署 |

## 改了什么

- 共享 tokens 新增 `--focus-ring` 与 `--focus-halo`，Button、Input、Select、Checkbox 使用统一的鼠尾草绿焦点色。
- 桌面和 H5 全局焦点统一为 2px、3px offset；桌面搜索输入框移除与容器重复的内描边。
- H5 搜索容器由棕色双层 outline 改为单层浅光晕，不改变布局尺寸。
- H5 搜索增加 `enterKeyHint="search"`，提交后失焦收起键盘，清除后重新聚焦。
- 新增 `tests/e2e/focus/ui-focus.browser.mjs` 与 UI-003 证据。无 API、依赖、权限或内容迁移影响。

## 怎样验证

- `pnpm lint`：159 文件，0 warning／0 error。
- `pnpm typecheck`：API、桌面、H5 全部通过。
- `FOCUS_TEST_BASE_URL=http://127.0.0.1:3000 node tests/e2e/focus/ui-focus.browser.mjs`：2／2 通过，脚本错误 0。
- `docs/project/evidence/UI-003/search-focus-1440.png`、`search-focus-390.png` 已人工查看，焦点为单层轻量反馈。
- Chromium 移动视口不是 iPhone；当前预览数据不是完整 demo 检索集，因此测试只断言搜索提交与 URL，不伪造结果命中。

## 下一位怎么接

- 尚未完成或存在的风险：iOS 键盘上方“上一个／下一个／完成”为 Safari 原生辅助栏，H5 不能可靠关闭；真机 Safari 仍需复核。
- 下一步最具体的一件事与所需文件：在真实 iPhone 打开 `/h5/search`，检查焦点光晕、搜索回车键和提交后键盘收起。
- 失败如何恢复，哪些现场不能覆盖：可还原本任务提交；保留 `apps/site/next-env.d.ts`、ARCH-001 evidence 与未跟踪品牌素材。

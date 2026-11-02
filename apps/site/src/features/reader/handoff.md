# READER-001 阅读模块交接

- 日期：2026-10-30
- 分支：`agent/READER-001/kimi`
- 基线：`0381904161d095dd8ca14c24a72a37ffa0cee9fa`
- 提交：以本交接所在提交为准；最终 SHA 由 `git rev-parse HEAD` 读取
- 状态：模块实现与本地自检完成；未接入共享动态页、未合并、未推送、未部署、未经过独立评审

## 1. 交付范围

仅新增 `apps/site/src/features/reader/` 与 `tests/unit/reader/`。没有修改共享路由、页面、布局、全局样式、API、契约、依赖、锁文件或中央 board。

| 文件 | 职责 |
| --- | --- |
| `reader-article.tsx` | 三类记录共用的文章结构；技术目录、菜谱真实快捷入口、随想/各类记录补充 |
| `record-body.tsx` | 服务端输出清洗后的正文 HTML，只向客户端传递挂载 ID，避免长文在 RSC 中重复序列化 |
| `record-body-client.tsx` | 正文增强入口与图片查看状态 |
| `record-body-enhancements.ts` | 代码复制/失败反馈、代码与表格局部横滑、图片按钮和缺图反馈 |
| `table-of-contents.tsx` | 桌面侧栏、移动展开目录、三级缩进、锚点定位、直接 hash/后退与焦点处理 |
| `image-lightbox.tsx` | 原生 `dialog` 图片查看，Escape/按钮关闭、滚动锁定与焦点/位置恢复 |
| `reader-model.ts` | 类型标签、目录层级和菜谱快捷入口纯逻辑 |
| `reader-interactions.ts` | hash、减少动效、复制结果、焦点与滚动恢复纯逻辑 |
| `reader.module.css` | D/D² 阅读排版、有限手写补充、响应式和减少动态效果 |

正文、目录与文章结构仍在服务端输出；没有 JavaScript 时正文保持可读。未引入 UI、Markdown、动画或浏览器测试依赖。

## 2. 集成方式

共享 `records/[recordRef]` 动态页取得现有 `RecordDetail` 后，用本模块替换原文章内部标记：

```tsx
import { ReaderArticle } from "../../../features/reader";

return (
  <main className="reader-main">
    <ReaderArticle record={record} />
  </main>
);
```

公开接口：

```ts
interface ReaderArticleProps {
  readonly record: RecordDetail;
  readonly supplements?: readonly ReaderSupplement[];
  readonly marginNote?: string;
}

interface ReaderSupplement {
  readonly id: string;
  readonly occurredOn: string;
  readonly title?: string;
  readonly text: string;
}
```

也可按需直接导入 `RecordBody`、`createReaderToc`、`createRecipeQuickLinks`。样式依赖现有 `:root` 中的 `--paper`、`--paper-light`、`--archive`、`--ink`、`--muted`、`--revision`、`--line`、`--serif`、`--sans`、`--mono`。

集成注意：

1. 不再同时渲染旧 `.record-body` 和旧目录，避免正文与锚点重复。
2. `record.body.html` 必须继续来自 Nest 已清洗、已授权的 HTML；本模块不是解析器或权限边界，不接收未清洗 Markdown/HTML。
3. `supplements` 与 `marginNote` 只传真实内容源已有的数据。当前共享 `RecordDetail` 没有补充字段，需要内容协议/集成任务显式衔接；缺省不会生成空补充或虚构文案。
4. 菜谱入口仅从真实 TOC 的“材料/食材/配料”“工序/步骤/做法”“注意点/注意事项/提醒”等标题生成；缺小节时不显示对应入口，也不强制空白材料或工序模板。
5. 图片使用内容 API 已返回的 URL，保留原生比例与懒加载；图片优化、派生尺寸、私密附件缓存和部署代理仍由对应任务保证。
6. 集成后需要重新测量客户端 JS 与首屏资源。本模块避免把正文 HTML 传给客户端，但没有把未接入状态当作预算验收。

## 3. 实际验证

在 READER-001 worktree、Node.js `24.22.1`、pnpm `11.23.0` 下执行：

| 命令 | 结果 |
| --- | --- |
| `npx --yes pnpm@11.23.0 install --frozen-lockfile --registry=https://registry.npmjs.org/` | 锁文件未变，现有依赖安装成功 |
| `./node_modules/.bin/tsx --test tests/unit/reader/*.test.ts` | 15 / 15 通过 |
| `npx --yes pnpm@11.23.0 typecheck` | config、contracts、api、site 全部通过 |
| `npx --yes pnpm@11.23.0 lint` | 45 个文件，0 warning / 0 error |
| `./node_modules/.bin/oxlint tests/unit/reader` | 0 warning / 0 error |
| `npx --yes pnpm@11.23.0 build` | 共享包、Nest、Next 构建通过 |
| `npx --yes pnpm@11.23.0 test:unit` | 既有 15 / 15 通过 |
| `npx --yes pnpm@11.23.0 test:integration` | 既有真实 Nest HTTP 4 / 4 通过 |
| `npx --yes pnpm@11.23.0 test:e2e` | 既有构建后 Nest + Next SSR 1 / 1 通过 |

新增单元测试覆盖：目录三级缩进与高层级回跳、空目录、菜谱标准标题/缺失/误匹配、hash 解码与异常、减少动效选择、代码原文与 200 列/尾换行复制、空代码、剪贴板拒绝、图片关闭后的滚动和焦点恢复顺序。

## 4. 未验证与验收边界

- 本模块尚未被共享动态页引用，所以现有构建与 SSR 回归不证明集成后的阅读页面、CSS Modules 产物或 RSC/客户端预算已验收。
- 当前项目没有 `playwright`、`@playwright/test` 或 `jsdom`。未执行真实浏览器阅读器 E2E；新增测试是可测交互逻辑与纯数据规则，不冒充 DOM/浏览器交互证据。
- 未验证 320–1440 连续视口、真实触摸横滑、键盘全流程、浏览器前后退、实际剪贴板权限、原生 `dialog` 焦点约束、快速连续开关、减少动态效果系统设置和缺图网络场景。
- 未执行桌面 Safari/Chrome 或 iPhone Safari 真机验收；地址栏、安全区、横竖屏和系统字体放大均未验证。
- 未做视觉独立评审、长文/12 列表格/20 图压力样本、性能预算、资源体积、LCP/INP/CLS 或真实内容验收。
- 合成 fixture 不冒充用户真实技术经验、菜谱实践或随想；本模块没有导入真实私密数据，也没有改变公开/私密数据边界。

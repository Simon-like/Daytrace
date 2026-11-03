# Public Sharing and Reading Preferences Implementation Plan

**Goal:** 完成 F4 公开订阅／分享与双端正文偏好，为功能完整版本补齐发布前的公开发现能力。

**Architecture:** 公开聚合只消费 `getPublicRecords()` 的公开摘要并遍历 `nextCursor`；桌面路由输出 RSS、sitemap 与规范分享图，H5 复用同一公开数据但 canonical 始终指向桌面。共享 UI 包提供无框架偏好解析和双端原生按钮控制，CSS 变量只改变阅读正文。

**Tech Stack:** Next.js 16.4.3、React 19.3.1、TypeScript、`next/og`、Noto Sans SC（SIL OFL 1.1）、localStorage、node:test、Playwright。

## Global Constraints

- 只在 `dev` 串行开发，每个功能／修复／文档切片验证后独立 commit 并 push；不合并 `main`、不部署。
- 所有 RSS、sitemap、canonical、OG 元数据与分享卡复用公开 API；不得读取主人索引或自行补齐后过滤。
- 分享卡使用本地完整中文字体和许可证，不调用第三方图片服务；私密或未知 ID 使用同一通用品牌卡。
- 字号偏好 key 为 `daytrace.readingFontSize.v1`，值为 `standard | large | xlarge`；非法值回退标准。仅调整正文，不缩放导航与控件。
- 本地 Chromium、合成内容和托管 CI 不等于真机、社交爬虫或生产发布验收。

### Task 1：公开聚合与分享元数据

**Files:**
- Modify: `packages/content/src/public-api.ts`
- Create: `apps/site/src/app/rss.xml/route.ts`
- Create: `apps/site/src/app/sitemap.ts`
- Create: `apps/site/src/app/robots.ts`
- Modify: `apps/site/src/app/layout.tsx`
- Modify: `apps/site/src/app/records/[recordRef]/page.tsx`
- Modify: `apps/h5/src/app/layout.tsx`
- Modify: `apps/h5/src/app/records/[recordRef]/page.tsx`
- Test: `tests/unit/`、`tests/e2e/acceptance/`、`tests/e2e/h5/`

- [ ] 为公开游标遍历、XML 转义、RSS 项与元数据写失败测试。
- [ ] 实现每页最多 50 条的公开全量读取、RSS 2.0、sitemap、robots 和双端 OG/Twitter/canonical。
- [ ] 验证 8 篇公开示例全部出现，私密／草稿 canary 和 owner／H5 别名不出现；桌面分享地址与 H5 canonical 一致。
- [ ] 运行相关测试、lint、typecheck，独立提交并推送。

### Task 2：本地中文分享卡

**Files:**
- Create: `apps/site/assets/` 下的 Noto Sans SC 字体与 OFL 许可证
- Create: `apps/site/src/app/records/[recordRef]/opengraph-image.tsx`
- Test: `tests/e2e/acceptance/`、`docs/project/evidence/SHARE-001/`

- [ ] 下载并校验官方完整中文字体及 OFL 文件；必要时生成完整静态 400 字重实例，而非按示例文本裁剪。
- [ ] 用 `ImageResponse` 输出 1200×630、纸张／档案绿风格的公开标题、类型、日期与 Daytrace 品牌；动态读取公开详情。
- [ ] 私密或未知 ID 输出通用卡，不返回记录存在性或私密标题。
- [ ] 验证 Content-Type、PNG magic bytes 和公开／私密元数据负例，保存并实际查看中文 PNG；独立提交并推送。

### Task 3：双端正文偏好、全量验收与交接

**Files:**
- Modify: `packages/ui/src/`
- Modify: `apps/site/src/app/layout.tsx`
- Modify: `apps/site/src/features/reader/`
- Modify: `apps/h5/src/app/layout.tsx`
- Modify: `apps/h5/src/app/globals.css`
- Modify: `apps/h5/src/components/mobile-reader.tsx`
- Test: `tests/unit/`、`tests/e2e/acceptance/`、`tests/e2e/h5/`
- Create: `docs/project/reports/SHARE-001.md`
- Create: `docs/project/evidence/SHARE-001/`
- Create: `docs/collaboration/handoffs/SHARE-001-kimi-sharing.md`
- Create: `docs/collaboration/reviews/SHARE-001-self-review.md`

- [ ] 写偏好解析、预恢复、按钮键盘／`aria-pressed`、刷新恢复和非法存储失败测试。
- [ ] 实现同源 localStorage 三档偏好；桌面约 17.2／19.2／21.2px，H5 为 17／19／21px。
- [ ] 验证公开与主人阅读、390／430px 无整页溢出、减少动态效果和双端既有路径不回归。
- [ ] 执行 lint、typecheck、unit、integration、content、build、桌面与 H5 浏览器、文档检查；核验最新功能提交托管 CI。
- [ ] 保存报告、证据、handoff、self-review，submit／complete SHARE-001，更新当前上下文与项目进度；文档独立提交并推送。QA／RELEASE 外部门槛不得因此关闭。

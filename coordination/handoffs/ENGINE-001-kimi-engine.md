# ENGINE-001 集成交接

- 日期：2026-10-30
- 执行者：kimi-engine；基线：b993b1b
- 任务提交：c7005e9c4a6d08f5dbfb0f23d98fcd97fb4d5705
- 集成状态：已合并 main；未部署

正式报告见 `docs/project/reports/ENGINE-001.md`。交付唯一 pnpm workspace：apps/site、apps/api、packages/contracts、packages/config；固定 Next 16.4.3、Nest 12.3.2、React 19.3.1、TypeScript 7.0.2、pnpm 11.23.0。

实现合成 Markdown → Nest 候选快照与公开投影 → 共享运行时契约 → Next 请求时 SSR；含列表、详情、附件、目录、旧 slug、错误定位、contentRevision、配置校验、统一根命令与品牌入口。仅 published+public 可公开，私密/草稿及附件隔离，坏快照不伪装空列表。

真实身份、主人访问、搜索、生产反代/standalone、CI、iPhone 和性能验收未完成。ARCH 的 80 KiB JS 预算差距仍需跟踪。

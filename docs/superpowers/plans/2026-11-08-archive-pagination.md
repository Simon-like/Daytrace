# 双端归档分页 Implementation Plan

**Goal:** 让桌面与 H5 用户访问所有公开记录及其标签。

**Architecture:** 服务端从完整公开记录构建标签集合；客户端沿用公开列表游标，在筛选条件下追加页面，并在条件切换时丢弃旧请求。游标失效时提示重新读取。复用现有公开契约，避免暴露私密标签。

**Tech Stack:** Next.js、React、NestJS、TypeScript、pnpm。

## Global Constraints

仅使用公开投影；保留现有工作区改动；在 dev 上按任务认领、验证、提交并推送。

### 任务 1：完整标签与双端分页

- 修改 `apps/site/src/app/archive/page.tsx` 和 `apps/h5/src/app/archive/page.tsx`，利用 `getAllPublicRecords` 构造公开标签，保留首屏列表。
- 扩展 `packages/content/src/records-api.ts` 接受可选游标；保持筛选参数和错误解析一致。
- 修改 `apps/site/src/features/records/records-discovery.tsx`、`apps/h5/src/components/mobile-archive.tsx`：按当前筛选追加下一页，禁用并发加载，处理失败和游标过期；筛选变化取消旧请求。
- 在 `tests/unit/find/` 覆盖游标请求及失败；用大于 50 条公开记录验证两端加载与标签，包含无标签记录和私密标签隔离。
- 运行针对性测试、类型检查、文档检查；记录实际验证与限制后提交推送。

# 公开标签聚合 Implementation Plan

**Goal:** 在保持公开权限边界的前提下，用一次请求取得完整归档标签。

**Architecture:** Nest 在安装内容快照时从 `publicRecords` 建立去重标签集合，公开 GET 接口返回与公开内容一致的修订号；共享契约验证响应，两端归档并行读取首屏和标签。标签请求失败保留首屏和明确提示。

**Tech Stack:** NestJS、Next.js、TypeScript、pnpm。

## Global Constraints

只读取 published + public 投影；快照失败不得伪装成空结果；旧用户工作区保持原样。

### 公开标签

- 在 `ContentService` 安装快照时更新标签，在 `ContentController` 增加 `/records/tags`，放在动态记录路由前。
- 在 `packages/contracts/src/index.ts` 增加响应解析；共享公开客户端新增 `getPublicTags`，双端归档替换逐页汇总。
- 测试公开／私密／草稿隔离、后页标签、内容变化刷新、空标签及无效响应；运行集成、单元、构建与文档检查。

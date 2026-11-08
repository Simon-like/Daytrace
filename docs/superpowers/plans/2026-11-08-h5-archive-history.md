# H5 归档返回恢复 Implementation Plan

**Goal:** 从 H5 后续归档页阅读文章后返回原列表与位置。

**Architecture:** 复用共享 discovery 快照的公开记录校验，在当前 history entry 存储已应用筛选、已加载分页和滚动位置；返回时先验证筛选与快照，再恢复或重新请求。切换条件与历史导航取消旧请求。

**Tech Stack:** React、Next.js、TypeScript、Playwright。

## Global Constraints

历史状态只允许公开投影；保留现有工作区；合成 Chromium 不等于真实 iPhone。

### 列表恢复

- 修改 `apps/h5/src/components/mobile-archive.tsx`：按已应用条件保存与恢复公开快照、位置和内容修订；新筛选保存旧 entry，损坏状态回退网络。
- 使用已有 `readDiscoveryEntry` 与 `sameDiscoveryFilters` 保持公开校验，取消在途请求并恢复浏览器滚动设置。
- 用超过 50 条合成公开记录的真实 Nest 和 H5 浏览器验证分页后返回、筛选与位置；运行关联单元、lint 和 typecheck。

# 双端搜索筛选 Implementation Plan

**Goal:** 在 PC 和 H5 的公开／主人搜索中使用服务端已有筛选能力。

**Architecture:** 共享搜索状态保存已提交的类型、主人状态和可见性，客户端把它们绑定到每页请求与 URL；两端表单维护待提交选项，历史导航从 URL 恢复。公开请求始终去掉主人专有参数。

**Tech Stack:** React、Next.js、NestJS、TypeScript。

## Global Constraints

保留现有鉴权与游标签名；主人专有条件不进入公开请求；旧工作区不覆盖。

### 搜索条件

- 在 `packages/content/src/search-state.ts` 定义、规范化和解析筛选条件，写入 URL 并随 reducer 保存。
- 在 `packages/content/src/search-api.ts` 将类型和主人专有条件添加到请求；游标请求复用已提交条件。
- 双端搜索表单添加类型、主人状态与范围选择，提交和历史导航显式同步，失败和分页保留已提交条件。
- 测试公开参数隔离、URL 往返、旧请求与分页绑定；使用真实 Nest 合成数据及双端 Chromium 检查筛选与历史恢复。

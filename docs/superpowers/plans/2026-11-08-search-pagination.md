# 双端搜索分页 Implementation Plan

**Goal:** 让公开和主人搜索能够访问全部匹配结果并安全处理会话失效。

**Architecture:** 共享搜索客户端传递已有服务端游标；共享 reducer 管理追加、失败与请求代次，双端分别提供加载更多和从头重试。查询变化或清空取消当前请求，主人会话失效清除已显示的私密结果。

**Tech Stack:** TypeScript、React、Next.js、NestJS。

## Global Constraints

保留公开和主人响应解析、Cookie 授权与游标绑定；不更改未提交现场。

### 搜索分页

- 修改 `packages/content/src/search-api.ts` 传递可选游标；测试请求保留 q、scope、limit、cursor。
- 修改 `packages/content/src/search-state.ts` 增加分页状态和带代次的追加／失败动作；单测验证旧响应不追加及 AUTH_REQUIRED 清空结果。
- 修改 `apps/site/src/features/search/search-panel.tsx` 和 `apps/h5/src/components/mobile-search.tsx`，提供加载更多、失败重试及过期游标从头检索。
- 运行单测、lint、typecheck 和双端浏览器合成分页验证；记录真实身份和真机的验证边界，提交并推送 dev。

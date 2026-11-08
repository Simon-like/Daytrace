# 移动内容库 Implementation Plan

**Goal:** 在独立 H5 中访问并使用已有主人内容管理功能。

**Architecture:** H5 新建受主人会话保护的内容库页面，复用现有内容管理组件和 Nest API；组件接收主人路由前缀以适配两端。H5 页面使用既有布局与移动底部导航。跨应用组件复用作为当前集成方式，后续可按业务边界抽成共享包。

**Tech Stack:** Next.js、React、NestJS、TypeScript。

## Global Constraints

复用服务端权限、Origin/CSRF 及私密边界；不修改真实内容，不将 Chromium 视为 iPhone 验收。

### 移动内容库

- 为 `apps/site/src/features/content-management/content-manager.tsx` 增加主人路由前缀；读取失败不保留旧内容库。
- 新增 `apps/h5/src/app/owner/content/page.tsx`，使用 owner API 校验会话并呈现内容库；设置非索引元数据。
- 在 H5 主人页和关于页提供指向新路由的入口，确保 Next 的 basePath 与直连／代理一致。
- 用隔离合成 Demo 浏览器验证访客、登录、手机宽度的导入私密草稿、列表和主人详情；运行 typecheck、lint 和内容管理测试并记录限制。

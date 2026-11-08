# 内容库会话失效与预览恢复 Implementation Plan

**Goal:** 在两端内容库准确清除失效会话的私密界面，同时保留可恢复的未完成预览。

**Architecture:** 共享管理客户端维护会话代次并在 401 时通知内容库，拒绝旧代次的在途响应；内容库清除私密内存和筛选并提供重新登录。预览标识仅在明确 404 或完成后移除，受限 sessionStorage 不阻断当前操作。

**Tech Stack:** React、Next.js、NestJS、TypeScript。

## Global Constraints

不向日志或公开状态写私密正文；不把网络故障当成身份过期；失效后不删除服务器端预览。

### 会话与预览

- 扩展 `packages/content/src/management/api.ts` 的状态错误、会话事件和请求代次；单测 401、网络故障和并发晚到响应。
- 修改 `content-manager.tsx` 订阅会话失效、清空内存并提供正确端的登录入口，安全访问 sessionStorage；恢复失败保留可重试标识。
- 在 PC/H5 隔离浏览器中验证列表已加载后的编辑请求 401 清空与重新登录链接，运行单元、类型、lint 和相关浏览器测试。

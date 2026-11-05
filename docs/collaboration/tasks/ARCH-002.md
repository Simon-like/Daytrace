# ARCH-002：主人读取深化与 AI 模块导航

## 目标

收敛桌面与 H5 重复的主人 SSR 读取适配器和 owner 运行时解析，形成一个框架无关的共享客户端、两个 Next 薄组合根和一份契约入口；同步修正架构导航，让后续开发与 AI 能按业务概念快速定位模块。

## 交付与验收

- `@daytrace/contracts` 提供 owner 列表／详情响应解析，公开与主人仍分别执行 `published+public` 和主人投影校验，关联记录与附件规则不回归。
- `@daytrace/content/owner-api` 提供 `createOwnerApiClient(sessionValue, options?)`，保留 `list(cursor?)`、`record(recordId)`、`csrf()`；options 仅包含 `apiInternalOrigin` 与 `fetch`，不开放 scope、路径或身份头。
- 桌面与 H5 `src/server/owner-api.ts` 只负责 `next/headers` 会话读取和共享工厂组合，页面调用方式不变。
- SSR 转发测试从共享边界导入并可显式注入 Nest origin；固定 Cookie、无身份伪造头、过期会话、私密正文和附件安全测试保留。
- 架构导航准确列出 site、h5、api、contracts、config、content、ui 及 content-management，给出按需求定位入口和依赖方向，不建立第二套项目状态。
- lint、typecheck、unit、integration、content、build、双端浏览器和文档检查通过；保存报告与证据，独立 commit 并推送 `dev`。

## 边界与交接

owner 为 `kimi-ARCH-002-owner-reader`，只在 `dev` 串行集成，不新建任务分支、不合并 `main`、不部署。公开与主人读取不合并权限语义；不迁移搜索、资产读取、内容发布或双端 UI，不新增通用 utils、DI 框架、内存权限替身或第二套业务 API。已有本地提交 `2fc74c3`、`04e41fc` 和他人／测试生成现场必须保留，不得混入无关提交。

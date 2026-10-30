# 正式站点边界

这里将承接Next.js App Router正式站点。用户已确认React/Next + Nest + monorepo；当前仍只有目录，尚未生成框架项目、安装运行依赖或迁移原型。

- `src/components/`：通用基础组件，不放内容读取与权限判断。
- `src/layouts/`：站点壳与页面布局，跨模块共享改动由集成者合并。
- `src/styles/`：视觉令牌、正文排版与通用响应式，避免每个模块自造一套。
- `src/features/records/`：首页/记录/标签/时间索引的展示和应用逻辑。
- `src/features/reader/`：三类详情、目录、代码、图片与补充阅读。
- `src/features/search/`：公开检索界面和调用契约，不持有私密搜索数据。
- `src/features/owner/`：主人视图，不能用前端隐藏充当访问控制。
- `src/server/`：仅Nest服务端API适配、受控会话转发和错误映射；不得由浏览器入口导入，不另做业务授权。

src/app为路由与布局入口，由ENGINE-001在版本兼容验证后创建；pnpm统一管理site/api和contracts/config。不提前拆UI包或微前端。详见[研发交接](../../docs/architecture/研发交接与任务编排.md)。

原型继续保存在 `design/contributions/2026-10-30-codex-modules-v1/`；先复用设计令牌与模块规律，不把硬编码样本模板直接当生产Markdown系统。

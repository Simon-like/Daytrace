# Daytrace 成品演示版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
>
> 本轮执行方式：用户要求本聊天验收后持续开发，直接在当前会话逐项执行，不另开Agent或等待选执行方式；现有四个已提交worktree由集成者审阅后合并，不覆盖未提交修改。

**Goal:** 将Kimi的四个模块集成为真实Next/Nest演示站，完整浏览技术/菜谱/随想、归档与搜索，演示隔离的主人空间，附浏览器验证与可重现运行入口。

**Architecture:** 复用现有pnpm workspace，Nest作为内容和授权唯一边界，Next服务端正文与局部交互。同域API适配、示例Markdown和显式本地演示启动器将模块连接；真实身份提供商/生产部署保持未验证状态。

**Tech Stack:** 已安装的Next/React、Nest、TypeScript、pnpm；Node使用已核验兼容的本机版本并记录与原精确版本差异。浏览器验证采用Playwright Chromium，不冒充真实iPhone。

## Global Constraints

- 保留D/D²深橄榄/纸白、手写注记，320–1440专业响应式，正文不依赖客户端解析。
- 正文为标准Markdown；公开与私密的正文、附件、摘要、索引、缓存统一隔离。
- 不读取用户真实私密资料，不把示例内容描述为真实经历；无站内编辑器、原生App、复杂Agent。
- 保留当前未提交board、实验报告与重复图标目录，不reset、不替换他人分支。
- 成品Demo不等于正式生产验收；真实OIDC、服务器部署、iPhone和恢复演练单独列明。

## Task 1: 审阅并集成已有模块

Files: 四个agent/*/kimi分支、docs/collaboration/reviews、主分支共享集成文件。
Interfaces: `ReaderArticle({record})`、`RecordsDiscovery({initialRecords})`、`SearchPanel()`、`SearchModule.register(contentModule)`、`AuthModule.register(options)`。

- [x] 阅读四份handoff，检查其实际提交和工作树，分别合并，不改作者分支。
- [x] 执行新增模块测试，证据包含实际命令/Node版本/结果，模块交付与最终端到端验收分开。
- [x] 核对失败语义、服务端授权与安全默认，必要修复在集成任务记录。

## Task 2: 公开应用与内容闭环

Files: apps/api/src/app.module.ts、modules/content、apps/site/src/app/api/v1/[...path]/route.ts、apps/site/src/app/{archive,search,about}/page.tsx、records/[recordRef]/page.tsx。
Interfaces: 现有`getPublicRecords()`/`getPublicRecord(id)`继续有效，Nest搜索仅取公开投影；同域代理只转发允许的API路径和必要头。

- [x] 注册SearchModule与唯一内容实例，接入ReaderArticle、RecordsDiscovery、SearchPanel。
- [x] 用真实HTTP负例验证未授权私密记录与附件返回404/401，搜索不泄露canary。
- [x] 增加三类丰富示例Markdown与附件，保留工程测试fixture独立；缺字段/坏内容仍失败关闭。
- [x] 页面包含首页、归档、搜索、三类详情、关于、404与故障恢复入口。

## Task 3: 主人空间演示与会话边界

Files: content owner投影、auth/assets接线、Next owner路由、scripts/demo/run-demo.mjs、tests/integration/demo。
Interfaces: 复用`OwnerGuard`/`SessionService`/`AssetCatalog`，不在Next判定主人；生产不允许合成身份。

- [x] 实现同一快照的授权owner list/detail与附件目录适配，避免重复assets路由。
- [x] 演示入口仅在显式本地Demo模式和回环监听启用；公开/生产默认无演示入口，数据全部合成。
- [x] 验证匿名不能读私密，演示会话可读，注销/过期后不能读，公开搜索不因登录混入私密。

关键断言：
```ts
assert.equal((await fetch(`${api}/api/v1/records/${privateId}`)).status, 404);
assert.equal((await fetch(`${api}/api/v1/records?scope=owner`)).status, 401);
assert.ok(!(await (await fetch(`${site}/`)).text()).includes('PRIVATE_ENGINE_CANARY_9C2E'));
```

## Task 4: 档案视觉与移动交互

Files: apps/site/src/layouts、components、styles、app/globals.css、public/brand与示例照片。
Interfaces: 固定字体/颜色令牌延续现有`--archive/#29352C`与`--paper/#F0F0E8`，视觉不改业务授权。

- [x] 建立带活跃导航与移动菜单的站点壳；首页以档案概览、真实内容预览和手写短注组织，保留明确示例标识。
- [x] 强化中文标题/正文层级、桌面分栏、手机重排，菜单、图片和目录可触摸与键盘操作。
- [x] 检查减少动效、断点间宽度、焦点与滚动恢复；不使用全局隐藏溢出掩盖布局错误。

## Task 5: 验收与稳定运行

Files: tests/e2e/acceptance/demo.browser.mjs、scripts/demo、package.json、docs/project/evidence/DEMO-001。
Interfaces: 一条`pnpm demo`命令启动已构建site/api；浏览器测试使用`DEMO_BASE_URL`与固定样本ID。

- [x] 运行lint/typecheck/全部新增及既有测试、内容校验与生产构建，修复回归。
- [x] 真实Chromium点击筛选/搜索/前后退/阅读目录/复制/图片查看/登录退出，在320/390/768/1440检查溢出与截图。
- [x] 保存桌面与手机实际截图、验收JSON；记录资源预算差距，测试失败不刷绿。
- [x] 验证故障页、匿名私密字节隔离、同域图片、链接与空结果。

## Task 6: 交付与进度

Files: docs/project/reports/DEMO-001.md、项目进度、当前上下文、README与中央任务记录。

- [x] 报告Kimi已交付/本轮集成/仍未验证的区别，不把本地Demo标为上线。
- [x] 项目校验通过后提交改动，保留其他未提交文件，给用户可打开的演示地址、截图与启动说明。

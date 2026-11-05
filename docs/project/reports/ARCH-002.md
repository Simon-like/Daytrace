# ARCH-002 主人读取深化与 AI 模块导航报告

日期：2026-11-05。执行者：`kimi-ARCH-002-owner-reader`。范围：只收敛双端主人 SSR 读取与 owner 运行时契约，并修正模块导航；不做全仓重写，不改变产品功能、部署或正式 QA 状态。

## 1. 交付结果

- `27deaab` 在 `@daytrace/contracts` 提取共享的记录详情、列表结构解析，新增 `parseOwnerRecordListResponse()` 与 `parseOwnerRecordDetailResponse()`。公开入口仍强制 `published + public`，owner 入口允许主人草稿、私密记录及私密关联记录。
- `2a17f78` 新增 105 行的 `@daytrace/content/owner-api` 深模块，拥有固定 session Cookie 转发、owner API 路径、2 秒超时、错误映射、响应解析和 CSRF 校验。
- 桌面与 H5 的 `src/server/owner-api.ts` 均由 216 行缩至 9 行，只保留 `next/headers` Cookie 读取和工厂组合；页面 `ownerApi()` 调用方式不变。
- 客户端只开放 `list(cursor?)`、`record(recordId)`、`csrf()`，options 只开放 `apiInternalOrigin` 与 `fetch`。没有开放任意 scope、路径、Cookie 或请求头，也没有引入 DI 框架或通用请求器。
- `f0445e0` 新增[模块导航](../../architecture/模块导航.md)，按公开读取、主人 SSR、搜索、线协议、内容发布、桌面／H5 阅读和共享 UI 定位实现与测试；同步修正仓库图、Nest 落地状态及 API 契约状态。

共享模块与组合根共减少 309 行（双端原 432 行，现共享 105 行加双端各 9 行），同时消除了两份 owner 结构解析和传输实现。这里没有把公开与主人权限语义合并，Nest 仍是授权权威。

## 2. 可测试性与 AI 导航

SSR 测试现在直接从 `@daytrace/content/owner-api` 导入，真实 Nest 测试显式注入 `harness.origin`，不再修改和恢复 `process.env.API_INTERNAL_ORIGIN`。新增独立 `fetch`／origin 端口测试，断言 owner scope、固定 Cookie、无 `authorization`、`no-store` 和手动 redirect。

模块导航把“先改哪里”和“跑什么测试”放在同一入口。后续维护者可先按业务概念读取一个拥有规则的模块及最近组合根，不必从路由开始扫描整个 monorepo；该收益是定位路径改善，未虚构 token 节省数值。

## 3. 验证证据

完整机器可读结果见[validation.json](../evidence/ARCH-002/validation.json)。验证 HEAD 为 `f0445e0b07b2177571535820bfb702caab77f806`，所有下列本地命令退出码均为 0：

| 门禁 | 实际结果 |
| --- | --- |
| lint | 196 文件，0 warning，0 error |
| typecheck | 共享包构建及 API、桌面、H5 类型检查通过 |
| unit | 64／64 |
| integration | HTTP／搜索 12，权限／SSR 15，Demo 5，全部通过 |
| content | 11／11 |
| build | Nest、桌面 Next、H5 Next 生产构建通过 |
| 桌面浏览器 | 23／23 路径，56 视口，console error 0 |
| H5 浏览器 | 6／6 检查，28 布局，error 0 |
| 文档 | 实现导航后 218 文档通过；交接文件完成后最终 221 文档、39 目录项、33 任务，0 error |

浏览器原始结果分别位于 `docs/project/evidence/ARCH-002/browser-results.json` 与 `docs/project/evidence/ARCH-002/h5/browser-results.json`。主人固定 Cookie、过期会话、私密正文、CSRF、私密附件和双端登录／退出链路均保留真实测试。

本机 Node 为 24.22.1，项目声明 24.18.0；pnpm 11.23.0 命令持续报告 patch 版本 warning，已如实保留。桌面阅读页必要及请求脚本仍为 142850 gzip bytes，高于 81920 bytes 初始预算；本轮未改善也未提高该预算。

## 4. 明确未做与剩余候选

- 内容发布、搜索工作流、Markdown 阅读增强仍是独立架构候选，本轮未修改其实现。
- 未做双端 UI 合并、资产客户端收敛、通用 utils、内存权限替身或新框架选型。
- Chromium、合成身份和本地视口不等于真实 iPhone、生产身份或正式 QA；UI-002、QA-001、RELEASE-001 的既有门槛不变。
- 所有提交仅存在本地 `dev`。GitHub 认证不可用，未推送，当前完整 SHA 没有托管 Actions 结果；历史 CI 成功不能代表本轮。
- 未合并 `main`，未部署，未宣称完整功能版本或生产验收完成。

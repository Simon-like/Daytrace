# 有迹 · Daytrace

让经历有迹可循。记录技术实践、生活经验与随想，给未来的自己留一条能找回理解的路。

**当前：Next.js + NestJS全栈Demo可运行。** 已集成阅读、归档/公开搜索、移动导航与隔离的主人空间；示例数据非真实经历。真实身份/生产部署与iPhone真机仍未验收。

## 开始体验

```sh
nvm use
pnpm install --frozen-lockfile
pnpm demo
```

打开 **http://127.0.0.1:3000**。命令构建并启动Next standalone与Nest，Ctrl+C同时停止；只在本机使用合成演示身份，不接真实私密资料。

[完整运行手册](scripts/demo/README.md) · [验收与截图](docs/project/reports/DEMO-001.md) · [当前进度](docs/project/项目进度.md)

## 开发接手

先看[当前上下文](docs/context/当前工作上下文.md) → [协作约定](AGENTS.md) → [研发交接](docs/architecture/研发交接与任务编排.md) → 中央任务。技术方向已固定，不重开框架选型。

```text
apps/site/      Next App Router与展示/阅读交互
apps/api/       Nest内容/搜索/会话/附件
packages/       contracts与config共享包
content/        未来个人内容，private独立保管
apps/api/fixtures/demo/   合成演示Markdown及附件
scripts/demo/   一条命令启动本地成品演示
.github/        CI与受控交付工作流源码
ops/            发布与恢复模板/手册
knowledge/      可复用研发认识
docs/           产品/架构/设计/阶段报告
design/         品牌、历史主题与原型
coordination/   中央任务/交接/评审
```

## 验证

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm docs:validate
pnpm content:validate:demo
```

Demo运行时可执行 `pnpm test:browser`；首次先 `pnpm exec playwright install chromium`。`pnpm dev`仍保留ENGINE小样本开发入口；成品示例与演示身份使用`pnpm demo`显式开启，详见手册。

当前浏览器回归通过不等于iPhone/生产验收；文章脚本约139.1 KiB gzip超出原80 KiB预算，作为下一专项保留。真实私密源、凭据、备份不进普通Git；共同远端origin/main，同步状态查Git。不得将演示认证用于公网或真实资料。

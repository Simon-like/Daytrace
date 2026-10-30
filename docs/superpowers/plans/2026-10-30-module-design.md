# 功能模块页面稿 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 完成 D 档案主题的本地可运行模块稿，展示首页、索引、技术、菜谱、随想、关于与失败页的桌面和手机布局。

**Architecture:** 原生 HTML/CSS/JavaScript，公开合成样本，不接入真实身份与私密内容。原生链接用 `?page=` 导航，独立样本数据和页面模板，交互仅服务设计验证；不提前锁定正式站点框架。

**Tech Stack:** 浏览器原生能力，Python 本地静态预览，项目中已有 Playwright 用于检验，不新增前端依赖。本轮内联执行，按用户当前模块设计任务推进，不派生子任务。

## Global Constraints

- D/D² 私人档案主题，保留手写注记，禁止大面积撞色。
- 手机为核心阅读设备，320 CSS px 起适配；模拟不能声称真机通过。
- 不实现站内编辑、真实登录、私密存储、正式发布或内容迁移后端。
- 示例与生成照片明确标识，旧主题/其他 Agent 的代码不覆盖。

## 文件与接口

根目录：`design/contributions/2026-10-30-codex-modules-v1/`。

| 文件 | 职责/接口 |
| --- | --- |
| index.html | 页面壳、viewport、样式和 app.js 入口 |
| tokens.css | 已确认视觉的颜色、字体、间距、动效与尺寸令牌 |
| styles.css | 共享结构、正文、模块、弹层和响应式 |
| data.js | 导出 `records`、`categories`、`escapeHtml(value)`；仅公开合成内容 |
| pages.js | 导出 `renderPage(page, params)`，返回 `{title, html, active}` |
| app.js | 渲染壳，绑定搜索/菜单/复制/图片查看，维护当前页入口 |
| assets/mapo-tofu.png | 独立生成菜谱照片示例，无文字 |
| validate.mjs | 使用现有 Playwright 检查多视口、交互和保存截图/JSON |
| 模块设计说明.md、交付说明.md | 模块排版、断点、验证、来源与限制 |

页面标识：home、archive、tech、recipe、thought、about、404。统一 `main#main-content`；搜索 `dialog#search-dialog`，菜单 `dialog#menu-dialog`，图片查看 `dialog#image-dialog`。所有标题定位 ID 固定。

## 设计方案

颜色沿用阅读面 #F0F0E8、橄榄 #29352C、墨色 #252A25、辅助色 #62695B、修订色 #96604B、细线 #D4D7CC。标题 Songti SC，正文 PingFang SC，少量 Kaiti SC 手写，代码 SFMono；均先用本机回退，不下载完整中文字库。

桌面：窄档案侧栏 / 中央主内容 / 详情目录或页边注。手机：紧凑顶栏 / 单列内容 / 段后手写注记；宽代码和表格独立滚动。标志性细节是带来源的手写页边注及“当时/后来”补充，不加入无意义装饰编号。

```text
首页桌面：档案栏 | 记录引言 + 手写短注 | 下方技术主栏 / 厨房栏目
首页手机：顶栏 → 引言 → 技术记录 → 厨房 → 认知补充 → 近期记录
文章桌面：档案栏 | 正文阅读列 | 目录 + 页边短注
文章手机：顶栏 → 标题 → 展开目录 → 正文 → 段后补充
```

## Task 1：共享壳与可审阅版式

- [x] 创建 index.html、tokens.css、styles.css、data.js、pages.js、app.js。
- [x] `renderPage('home', new URLSearchParams())` 生成首页；导航和搜索按钮都有实际目标。
- [x] 在 390/1440 预览首页，检查 D 侧栏、手写与主内容顺序；首轮不加载线上字体。

## Task 2：阅读与索引模块

- [x] 建立 archive、tech、recipe、thought、about、404 模板及 URL 参数。
- [x] 技术模板包含标题/引用/代码/宽表格/目录；菜谱材料与步骤单独分区；随想保留后来补充。
- [x] 绑定 native dialog 搜索/菜单/图片，复制按钮提供成功与失败反馈；搜索只处理当前合成公开集合。
- [x] 从首页到详情再后退，清除筛选与搜索无结果均能继续操作。

## Task 3：视觉与响应式验证

- [x] 在贡献目录执行 `python3 -m http.server 7300 --bind 127.0.0.1`。
- [x] 保存七个页面在 320、360、390、430、768、1024、1440 的溢出与错误检查，检查 980/1180 断点前后。
- [x] 使用现有 Playwright：`node validate.mjs`。核心断言为 `document.documentElement.scrollWidth <= innerWidth + 1`；并检验目录、剪贴板、弹层、无结果与减少动态效果。
- [x] 保存各核心模块桌面/手机截图，查看实际截图并修复，再复测相关项。

## Task 4：交付与项目状态

- [x] 写模块设计说明与 M1 阶段进展报告，列出实际验证环境，不报真机通过。
- [x] 登记单一 MODULES-001 资产，更新项目记忆/看板；M1 仅“进行中”，不因原型完成假称技术决策和正式权限完成。
- [x] 用户只看可运行预览与精简的模块对照稿；保留所有源码、图像提示词与证据供接手。

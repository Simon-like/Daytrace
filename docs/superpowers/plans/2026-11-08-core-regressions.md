# 核心回归与 CI Implementation Plan

**Goal:** 让持续集成覆盖内容管理与新增的移动搜索、内容库入口。

**Architecture:** 更新现有 H5 Playwright 场景以使用当前界面和隔离演示身份，在原有 CI integration job 增加内容管理测试。浏览器检查不写入内容库，临时运行证据输出到独立目录。

**Tech Stack:** Playwright、Node.js、GitHub Actions。

## Global Constraints

不覆盖已有工作区证据或修改真实内容；保留 CI 的权限、固定 action 与 aggregate 门禁。

### 共享组件与自动回归

- 将内容管理和阅读预览依赖从桌面应用迁移到 `packages/content`，两端通过包入口复用；保留桌面阅读交互兼容导出，避免 H5 观察桌面应用构建目录引发开发热更新循环。

- 修复 `tests/e2e/h5/mobile.browser.mjs` 过期按钮选择，并使用显式 Demo 启动。
- 扩充真实浏览器场景：公开类型筛选、URL 刷新；未登录访问内容库跳转、登录后可打开内容库并筛选主人记录。
- 在 `.github/workflows/ci.yml` integration job 执行 `pnpm test:content`，更新工作流契约测试。
- 在隔离临时副本运行 H5 浏览器与内容管理测试，运行工作流契约与文档检查，记录真实设备边界。

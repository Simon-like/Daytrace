# SHARE-001 任务交接

| 项目 | 填写内容 |
| --- | --- |
| 任务ID / owner / 工具 | SHARE-001 / `kimi-F4-001-sharing` / Kimi |
| 用户授权与范围 | 迭代至完整功能版本并建设 CI/CD；本轮完成 F4 公开分享与阅读偏好。不含暗色模式、合并 main、部署或生产验收。 |
| 基线 / 分支 / 提交或PR | 基线 `ae44248`；`dev` 已推送 `db9758b`、`beb4f2d`、`634eeaf`、`80b069b`；未合并 main、未部署。 |

## 改了什么

公开 API 增加游标全量读取；桌面新增 RSS、sitemap、robots 和规范分享元数据／图片，H5 的 canonical 与分享图统一指桌面。分享图只读公开详情，非公开和未知 ID 使用同一通用卡。共享 UI 包新增偏好解析、预恢复脚本、原生按钮控件和精确子路径导出，双端正文使用三档字号变量。

没有新增运行时第三方服务或第二套业务 API。Noto Sans SC 完整静态 400 字重实例及 OFL 位于 `apps/site/assets/fonts/`，实例化脚本仅留在忽略的 `.local/`，未作为运行依赖。

## 怎样验证

实际执行 `pnpm lint`、`typecheck`、`test:unit`、`test:integration`、`test:content`、`build`、`test:browser`、`test:h5` 与 `python3 scripts/project_check.py`，结果见[SHARE-001 报告](../../project/reports/SHARE-001.md)。桌面 22 路径／56 视口、H5 6 检查／28 布局通过，单元 62、集成 12＋14＋5、内容管理 11 全部通过。分享 PNG 已实际查看。

GitHub CLI 未认证，未读取或索取凭据；通过公开 GitHub API 核验运行 `41687143244` 对提交 `80b069b33a8f80c0ad0b44699a95a4961ed7621d` 为 completed／success，证据在 `docs/project/evidence/SHARE-001/ci-run.json`。

## 下一位怎么接

- 尚未完成：真实 Auth0、iPhone/Safari、社交爬虫、生产 HTTPS、备份恢复、回滚和性能预算未验收；142838／81920 gzip bytes 差距与 UI-002 阻塞继续保留。
- 下一步：按 QA-001 任务卡和完整 PRD 逐项验收，不把 F4 本地完成当作生产放行。
- 恢复与现场：只从 `dev` 继续；不覆盖 DEMO-001、MOBILE-001、ARCH-001 的既有未提交测试产物和未跟踪设计资产。字体变更需保留完整字符覆盖与 OFL，不能用只含当前标题的裁剪字体替代。

## 第二阶段复审交接（2026-11-04）

独立评审发现并由实现者修复窄屏固定字号覆盖、`localStorage` getter 抛出 `SecurityError` 两项缺口；新增 `readBrowserReadingFontSize(getStorage)` 和对应单元／浏览器负例。本地修复提交为 `2fc74c3ec97121da57bcabce9d2443b4a4684931`，只涉及 6 个功能／测试文件。

最终全量结果为单元 63、集成 12＋14＋5、内容管理 11、桌面 23 路径／56 视口、H5 6 检查／28 布局，lint、typecheck、build 和 215 份文档检查通过。最终证据为 `docs/project/evidence/SHARE-001/revalidation-2fc74c3.json` 及同目录双端 `browser-results.json`。

GitHub SSH agent 未连接，`gh` 与系统钥匙串也没有可用登录；SSH 和 HTTPS 推送均失败，因此本地 `dev` 当前领先 `origin/dev`，修复提交和后续文档提交的推送、托管 CI 核验仍是接手动作。不得沿用 `80b069b` 的运行 `41687143244` 作为新提交 CI 证据。最新脚本值为 142850／81920 gzip bytes，其他外部 QA／RELEASE 门槛不变。

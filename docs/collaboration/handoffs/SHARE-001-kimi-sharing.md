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

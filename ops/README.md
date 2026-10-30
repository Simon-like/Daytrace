# 运维与交付入口

架构方向已确定Next.js + NestJS + pnpm monorepo；CI/CD采用GitHub Actions实施基线，初始Docker/Compose自托管建议待宿主验证。

先看[CI/CD与运维方案](../docs/architecture/CI-CD与运维建设方案.md)及[任务交接](../docs/architecture/研发交接与任务编排.md)。CICD-001在ops/cicd编写工作流配套说明与验证；RELEASE-001完善实际首次部署、内容更新、回滚、备份恢复、故障与升级手册。

当前没有正式应用工作流、生产登录服务或公开部署。每份运行手册需有前提、命令、预期结果、失败恢复、实际验证日期；未执行内容标待验证。

生产与私密备份前明确宿主/账户规则、存储/缓存、凭据注入、发布授权和恢复版本。Git只覆盖普通项目，不能当作真实私密内容备份。

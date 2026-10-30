# ENGINE-001：Next/Nest monorepo正式工程

## 目标

依据已接受ADR和A波证据建立site/api、contracts/config、pnpm锁文件和统一命令。建立content模块及公开Markdown纵向切片，配置启动校验，迁入品牌入口。

## 交付与验收

干净安装/检查/生产构建/运行；一篇标准Markdown含附件从Nest到Next HTML；共享包可用、错误有定位，根命令与配置例子真实可运行。工作流由CICD任务实现。

先读[研发交接](../../docs/architecture/研发交接与任务编排.md)、[技术架构](../../docs/architecture/技术选型与研发路径.md)与[CI/CD方案](../../docs/architecture/CI-CD与运维建设方案.md)，再按PRD和本任务验收项细化。

## 边界与交接

状态、owner、依赖与允许路径只在中央board维护。依赖满足仍需实际派发/认领；不得绕过锁文件/共享路由集成规则。独立worktree由中央协调者认领，不覆盖自己的台账副本。跨范围变更交集成者处理。交接注明SHA、运行方式、实际验证、未验证和合并/部署状态；不以自检冒充独立评审。

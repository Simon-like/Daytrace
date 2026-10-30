# 个人知识与生活站点

让技术实践、生活经验与个人感想容易留下、方便回看，看到自己的变化。

当前：D/D²与手写风格已确认，模块原型先收敛，M1进入技术选型准备。正式内容、身份与私密链路尚未实现。

## 从这里开始

- Agent接手：[协作规则](AGENTS.md) → [项目记忆](docs/项目记忆.md) → [中央任务队列](coordination/board.json)。
- 看文档：[文档目录](docs/README.md)，按产品、设计、架构、研究、报告查找。
- 定技术：[技术选型与研发路径](docs/architecture/技术选型与研发路径.md)，目前优先验证Astro，尚未冻结。
- 看进度：[阶段看板](docs/project/项目进度.md)与[路线图](docs/project/项目路线图与阶段管理.md)。
- 看页面：[模块稿运行入口](design/contributions/2026-10-30-codex-modules-v1/README.md)与[资产索引](design/资产索引.md)。

## 项目地图

```text
apps/site/      正式应用边界
content/        主人未来展示的记录：公开、私密、合成样本
knowledge/      研发经验与操作方法
docs/           产品/设计/架构/研究/阶段报告/历史
design/         视觉资产与既有可运行原型
coordination/   任务、认领、交接、评审
experiments/    技术验证
tests/          协作工具与未来正式应用测试
scripts/        仓库校验和原子任务认领
templates/      个人内容整理模板
ops/            后续发布、备份和恢复文档
```

这是一套协作目录，不表示已安装monorepo构建工具、选定框架或启动多个Agent。正式应用先保持一个，不为了分工过早拆服务/包。

## 常用入口

```sh
python3 scripts/project_check.py
python3 -m unittest discover -s tests/foundation -v
python3 scripts/task_claim.py claim ARCH-001 agent-name
```

任务先读卡、认领再写入；规范见 [coordination](coordination/README.md)。更新文档目录使用 `python3 scripts/project_check.py --write-index`，普通校验不改文件。

内容、依赖、构建、凭据分别管理，私密内容不进普通Git。当前版本操作只在本地，远端、发布和私密备份另行落实。其他Agent通过同一项目或实际传递的副本接手，不自动继承聊天。

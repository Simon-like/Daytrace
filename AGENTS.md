# Kimi / Codex 共用协作入口

本文件适用全仓库。项目规则只有一套，完整规则在docs，不在工具配置里复制。

## 接手顺序

1. [当前工作](docs/context/当前工作上下文.md)：最新用户要求与本轮范围。
2. [稳定共识](docs/context/项目记忆.md)：产品、风格和技术方向。
3. [共同协作协议](docs/collaboration/README.md)及[中央任务](docs/collaboration/board.json)：认领、边界、交接。
4. [当前进度](docs/project/项目进度.md)与任务需要的PRD/设计/ADR，按需阅读。

## 必须遵守

- 先认领再修改；Kimi与Codex使用不同owner，任务和状态只写中央台账。
- 长期只使用`dev`与`main`：日常开发与成果查看基于最新`dev`，`main`只通过明确的`dev → main`合并更新；不再新建agent任务分支。共享路由、契约、依赖与锁文件由集成者串行处理，不覆盖他人现场。
- 项目说明、计划、交接、知识与手册写docs；代码/素材/站点Markdown数据保留原目录。
- 最新用户指令优先；真实私密数据与凭据不进普通Git、公开构建或测试产物。
- 本地Demo、合成身份、Chromium视口不能冒充真实iPhone、生产身份或上线验收。
- 不自动向其他聊天发消息、采购或发布。实际任务决定授权范围。

```sh
python3 scripts/task_claim.py status
python3 scripts/project_check.py
```

局部AGENTS只补充docs规则入口，不另建项目记忆或维护第二套状态。

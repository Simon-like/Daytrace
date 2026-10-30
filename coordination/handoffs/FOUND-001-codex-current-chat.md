# FOUND-001：协作结构交接

- 作者：当前聊天Codex。
- 基线：0a6a1ee，本地初始提交；本文件与最终整理另作本地提交。
- 范围：项目结构、文档/知识分类、上下文包和任务交接；技术候选只保留未讨论草稿。

## 产物

apps/site目录边界；docs目录与catalog生成索引；knowledge/content分工；context三层阅读；10项中央队列、任务卡、交接/评审模板；project_check.py与task_claim.py；研究/历史全文迁移并保留旧入口。

## 实际验证

运行 `python3 scripts/project_check.py` 无结构/链接/任务错误。5项unittest通过：并发认领单赢家、依赖与评审门槛、非owner拒绝、缺失/私密证据拒绝、依赖环和写域冲突。

Git忽略检查覆盖content/private示例、.env、node_modules、原型dist；暂存检查154个初始文件，没有这些不应入库的路径。本地基线已提交，未建立远程或发布。

## 限制与接手

规则不是OS权限或分布式锁。worktree需中央队列协调。文件校验不证明内容正确。正式应用、实际私密和iPhone测试仍未完成。

最新用户要求只定文档结构；技术任务仅占位，后续共同讨论后派发。下一Agent先读当前工作，不自动执行候选技术路线。

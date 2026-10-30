# 工程知识库

这里保存建设本站过程中可复用的认识，不复制PRD、阶段流水或用户待发布的个人记录。

- `inbox/`：尚未核验的线索、问题和候选做法。
- `learnings/`：已经观察到的规律与解决路径，必须注明适用范围和证据。
- `playbooks/`：可以重复执行的操作流程，须有前提、步骤、验证与失败恢复。

每篇采用可读Markdown，头部记录 `id/title/status/updated/sources`。状态为draft、observed、reviewed、superseded；没有实际验证不能标为reviewed，更不能把某个框架文档推广成已在项目跑通。

项目约束的权威来源在docs/product；技术选择在docs/architecture/decisions；本库只引用，不另存一个冲突版本。新发现先写独立条目，评审后由汇总者更新索引和相关操作流程。

## 当前条目

- [从静态稿到响应式页面的四个发现](learnings/NOTE-0001-从静态稿到响应布局.md)

其他Agent接手时按任务读取相关条目，而不是把整个知识库一次性塞进上下文。引用时保留条目ID和来源链接；新反馈可推翻旧结论，但保留状态与变更依据。

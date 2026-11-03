# CONTENT-002 任务交接

- owner / 工具：codex-CONTENT-002-research / Codex。
- 用户范围：同步 Kimi 成果，调研 Markdown 渲染、快捷上传、内容文件夹和文章路由。
- 基线：dev `56d4b60`，fetch 后与 origin/dev 一致；本轮成果在同一 dev 文档提交中，具体 hash 见 Git 日志。未合并 main、未部署。

## 修改

新增研究方案，比较七类候选，推荐服务端 unified 插件链并要求迁移前兼容/性能验证；规划私密草稿导入、预览、持久发布回滚、文件卷结构和 ID/别名路由。修正内容手册的过期解析器和目录说明，更新当前范围、实际进度与文档索引。未修改应用、依赖、契约或真实数据。

## 验证

- 源码核对 content markdown/snapshot/service、双端记录路由、共享 public-api 与 v1 契约。
- Exa 检索及官方资料补读；Context7 核对 unified 管线。方案区分工程判断、代码事实和待实测项。
- `python3 scripts/project_check.py --write-index`：通过，188 篇文档、37 索引项、27 任务，0 错误（交接/评审新增前）。最终以提交前再次检查为准。
- 本轮不改运行行为，未执行应用测试、候选依赖安装、性能跑分、上传或真机验收。

## 下一位接手

先做渲染兼容性试验，再按 F1→F2 落地导入。生产上传需要真实主人身份；旧内存快照不是持久发布/回滚系统。共享依赖、路由和契约仍由集成者串行处理。

保留原现场：apps/site/next-env.d.ts、experiments/ARCH-001/evidence/{integration,standalone-manifest}.json 的修改，以及 design/contributions/2026-10-30-codex-daytrace/daytrace-website-icon/ 未跟踪目录；不纳入本提交。

# 文档维护

文档权威入口见README.md，目录数据在catalog.json；修改目录数据后运行 `python3 scripts/project_check.py --write-index`。

产品要求只在product维护；技术取舍只在architecture/decisions维护；实际进度只在project/项目进度.md维护；设计基线与素材分别在design规范和根design资产区。报告给出当时状态，后续结论用新增记录或注明更新，不把历史报告改得像从未失败。

新研究注明来源和查阅日期，区分官方能力、项目实测和建议。旧文档移动后保留可追溯入口并修复相对链接，不留两个“最新版本”。

并行Agent写独立报告/ADR草案，由集成者更新catalog、记忆、进度与决策索引。机器校验只证明结构与链接，不证明文档内容正确。

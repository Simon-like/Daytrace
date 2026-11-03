# 内容与接口契约

状态：CONTENT-001 交付，供 ENGINE-001 实现与集成评审；不是已上线接口。

- [Markdown 内容协议 v1](markdown-v1.md)：三类记录、稳定身份、修订、可见性、附件、解析与迁移。
- [主人内容管理 API v1](content-management-v1.md)：上传、预览、版本发布、恢复、导出及受控别名解析。
- [API v1 契约](api-v1.md)：列表、详情、搜索、附件、同次解析产物、错误和兼容策略。
- [frontmatter JSON Schema](frontmatter-v1.schema.json)：供共享 TypeScript 契约和运行时校验参考，不能替代跨记录唯一性、附件存在性与正文安全检查。

可运行参考验证位于 `experiments/CONTENT-001/`。正式 `packages/contracts`、Nest 模块和 Next 适配由 ENGINE-001 建立；实验 Python 代码不是正式应用的第二套内容模块。

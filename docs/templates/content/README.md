# 个人记录模板

这些模板对应 [Markdown 内容协议 v1](../../architecture/contracts/markdown-v1.md)，用于站外整理，不会自动发布。模板统一从 `status: draft` 和 `visibility: private` 开始；公开需要同时显式改为 `published` 与 `public`，两者不能互相替代。

复制为独立记录目录下的 `index.md`，替换 ID、日期、标题和正文。ID 使用 `rec_` 加小写 UUID；附件使用 `ast_` 加小写 UUID。`occurredOn` 不知道时保留 `null`，不要补一个看似完整的日期。`oldSlugs` 只在改名后保留旧 slug，`revision` 在每次发布后修改时递增。

附件必须声明在 `attachments`，正文用记录目录内的相对路径引用。不要写绝对路径、`../`、原始 HTML、MDX 或危险链接。保留未知项，不编造用量、经历或已验证知识；生成示例不能冒充真实照片或个人实践。

模板和 README 不进入站点内容扫描。可参考 `experiments/CONTENT-001/fixtures/valid/`，并用以下命令检查实际内容根目录：

```bash
python3 experiments/CONTENT-001/validate_content.py <内容根目录>
```

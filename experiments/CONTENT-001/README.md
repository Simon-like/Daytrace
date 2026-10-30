# CONTENT-001 可运行内容协议参考

这是 CONTENT-001 的独立参考实现与合成 fixtures，不是正式 Nest 内容模块。权威规则见 `docs/architecture/contracts/`；正式 TypeScript 契约、API、鉴权与部署仍由后续任务实现。

## 环境与运行

本次实际使用 Python 3.12.16、PyYAML 6.0.3、markdown-it-py 4.2.0。依赖版本记录在 `requirements.txt`，不会修改根 pnpm 锁文件。所有命令从仓库根目录执行：

```bash
# 完整单元、CLI、迁移与负向样本测试
python3 -m unittest discover -s experiments/CONTENT-001/tests -v

# 三类正常记录：退出码 0，3 条记录均为公开已发布
python3 experiments/CONTENT-001/validate_content.py experiments/CONTENT-001/fixtures/valid

# 负例：退出码 1，输出结构化 file/field/code，不生成成功快照
python3 experiments/CONTENT-001/validate_content.py experiments/CONTENT-001/fixtures/missing-visibility
python3 experiments/CONTENT-001/validate_content.py experiments/CONTENT-001/fixtures/missing-attachment
python3 experiments/CONTENT-001/validate_content.py experiments/CONTENT-001/fixtures/duplicate-id
python3 experiments/CONTENT-001/validate_content.py experiments/CONTENT-001/fixtures/malicious
python3 experiments/CONTENT-001/validate_content.py experiments/CONTENT-001/fixtures/path-escape

# 单文件 v0 → v1；目标必须不存在，脚本拒绝覆盖
python3 experiments/CONTENT-001/migrate_v0.py \
  experiments/CONTENT-001/fixtures/migration/v0/index.md \
  experiments/CONTENT-001/tmp/migrated/index.md
```

如新环境缺少依赖，可在本实验目录自行创建隔离虚拟环境后安装 `requirements.txt`；本任务没有执行安装，也没有修改正式工程依赖。

## Fixtures

| 目录 | 覆盖内容 |
| --- | --- |
| `fixtures/valid/` | 技术、菜谱、随想三类；公开已发布、空发生日、附件、代码、目录和修订 |
| `fixtures/missing-visibility/` | 缺失可见性按 private 计算，同时整份快照失败 |
| `fixtures/missing-attachment/` | 缺失附件定位到声明字段与文件 |
| `fixtures/duplicate-id/` | 重复稳定 ID；测试另覆盖 slug、oldSlugs、跨记录资产 ID 冲突 |
| `fixtures/malicious/` | 原始 script HTML 与 javascript URL |
| `fixtures/path-escape/` | `../` 附件声明和正文引用；测试另覆盖绝对路径 |
| `fixtures/migration/` | 无 schemaVersion 的 v0 与显式 private 的期望 v1 |

所有文章和图片均为合成测试材料，不是用户经历、真实烹饪建议或可公开私密数据。

## 参考实现边界

- `load_collection()` 聚合校验错误；只有无错误集合才能生成公开投影。坏内容不会变成空成功响应。
- HTML 与目录由同一个 markdown-it token 流生成；原始 HTML 被拒绝，危险 URL 和未声明附件使记录无效。
- 附件路径先验证相对性、真实路径包含关系和普通文件，再映射为 `/api/v1/assets/<id>`。
- `contentRevision` 根据实验内容根目录中的相对路径和字节计算，用于证明源变化会改变快照版本。
- 本实验没有实现 HTTP 服务、数据库、真实会话、搜索索引、缓存、生产清洗器、完整 GFM 兼容矩阵或发布回滚；这些不能由单元测试推定完成。

> 文档已集中管理。原素材/实验目录：[experiments/CONTENT-001](../../../../experiments/CONTENT-001)。文中“本目录”和历史运行步骤以该原目录为准；验收状态保持原记录。

# CONTENT-001 交接

日期：2026-10-30。分支：`agent/CONTENT-001/kimi`。基线：`203d20409b7537c369e7404eaca6e705299b51d5`。

主体交付提交：`a13ebd08b943b6463cff27042dd6020a4b1785e0`（`feat: define portable content contracts`）。本交接单独提交；最终 HEAD 用 `git rev-parse HEAD` 获取。

## 交付

- `docs/architecture/contracts/markdown-v1.md`：三类 Markdown、稳定 ID、slug/旧链接、发生/更新时间、修订、状态与可见性、附件、同次解析、错误和迁移协议。
- `docs/architecture/contracts/api-v1.md`：`/api/v1` 列表、详情、搜索、附件、请求关联、稳定错误码、缓存边界和版本兼容策略。
- `docs/architecture/contracts/frontmatter-v1.schema.json`：机器可读 frontmatter 基线。
- `docs/templates/content/`：技术、菜谱、随想三份 v1 模板与使用说明。
- `experiments/CONTENT-001/`：参考校验器、同次 HTML+目录渲染、迁移脚本、正常/缺失/重复/恶意/路径逃逸/迁移合成样本和 17 项自动测试。

没有修改 board、任务卡、共享 README、`apps/`、`packages/`、根锁文件；没有读取或导入真实私密内容。

## 运行方式

从仓库根目录执行：

```bash
python3 -m unittest discover -s experiments/CONTENT-001/tests -v
python3 experiments/CONTENT-001/validate_content.py experiments/CONTENT-001/fixtures/valid
python3 experiments/CONTENT-001/validate_content.py experiments/CONTENT-001/fixtures/missing-visibility
python3 experiments/CONTENT-001/migrate_v0.py \
  experiments/CONTENT-001/fixtures/migration/v0/index.md \
  experiments/CONTENT-001/tmp/migrated/index.md
python3 experiments/CONTENT-001/validate_content.py experiments/CONTENT-001/tmp
```

迁移目标必须事先不存在；验证后可删除 `experiments/CONTENT-001/tmp`。校验器正常退出码为 0，内容错误为 1，命令用法错误为 2。实际环境为 Python 3.12.16、PyYAML 6.0.3、markdown-it-py 4.2.0；版本固定在实验 `requirements.txt`，未改正式依赖。

## 真实验证

以下均在本 worktree 实际执行：

- `python3 -m unittest discover -s experiments/CONTENT-001/tests -v`：17/17 通过。覆盖三类正常记录、HTML 与目录同一 token 流、附件 ID 映射、缺 visibility 安全失败、缺附件、重复 ID/slug/oldSlugs/资产 ID、原始 HTML、危险 URL、绝对路径与 `../`、公开投影条件、空发生日排序、坏集合不能成为空成功、内容修订变化、迁移、JSON Schema 与 CLI。
- 正常 CLI：`valid: true`，`recordCount: 3`，`publicRecordCount: 3`，无错误。
- `missing-visibility`、`missing-attachment`、`duplicate-id`、`malicious`、`path-escape` 五组 CLI：均按预期返回退出码 1。
- 实际 v0 → v1 迁移后再校验：`valid: true`，`recordCount: 1`，`publicRecordCount: 0`；旧 `life` 映射为 `recipe`，缺 visibility 显式补为 `private`。
- `python3 scripts/project_check.py`：通过，检查 106 份 Markdown、27 个目录条目、14 张任务卡，无错误。
- `python3 -m unittest discover -s tests/foundation -v`：既有协作基础测试 5/5 通过。
- 主体提交前 `git diff --cached --check`：通过；提交文件清单仅包含允许路径。

这些是作者自检和可复现参考验证，不是独立评审、正式站点验收或生产证明。

## 未验证

- 尚无 `packages/contracts` TypeScript 实现、前后端跨端兼容测试或正式运行时 schema。
- 尚无真实 Nest 列表/详情/搜索/附件 HTTP 服务、requestId 中间件、错误序列化、游标、搜索索引或 ETag 行为。
- 未验证真实主人会话、双身份权限、公共/私密缓存隔离、公开转私密后的旧 URL 失效；需 SECURITY/ACCESS/QA 负向证据。
- Python 参考渲染只证明契约关键路径，不是生产 Markdown 工具链冻结；完整 GFM 矩阵、生产清洗允许列表、代码高亮、超大文档和资源预算仍需 ENGINE/ARCH/READER 验证。
- 未执行真实私密资料迁移、真实内容发布、附件备份恢复、部署或回滚；合成样本不能冒充用户经历。
- 未做独立评审、iPhone 真机或正式 AC/NFR 验收。

## ENGINE-001 实现建议

1. 在 `packages/contracts` 建立无 Nest 装饰器、无 Node 文件读取的纯 TypeScript 类型和运行时 schema，复用本文字段、枚举、成功/错误包和稳定 code；用 fixtures 做 site/api 双向兼容测试。
2. 在 Nest 内容模块实现唯一 Markdown 读取、跨记录校验和快照构建。候选快照任一错误即整体失败并保留旧版本；运行快照损坏时返回 `CONTENT_SNAPSHOT_INVALID`，不得返回空列表。
3. 用一次 token 遍历同时生成清洗 HTML、目录和附件 URL，记录 `parseRevision`。不要在 Next 再解析正文或生成另一套目录；生产清洗器和允许列表须补安全负例。
4. 附件以快照内 `assetId → 父记录 → 受控相对路径` 索引解析，只接受 ID 路由。每次读取都检查父记录当前可见性，私密响应 `no-store`，不开放任意路径或代理目标。
5. 公开快照只含 `published + public`；owner scope 由 Nest 鉴权。访客对私密记录和附件使用与不存在相同的 404，公开搜索直接基于公开索引。
6. 将 `schemaVersion`、`parseRevision`、记录 `revision`、快照 `contentRevision` 分别纳入测试和发布清单；先扩展后收缩，不能以共享 TS 编译代替线上兼容验证。
7. 可参照 Python 迁移语义实现正式导入命令，但不要求把实验代码带入生产。真实迁移先在受保护副本执行并人工确认公开集合。

## 集成状态

主体交付已本地提交，交接为后续独立本地提交。未合并 main、未推送远端、未创建 PR、未部署；board 状态和 owner 未改，待中央协调者集成与独立评审。

# 可迁移 Markdown 内容协议 v1

状态：CONTENT-001 契约已由 ENGINE-001 实现，CONTENT-003 扩展服务端渲染与管理闭环。规则中的“必须”用于阻止不安全或不可迁移的内容进入可用快照。

## 1. 内容包与类型

每条记录是一个独立目录，目录名可以调整，正文固定为 `index.md`，附件只放在该目录内：

```text
<record>/
  index.md
  images/
    example.png
  files/
    notes.pdf
```

`index.md` 由 YAML frontmatter 和普通 Markdown 正文组成。v1 的 `type` 只有三类：

| type | 产品含义 | 正文组织 |
| --- | --- | --- |
| `engineering` | 技术实践 | 背景、排查、验证、未验证、后续补充，按实际内容取舍 |
| `recipe` | 生活经验／菜谱 | 材料、实际工序、效果、下次调整；缺失信息不编造 |
| `reflection` | 随想认知 | 一句话也可独立存在；后续补充保留日期 |

类型改变不分配新 ID。模板只是写作起点，不要求保留空标题或空槽。

## 2. Frontmatter 字段

机器可读字段见 [frontmatter-v1.schema.json](frontmatter-v1.schema.json)。跨记录和文件系统规则还必须由内容校验器执行。

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `schemaVersion` | 是 | 当前只能为整数 `1`；其他版本报 `CONTENT_SCHEMA_UNSUPPORTED`，不得猜测解析 |
| `id` | 是 | `rec_` 加小写 UUID；创建后不复用、不随标题或目录改变 |
| `type` | 是 | 上表三类之一 |
| `title` | 是 | 1–120 字 NFC 纯文本，不含控制字符或页面组件 |
| `slug` | 是 | 1–80 位小写 ASCII 字母、数字和单个连字符；全库唯一 |
| `oldSlugs` | 否 | 默认 `[]`；保存改名前公开使用过的 slug，最多 16 个 |
| `occurredOn` | 是 | `YYYY-MM-DD` 或 `null`；不知道确切发生日就用 `null`，不伪造 |
| `updatedAt` | 是 | 带时区的 RFC 3339 时间；项目展示默认转换到 Asia/Shanghai |
| `revision` | 是 | 从 1 开始的整数；正文、元数据或附件声明每次发布后变更都递增 |
| `tags` | 否 | 默认 `[]`；最多 16 个，每个 1–32 字，忽略大小写后不得重复 |
| `summary` | 否 | 默认 `null`；最多 280 字；公开摘要只能来自已授权的公开记录 |
| `status` | 是 | `draft` / `published` / `archived` |
| `visibility` | 是 | `public` / `private`；与 `status` 完全独立 |
| `attachments` | 否 | 默认 `[]`；每项只能含 `id`、`path`、`mediaType`、`title`、`width`、`height` |

未列字段必须报 `CONTENT_FIELD_INVALID`，避免把拼错的 `visiblity` 当成安全默认值。缺失 `visibility` 时，任何内部投影都必须按 `private` 处理，同时报 `CONTENT_VISIBILITY_MISSING` 并使候选快照失败；“默认不公开”不是“跳过错误后照常发布”。

附件项规则：

- `id` 为 `ast_` 加小写 UUID，在所属快照内唯一，不随文件改名改变。
- `path` 是相对于当前记录目录的 UTF-8 相对路径，如 `images/example.png`。禁止绝对路径、盘符、反斜杠、空段、`.`、`..`、NUL 和符号链接；解析后的真实路径仍必须位于记录目录。
- `mediaType` v1 只允许 `image/png`、`image/jpeg`、`image/webp`、`image/gif`、`application/pdf`、`text/plain`。SVG、HTML 和其他主动内容不在内联允许列表。
- `title` 可选；图片 `width`、`height` 可选但必须为正整数，用于保留布局尺寸。
- 声明文件必须存在且为普通文件；同一记录内附件 ID 和路径均不得重复。

## 3. 稳定链接、修订和排序

 canonical 网页路径为 `/records/<id>/`。标题、slug、类型或目录变化不改变 canonical 路径。

slug 和 `oldSlugs` 构成一个全库共享命名空间，任何两项都不能冲突，包括同一记录内。旧 slug 的网页解析只对当前调用方可见的记录生效：访客得到 308 跳转到公开 canonical；私密、草稿和已归档记录不能通过旧链接向访客泄露标题或存在性。删除记录后不把它曾经的 slug 分配给另一条记录；若确需复用，必须先评审旧链接语义。

`revision` 是单条记录的作者可见修订号，不等同于快照 `contentRevision`。后者由发布器对经过校验的 Markdown 与附件字节确定性计算；任一源字节变化都应得到新值。列表和详情同时携带 `contentRevision`，派生索引、HTML、缓存和发布清单必须指向同一快照。

公开默认排序为 `occurredOn` 降序，`null` 置后；同日按 `updatedAt` 降序，再以 `id` 作为稳定次序。不能使用文件系统遍历顺序作为接口顺序。

## 4. 状态不等于可见性

只有同时满足 `status: published` 与 `visibility: public` 的记录才进入公开列表、公开详情、公开搜索、公开索引、sitemap 和分享数据。

| status | visibility | 访客 | 经授权主人 |
| --- | --- | --- | --- |
| `draft` | `public` | 不可见；显式公开声明不会自动发布草稿 | 可在主人范围预览 |
| `draft` | `private` | 不可见 | 可在主人范围预览 |
| `published` | `private` | 不可见 | 可读正文和附件 |
| `published` | `public` | 可读 | 可读 |
| `archived` | 任意 | 默认不可见 | 主人范围可读 |

候选内容只要有解析错误、字段错误、重复 ID/slug、缺附件或越界引用，整份候选快照就失败，保留上一可用快照。不得删掉坏记录后返回“空列表”，也不得把错误数据混入公开索引后靠前端过滤。公开转私密还必须清除旧公开索引与缓存，具体演练由发布和访问任务执行。

## 5. Markdown、HTML 与目录

v1 支持 CommonMark 与明确的 GFM 表格、任务列表、删除线、围栏代码。不执行 MDX、脚本、嵌入组件；CONTENT-003 已启用脚注与公式；Mermaid、双链方言仍不默认启用。正文 H1 不使用，文章标题只来自 frontmatter；标题从 H2 开始。

原始 HTML 在 v1 中不是“信任主人所以保留”，而是 `CONTENT_RAW_HTML_UNSUPPORTED` 校验错误。代码围栏和行内代码中的 HTML 字符串仍是可读文本。生产解析器必须关闭或拒绝原始 HTML，并在输出端使用固定元素／属性允许列表作为第二道防线。

普通外链只允许 `http`、`https`、`mailto` 和页内锚点；站内记录链接只允许 `/records/<id>/`。禁止 `javascript:`、`data:`、协议相对 URL 和其他站点绝对路径。正文图片不得直接引用第三方 URL。

HTML 与目录必须来自**同一次 Markdown token 解析**：遍历该 token 流时同时写入标题 ID、生成目录并渲染 HTML，不能分别调用两次解析器后拼接可能不同的结果。旧解析器的回退标题 ID 为 `section-1`、`section-2` 等文档顺序编号，目录项为 `{id,text,level}`；同一 `contentRevision` 内稳定。调整标题顺序可能改变回退 ID，因此需要长期外部引用的标题应在后续协议增加显式 ID 扩展，而不是由前端自行猜测 slug。

当前正式解析器为 unified/remark/rehype，语义标题 ID 使用 `dt-` 前缀、中文规范化和冲突去重，同时输出旧 `section-N` 锚点作为兼容入口。标题重命名或前置同名标题仍可能改变小节地址；顺序锚点也未引入持久段落映射，不能当永久 block ID。

响应中的 `parseRevision` 当前固定为 `daytrace-markdown-3`。服务端支持脚注、KaTeX 与有限语言 Shiki 高亮，浏览器只消费产物。渲染配置版本参与完整/公开 contentRevision 哈希。解析规则、清洗允许列表或高亮行为变化时递增，并按内容快照重建，不能在同一 `contentRevision` 下静默混用两套 HTML。

v2 在服务端同一 token 渲染阶段直接输出受控的阅读语义：代码块包含语言、复制按钮、可聚焦滚动区和溢出提示；表格包含局部滚动容器；图片包含灯箱按钮、尺寸、异步解码、错误状态容器，Markdown 图片 title 同时作为可见 `figcaption`，alt 保持为替代文本。第一张内容图使用 eager，其余使用 lazy。浏览器只绑定复制、溢出观察、图片错误和灯箱，不得在 hydration 后搬动或重新包装正文 DOM。新增元素、类名及 data／ARIA 属性仍由固定 sanitizer 白名单约束。

## 6. 正文附件引用

正文使用可迁移的相对路径，渲染时再映射到稳定资产 ID：

```markdown
![本次成品][example-image]
[核对清单][checklist]

[example-image]: images/example.png
[checklist]: files/checklist.pdf
```

引用的路径解码并去掉可选 `./` 后，必须精确等于本条记录 `attachments[].path`，否则报 `CONTENT_ATTACHMENT_UNDECLARED`。HTML 中输出 `/api/v1/assets/<assetId>`，绝不输出源磁盘路径。附件 API 不接受 `path`、`file`、绝对路径或任意代理目标；详细响应与缓存规则见 [API v1](api-v1.md)。

## 7. 校验错误与失败边界

参考实现输出的每项错误包含 `code`、`message`、`file` 和可选 `field`。以下是内容构建错误码，不与运行时 HTTP 错误码混用：

| code | 含义 |
| --- | --- |
| `CONTENT_FRONTMATTER_MISSING` / `CONTENT_FRONTMATTER_INVALID` | frontmatter 缺失或 YAML 无效 |
| `CONTENT_FIELD_REQUIRED` / `CONTENT_FIELD_INVALID` | 必填字段缺失或字段值不合法 |
| `CONTENT_VISIBILITY_MISSING` | 可见性缺失；有效值按 private，但快照失败 |
| `CONTENT_SCHEMA_UNSUPPORTED` | 未支持的协议版本 |
| `CONTENT_DUPLICATE_ID` / `CONTENT_DUPLICATE_SLUG` / `CONTENT_DUPLICATE_ASSET_ID` | 稳定 ID、路由命名或跨记录资产 ID 冲突 |
| `CONTENT_ATTACHMENT_PATH_INVALID` | 绝对路径、路径逃逸、符号链接等 |
| `CONTENT_ATTACHMENT_MISSING` | 声明附件不存在或不是普通文件 |
| `CONTENT_ATTACHMENT_UNDECLARED` | 正文引用未声明的附件 |
| `CONTENT_URL_UNSAFE` | 危险或不在允许范围的链接 |
| `CONTENT_RAW_HTML_UNSUPPORTED` | 使用原始 HTML |
| `CONTENT_HEADING_INVALID` | 正文使用保留的 H1 |

校验器可以一次收集多个错误，但不能输出部分成功的公开快照。空目录可以是合法的空集合；“存在坏记录却被忽略”不是空集合。

## 8. v0 → v1 迁移

迁移必须显式执行并复核，不自动把旧内容公开：

1. 保留原 `id`、`title`、正文、`updatedAt`；旧 `date` 映射到 `occurredOn`，没有则为 `null`。
2. 要求旧记录已有稳定 `slug`；没有则人工指定，不能从标题批量猜测后宣称旧链接已保留。
3. 旧 `type: life` 映射为 `recipe`；补充 `schemaVersion: 1`、`oldSlugs: []`、`revision: 1`、`summary: null`、`attachments: []`。
4. 旧记录缺少 `visibility` 时明确写入 `private`，即使 `status` 已是 `published`。公开必须是后续人工选择。
5. 对迁移结果重新执行全量校验和公开／私密快照对照，不能仅比较 YAML 文本。

`experiments/CONTENT-001/migrate_v0.py` 和 `fixtures/migration/` 提供可运行参考。该脚本拒绝覆盖目标文件，不会自动迁移真实私密目录。

# Daytrace API v1 契约

状态：契约已在正式 Nest 服务落地，本文固定当前接口形状和失败语义；CONTENT-001 是契约来源，不再代表待实现状态。认证与会话细节遵循 SECURITY-001，实际部署与验收状态看[项目进度](../../project/项目进度.md)。

## 1. 通用约定

- 基础路径为同域 `/api/v1`，JSON 使用 UTF-8 和 `application/json`。
- 所有成功和错误 JSON 都有字符串 `schemaVersion: "1.0"`。URL 的 `v1` 是主版本，响应版本的小版本用于向后兼容扩展。
- 每个 JSON 响应的 `meta.requestId` 与 `X-Request-Id` 响应头一致。服务端默认生成 UUID；只有符合 `[A-Za-z0-9._-]{8,128}` 的关联 ID 才可接收，否则更换，不能回显任意输入。
- 成功内容响应的 `meta.contentRevision` 标识当前完整内容快照。记录详情的 ETag 至少包含记录 ID 与 `revision`；列表、搜索和缓存键还包含 `contentRevision` 与全部过滤条件。
- 公开响应只从公开快照产生，不根据 Cookie 拼入主人内容。`scope=owner`、私密附件和认证错误使用 `Cache-Control: no-store`，不得进入公共 CDN、Next 公开缓存或共享静态生成。
- 错误不返回堆栈、源文件绝对路径、正文、搜索原词、Cookie、Token 或私密记录标题。`details` 只允许脱敏字段名、参数名和可定位的公开校验项。

成功包：

```json
{
  "schemaVersion": "1.0",
  "data": {},
  "meta": {
    "requestId": "4f2b2f4d-e27c-4f08-9f38-e0f4d3cf0c4a",
    "contentRevision": "sha256:3d3f…"
  }
}
```

错误包：

```json
{
  "schemaVersion": "1.0",
  "error": {
    "code": "RECORD_NOT_FOUND",
    "message": "记录不存在或当前不可见",
    "requestId": "4f2b2f4d-e27c-4f08-9f38-e0f4d3cf0c4a",
    "details": []
  }
}
```

## 2. 记录字段

`RecordSummary`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 稳定 `rec_…` ID |
| `type` | string | `engineering` / `recipe` / `reflection` |
| `title` | string | 纯文本标题 |
| `slug` | string | 当前 slug |
| `oldSlugs` | string[] | 旧链接标识；仅返回当前调用方可见记录的数组 |
| `occurredOn` | string \| null | 发生日期 |
| `updatedAt` | string | 带时区时间 |
| `revision` | integer | 单条记录修订 |
| `tags` | string[] | 标签 |
| `summary` | string \| null | 显式摘要，不从其他可见性记录拼接 |
| `status` | string | 公开响应只能为 `published` |
| `visibility` | string | 公开响应只能为 `public` |

`RecordDetail` 在 summary 基础上增加：

```json
{
  "body": {
    "html": "<h2 id=\"section-1\">…</h2>",
    "toc": [{"id": "section-1", "text": "…", "level": 2}],
    "parseRevision": "daytrace-markdown-3"
  },
  "attachments": [
    {
      "id": "ast_7d0c0f2d-8f5b-4f0e-a3a6-444444444444",
      "mediaType": "image/png",
      "title": "合成测试图",
      "width": 1,
      "height": 1,
      "url": "/api/v1/assets/ast_7d0c0f2d-8f5b-4f0e-a3a6-444444444444"
    }
  ]
}
```

附件响应元数据没有源 `path`。`body.html` 与 `body.toc` 必须来自同一次 token 解析，`parseRevision` 与当前快照的解析规则一致；前端不得下载原始 Markdown 再自行生成另一份目录。搜索摘要和高亮片段是纯文本，不接收可注入 HTML。

## 3. 列表

`GET /records`

| 参数 | 规则 |
| --- | --- |
| `scope` | 默认 `public`；`owner` 需要主人会话 |
| `type` | 可选，三类之一 |
| `tag` | 可选，可重复；重复参数为 AND，单记录必须具有全部标签 |
| `status` | 仅 owner 可选：`draft` / `published` / `archived`；owner 默认全部 |
| `visibility` | 仅 owner 可选：`public` / `private` |
| `limit` | 默认 20，范围 1–50 |
| `cursor` | 可选，上一响应返回的不透明游标；不得自行拼接或解码 |

公开范围固定只含 `published + public`。公开请求携带 owner 专用过滤参数返回 `INVALID_QUERY`，不能静默忽略。owner 范围表示当前主人可见集合，不是“绕过状态与可见性校验”。

排序和 `occurredOn: null` 规则遵循 Markdown 协议。游标必须绑定排序、过滤、scope 和 `contentRevision`；无法解码、被篡改或对应快照已替换时返回 `INVALID_CURSOR`，调用方从第一页重新请求。

`data`：

```json
{
  "items": [{"id": "rec_…", "type": "reflection", "title": "…", "slug": "…", "oldSlugs": [], "occurredOn": null, "updatedAt": "2026-10-30T08:00:00+08:00", "revision": 1, "tags": [], "summary": null, "status": "published", "visibility": "public"}],
  "pageInfo": {"hasMore": false, "nextCursor": null}
}
```

真正无结果时 `items: []` 且 HTTP 200。内容快照损坏、校验失败或不可读取时必须返回 `CONTENT_SNAPSHOT_INVALID` / `CONTENT_SNAPSHOT_UNAVAILABLE`，绝不能以空数组代替错误。

### 公开标签

`GET /records/tags` 返回 `data: { "tags": ["标签"] }`，标签从当前 published + public 快照汇总、去重并排序，不受 Cookie 或主人身份影响；空集合为 `[]`。`meta.contentRevision` 使用公开快照修订，快照不可用时返回错误而非空集合。

## 4. 详情与旧链接

`GET /records/{recordId}?scope=public|owner`

- `recordId` 必须是完整稳定 ID；非法形式返回 `INVALID_RECORD_ID`，不能把它当磁盘路径或数据库任意查询。
- 公开范围只返回 `published + public`。其他状态或不可见记录统一返回 `RECORD_NOT_FOUND`，不向访客区分“没有”与“私密”。
- owner 范围必须验证主人会话，可以读取主人的 draft、private、archived；整个响应 `no-store`。
- 详情中的附件 URL 仍须逐个执行相同可见性授权，不能因知道资产 ID 就绕过。

slug 与旧链接属于网页路由层：公开 `/records/<slug>/` 可解析到公开记录并以 308 跳转到 `/records/<id>/`。若 slug 与 ID 形式冲突，始终以完整 ID 的 canonical 规则为准；路由冲突在快照校验阶段已经禁止。访客对私密旧 slug 的响应不得包含目标 ID 或标题。CONTENT-003 新增受相同公开投影约束的 `/records/resolve/:alias` 直达查询，不再逐页扫描列表；私密旧别名仍不可解析。详见[管理 API 扩展](content-management-v1.md)。

## 5. 搜索

`GET /search`

| 参数 | 规则 |
| --- | --- |
| `q` | 必填，去除首尾空白后 1–100 字；执行文字匹配，不承诺语义搜索 |
| `scope` | 默认 `public`；`owner` 必须授权 |
| `type` / `tag` / `status` / `visibility` | 与列表一致 |
| `limit` / `cursor` | 与列表一致；游标还绑定查询哈希，不保存原始私密查询词 |

`data.items[]` 为：

```json
{
  "record": {"id": "rec_…", "type": "engineering", "title": "…", "slug": "…", "oldSlugs": [], "occurredOn": "2026-10-28", "updatedAt": "2026-10-29T09:30:00+08:00", "revision": 2, "tags": ["微前端"], "summary": "…", "status": "published", "visibility": "public"},
  "matches": [{"field": "body", "text": "包含命中词的纯文本片段", "ranges": [{"start": 2, "length": 3}]}]
}
```

`ranges` 是 `text` 的 Unicode 码点区间，前端用文本节点高亮，不把片段作为 HTML 注入。标题命中优先于标签，标签优先于正文，其后按记录默认排序；同分时以 ID 稳定排序。公开搜索直接查询公开派生索引，不能先搜索全量再过滤私密命中。

无命中返回 200 和空 `items`。索引不可用、快照不匹配或查询执行失败分别返回 `SEARCH_UNAVAILABLE` 或 `CONTENT_SNAPSHOT_INVALID`，不得伪装无结果。日志不记录原始 `q`；游标必须带完整性保护且不可反推出私密查询内容。

## 6. 附件

`GET /assets/{assetId}`

- 只接受完整 `ast_…` ID，按当前快照查找附件及其父记录。没有 `path`、`file`、URL 或文件系统位置参数。
- 匿名只能取得属于 `published + public` 记录的附件；其他情况统一 `ASSET_NOT_FOUND`。主人会话可取得主人可见记录的附件，响应 `no-store`。
- 内容类型只能来自 v1 允许列表并加 `X-Content-Type-Options: nosniff`。图片可 `Content-Disposition: inline`；PDF 与纯文本默认 `attachment`。不得把 SVG、HTML 或脚本作为内联正文资源。
- 返回正确的 `Content-Length`、附件校验和／记录修订派生的 ETag。v1 不要求 Range；若后续增加必须单独测试鉴权与缓存。
- 父记录公开转私密、归档、删除或附件撤销后，同一旧 URL 必须立即失去公开访问能力，并清理旧公共缓存。不能只从正文移除图片标签而保留公开资产旁路。

## 7. 稳定运行时错误码

| HTTP | code | 使用场景 |
| --- | --- | --- |
| 400 | `INVALID_QUERY` | 参数类型、范围或 scope 组合不合法 |
| 400 | `INVALID_CURSOR` | 游标无效、过期、被篡改或与查询不匹配 |
| 400 | `INVALID_RECORD_ID` / `INVALID_ASSET_ID` | 路径标识形式不合法 |
| 401 | `AUTH_REQUIRED` | owner scope 没有有效会话 |
| 403 | `OWNER_REQUIRED` | 已认证身份不是主人；响应不包含记录信息 |
| 404 | `RECORD_NOT_FOUND` | 记录不存在或当前调用方不可见 |
| 404 | `ASSET_NOT_FOUND` | 资产不存在、已撤销或当前调用方不可见 |
| 409 | `CONTENT_REVISION_CONFLICT` | 后续维护操作要求的内容修订已变化；v1 只读接口不使用 |
| 503 | `CONTENT_SNAPSHOT_INVALID` | 当前快照未通过协议校验；不能用部分内容或空列表代替 |
| 503 | `CONTENT_SNAPSHOT_UNAVAILABLE` | 快照存储暂时不可读 |
| 503 | `SEARCH_UNAVAILABLE` | 搜索索引不可用或暂时失败 |
| 500 | `INTERNAL_ERROR` | 未分类服务端失败；只记录脱敏内部诊断 |

生产发布应保持旧快照可用，因此 `CONTENT_SNAPSHOT_INVALID` 主要表示运行数据破坏或部署错误，不应成为正常坏内容导入后的公开状态。稳定 code 供程序判断，message 可改进但不承载机器分支。

## 8. schemaVersion 与兼容策略

1. **向后兼容的小版本**：新增可选请求参数、可选响应字段、新的错误 `details` 项，可将响应 `schemaVersion` 从 `1.0` 提到 `1.1`。旧客户端必须忽略未知响应字段；服务端不得要求旧客户端理解新字段才能读取旧字段。
2. **主版本变更**：删除或重命名字段、把可选改必填、改变字段语义／可见性规则、改变默认排序或错误处理契约，需要 `/api/v2` 和新的响应主版本，不能只在 `1.x` 静默改变。
3. **先扩展后收缩**：先发布能同时理解新旧调用方的 API，再迁移 site，最后在确认没有旧调用方后移除兼容字段。生产初期按兼容的一对 site/api 镜像发布，并记录契约版本。
4. **内容协议独立演进**：Markdown `schemaVersion` 是整数，API `schemaVersion` 是 `major.minor`，`parseRevision` 是解析规则版本，`contentRevision` 是数据快照版本；四者不能互相替代。
5. **不支持即明确失败**：未知内容主版本报 `CONTENT_SCHEMA_UNSUPPORTED`；不支持的 API 主版本由路由返回明确 404/升级错误，不能按 v1 猜测处理。
6. **退役通知**：兼容端点计划移除时，先在响应和发布记录中提供 `Deprecation`、`Sunset` 与迁移文档，完成调用方迁移和跨端测试后再下线。

共享 TypeScript 类型、运行时 schema、请求／响应 fixtures 和跨端兼容测试由 ENGINE-001 在 `packages/contracts` 实现；不能仅靠 TypeScript 编译证明线上兼容。

# 主人内容管理 API v1

日期：2026-11-03。CONTENT-003 实现。基于现有 `/api/v1`，新增能力只在 AuthModule 已配置时注册。管理请求均须主人会话，响应与错误 no-store；POST 还要求可信 Origin 与有效 x-csrf-token，复用现有守卫。公开接口不携带管理源路径。

| 方法和路径 | 输入 | 结果 |
| --- | --- | --- |
| GET `/owner/content` | 会话 | `{items: RecordSummary[], contentRevision}`，包含主人可见全量记录 |
| POST `/owner/imports` | multipart `files[]`（字段名 files）、`paths` JSON 路径数组；可选 type、updateId、expectedRevision | 201：`{id,baseRevision,createdAt,records,previousRecords}`；records 为私密草稿 RecordDetail，previousRecords 为待更新记录当前详情 |
| GET `/owner/imports/:batch` | 会话 | 恢复同一预览；不会发布 |
| GET `/owner/imports/:batch/assets/:asset` | 会话 | 批次文章声明的受控附件，不接收磁盘路径 |
| POST `/owner/imports/:batch/discard` | 空 JSON | 丢弃本次预览，原文章不变 |
| POST `/owner/imports/:batch/commit` | `{baseRevision,status,visibility}` | 校验整批后原子发布；`{committed,items,contentRevision}`；同批重试返回已保存结果 |
| POST `/owner/content/:id` | `{baseRevision,status,visibility,title?,slug?,tags?}` | 修改元数据/公开范围，生成新 revision；返回内容库 |
| POST `/owner/content/:id` | `{baseRevision,snapshot}` | 恢复历史正文、标题和标签等源字段，保留当前 status/visibility，生成新修订；返回内容库 |
| GET `/owner/content/:id/history` | 会话 | `[{snapshot,createdAt,action,record,...}]`，仅经内容库保存过的历史 |
| GET `/owner/content/:id/export` | 会话 | application/zip，标准 MD/YAML 与附件，下载名使用稳定记录 ID |

本扩展管理 JSON 是表内顶层对象，不使用公开读取接口的 data/meta envelope；错误仍使用现有 ApiErrorResponse envelope。preview 的 HTML 附件地址为 `/api/v1/owner/imports/<batch>/assets/<asset>`；正式详情保留 `/api/v1/assets/<asset>`。客户端只将服务端校验过的 HTML 交给阅读组件，不自行解析上传文本。

新增稳定错误码 `CONTENT_IMPORT_INVALID`（422）表示路径、格式、正文或文档头校验失败；`details` 含文件、字段和原因，正文错误行号相对规范化正文。`CONTENT_REVISION_CONFLICT`（409）表示已有版本或候选基线变化。会话缺失 401，CSRF/来源不符 403。错误不返回堆栈、凭据或绝对磁盘路径；文件名和私密记录定位仅在鉴权后的管理请求中返回。

导入默认覆盖外来 status/visibility 为 draft/private；metadata schema 版本不因此升级。标准包必须遵守 [Markdown v1](markdown-v1.md)，普通 MD 则先补齐必填字段再全量校验。草稿/归档保存只接受 private。批次基线按完整 ownerContentRevision 比较，即使其他文章变了也要求重新预览；本版选择整批保守冲突，不自动合并正文。

上传限制与存储维护见[内容库手册](../../development/content.md)。API multipart 入口要求有效 Content-Length，服务端预检不超过 33 MiB（含 multipart 开销）；实际文件合计仍为 32 MiB。Next 代理对无长度的浏览器请求也限流读取并为上游生成准确长度，不把二进制附件转成文本。

## 公开别名解析补充

GET `/records/resolve/:alias` 是受公开投影约束的直达查询，返回标准 `ApiSuccess<RecordSummary>`；只解析当前已发布公开记录的 slug/oldSlugs，其他情况统一 404。Next/H5 使用服务端快照内存索引解析，避免逐页列举文章。它不接受 owner scope、不授予主人读取，也不能解析私密别名。网页旧地址跳向 `/records/<id>/`，H5 内保留 `/h5/records/<id>/`；公开 canonical 统一为主站稳定 ID 地址。

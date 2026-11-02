> 2026-11-02更新：已集成搜索、主人与附件边界，完整Demo见[运行手册](demo.md)与[验收报告](../project/reports/DEMO-001.md)。以下ENGINE记录保留工程基础背景；当前以源码与Demo报告为准，不能将旧“尚未接线”当作当前状态。

# @daytrace/api

NestJS 12 内容 API。唯一内容读取与公开投影边界位于 `src/modules/content`；共享响应契约来自 `@daytrace/contracts`，不包含第二套前端解析或权限逻辑。

默认 `API_HOST=127.0.0.1`、`API_PORT=3001`，内容根为 `apps/api/fixtures/content`。`CONTENT_ROOT` 必须指向授权的合成内容目录，其中 `public/` 与 `private/` 都参与全量校验；只有 `status: published` 且 `visibility: public` 的记录进入公开快照。

- `GET /api/v1/records`
- `GET /api/v1/records/:recordId`
- `GET /api/v1/assets/:assetId`
- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`

缺 visibility、重复 ID/slug/asset ID、坏日期、缺附件、危险正文等使整个候选快照失败。API 返回稳定错误码、requestId 和相对内容定位，不返回堆栈或绝对路径，也不把失败伪装成空列表。

本任务不实现登录、主人会话或私密读取；这些由 ACCESS 后续接入。

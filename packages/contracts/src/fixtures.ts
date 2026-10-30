import {
  API_SCHEMA_VERSION,
  MARKDOWN_PARSE_REVISION,
  type ApiErrorResponse,
  type RecordDetailResponse,
  type RecordListResponse,
} from "./index";

export const SYNTHETIC_RECORD_ID = "rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111";
export const SYNTHETIC_ASSET_ID = "ast_7d0c0f2d-8f5b-4f0e-a3a6-444444444444";
export const SYNTHETIC_CONTENT_REVISION = `sha256:${"a".repeat(64)}`;

export function syntheticRecordDetailResponse(): RecordDetailResponse {
  return {
    schemaVersion: API_SCHEMA_VERSION,
    data: {
      id: SYNTHETIC_RECORD_ID,
      type: "engineering",
      title: "合成契约记录",
      slug: "synthetic-contract-record",
      oldSlugs: ["old-contract-record"],
      occurredOn: "2026-10-30",
      updatedAt: "2026-10-30T08:00:00+08:00",
      revision: 1,
      tags: ["契约"],
      summary: "仅用于共享契约测试。",
      status: "published",
      visibility: "public",
      body: {
        html: "<h2 id=\"section-1\">验证</h2><p>完整正文</p>",
        toc: [{ id: "section-1", text: "验证", level: 2 }],
        parseRevision: MARKDOWN_PARSE_REVISION,
      },
      attachments: [{
        id: SYNTHETIC_ASSET_ID,
        mediaType: "image/png",
        title: "合成附件",
        width: 1,
        height: 1,
        url: `/api/v1/assets/${SYNTHETIC_ASSET_ID}`,
      }],
    },
    meta: {
      requestId: "4f2b2f4d-e27c-4f08-9f38-e0f4d3cf0c4a",
      contentRevision: SYNTHETIC_CONTENT_REVISION,
    },
  };
}

export function syntheticRecordListResponse(): RecordListResponse {
  const detail = syntheticRecordDetailResponse();
  const { body: _body, attachments: _attachments, ...summary } = detail.data;
  return {
    schemaVersion: API_SCHEMA_VERSION,
    data: { items: [summary], pageInfo: { hasMore: false, nextCursor: null } },
    meta: detail.meta,
  };
}

export function syntheticErrorResponse(): ApiErrorResponse {
  return {
    schemaVersion: API_SCHEMA_VERSION,
    error: {
      code: "CONTENT_SNAPSHOT_INVALID",
      message: "公开内容快照未通过校验",
      requestId: "4f2b2f4d-e27c-4f08-9f38-e0f4d3cf0c4a",
      details: [{
        code: "CONTENT_VISIBILITY_MISSING",
        message: "visibility 缺失",
        file: "public/broken/index.md",
        field: "visibility",
      }],
    },
  };
}

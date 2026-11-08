export const API_SCHEMA_VERSION = "1.0" as const;
export const MARKDOWN_PARSE_REVISION = "daytrace-markdown-3" as const;
export const RECORD_ID_PATTERN = /^rec_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const ASSET_ID_PATTERN = /^ast_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const CONTENT_REVISION_PATTERN = /^sha256:[0-9a-f]{64}$/;

export type RecordType = "engineering" | "recipe" | "reflection";
export type RecordStatus = "draft" | "published" | "archived";
export type Visibility = "public" | "private";

export interface TocItem {
  readonly id: string;
  readonly text: string;
  readonly level: number;
}

export interface RecordAttachment {
  readonly id: string;
  readonly mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "application/pdf" | "text/plain";
  readonly title?: string;
  readonly width?: number;
  readonly height?: number;
  readonly url: string;
}

export interface RecordSummary {
  readonly id: string;
  readonly type: RecordType;
  readonly title: string;
  readonly slug: string;
  readonly oldSlugs: readonly string[];
  readonly occurredOn: string | null;
  readonly updatedAt: string;
  readonly revision: number;
  readonly tags: readonly string[];
  readonly summary: string | null;
  readonly status: RecordStatus;
  readonly visibility: Visibility;
}

export interface RecordDetail extends RecordSummary {
  readonly body: {
    readonly html: string;
    readonly toc: readonly TocItem[];
    readonly parseRevision: typeof MARKDOWN_PARSE_REVISION;
  };
  readonly attachments: readonly RecordAttachment[];
  readonly relatedRecords: readonly RecordSummary[];
}

export interface ResponseMeta {
  readonly requestId: string;
  readonly contentRevision: string;
}

export interface ApiSuccess<T> {
  readonly schemaVersion: typeof API_SCHEMA_VERSION;
  readonly data: T;
  readonly meta: ResponseMeta;
}

export interface RecordListData {
  readonly items: readonly RecordSummary[];
  readonly pageInfo: {
    readonly hasMore: boolean;
    readonly nextCursor: string | null;
  };
}

export type RecordListResponse = ApiSuccess<RecordListData>;
export type RecordDetailResponse = ApiSuccess<RecordDetail>;

export type ApiErrorCode =
  | "INVALID_QUERY"
  | "INVALID_CURSOR"
  | "INVALID_RECORD_ID"
  | "INVALID_ASSET_ID"
  | "AUTH_REQUIRED"
  | "OWNER_REQUIRED"
  | "RECORD_NOT_FOUND"
  | "ASSET_NOT_FOUND"
  | "IMPORT_NOT_FOUND"
  | "CONTENT_IMPORT_INVALID"
  | "CONTENT_REVISION_CONFLICT"
  | "CONTENT_SNAPSHOT_INVALID"
  | "CONTENT_SNAPSHOT_UNAVAILABLE"
  | "SEARCH_UNAVAILABLE"
  | "CSRF_REJECTED"
  | "LOGIN_FAILED"
  | "INTERNAL_ERROR";

export interface ApiErrorDetail {
  readonly code?: string;
  readonly message?: string;
  readonly file?: string;
  readonly field?: string;
  readonly parameter?: string;
}

export interface ApiErrorResponse {
  readonly schemaVersion: typeof API_SCHEMA_VERSION;
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly requestId: string;
    readonly details: readonly ApiErrorDetail[];
  };
}

const ERROR_CODES: readonly ApiErrorCode[] = [
  "INVALID_QUERY", "INVALID_CURSOR", "INVALID_RECORD_ID", "INVALID_ASSET_ID",
  "AUTH_REQUIRED", "OWNER_REQUIRED", "RECORD_NOT_FOUND", "ASSET_NOT_FOUND",
  "IMPORT_NOT_FOUND", "CONTENT_IMPORT_INVALID", "CONTENT_REVISION_CONFLICT", "CONTENT_SNAPSHOT_INVALID", "CONTENT_SNAPSHOT_UNAVAILABLE",
  "SEARCH_UNAVAILABLE", "CSRF_REJECTED", "LOGIN_FAILED", "INTERNAL_ERROR",
];
const RECORD_TYPES: readonly RecordType[] = ["engineering", "recipe", "reflection"];
const MEDIA_TYPES: readonly RecordAttachment["mediaType"][] = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain",
];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label}_INVALID`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label}_INVALID`);
  }
  return value;
}

function strings(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${label}_INVALID`);
  return value.map((item) => string(item, label));
}

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label}_INVALID`);
  }
  return value;
}

function parseMeta(value: unknown): ResponseMeta {
  const meta = object(value, "META");
  const requestId = string(meta.requestId, "REQUEST_ID");
  const contentRevision = string(meta.contentRevision, "CONTENT_REVISION");
  if (requestId.length > 128 || !CONTENT_REVISION_PATTERN.test(contentRevision)) {
    throw new Error("META_INVALID");
  }
  return { requestId, contentRevision };
}

function success(value: unknown): Record<string, unknown> {
  const envelope = object(value, "RESPONSE");
  if (envelope.schemaVersion !== API_SCHEMA_VERSION) throw new Error("SCHEMA_VERSION_UNSUPPORTED");
  parseMeta(envelope.meta);
  return envelope;
}

export function isRecordId(value: string): boolean {
  return RECORD_ID_PATTERN.test(value);
}

export function isAssetId(value: string): boolean {
  return ASSET_ID_PATTERN.test(value);
}

function parseRecordSummary(value: unknown, publicOnly: boolean): RecordSummary {
  const record = object(value, "RECORD");
  const id = string(record.id, "RECORD_ID");
  const type = string(record.type, "RECORD_TYPE") as RecordType;
  const status = string(record.status, "RECORD_STATUS") as RecordStatus;
  const visibility = string(record.visibility, "RECORD_VISIBILITY") as Visibility;
  const slug = string(record.slug, "RECORD_SLUG");
  const occurredOn = record.occurredOn === null ? null : string(record.occurredOn, "OCCURRED_ON");
  const revision = positiveInteger(record.revision, "RECORD_REVISION");
  if (
    !isRecordId(id) ||
    !RECORD_TYPES.includes(type) ||
    !["draft", "published", "archived"].includes(status) ||
    !["public", "private"].includes(visibility) ||
    !SLUG_PATTERN.test(slug) ||
    slug.length > 80 ||
    (occurredOn !== null && !DATE_PATTERN.test(occurredOn)) ||
    (publicOnly && (status !== "published" || visibility !== "public"))
  ) {
    throw new Error(publicOnly ? "PUBLIC_RECORD_INVALID" : "OWNER_RECORD_INVALID");
  }
  return {
    id,
    type,
    title: string(record.title, "RECORD_TITLE"),
    slug,
    oldSlugs: strings(record.oldSlugs, "OLD_SLUGS"),
    occurredOn,
    updatedAt: string(record.updatedAt, "UPDATED_AT"),
    revision,
    tags: strings(record.tags, "RECORD_TAGS"),
    summary: record.summary === null ? null : string(record.summary, "RECORD_SUMMARY", true),
    status,
    visibility,
  };
}

export function parsePublicRecordSummary(value: unknown): RecordSummary {
  return parseRecordSummary(value, true);
}

export function parseOwnerRecordSummary(value: unknown): RecordSummary {
  return parseRecordSummary(value, false);
}

function parseAttachment(value: unknown): RecordAttachment {
  const attachment = object(value, "ATTACHMENT");
  const id = string(attachment.id, "ASSET_ID");
  const mediaType = string(attachment.mediaType, "MEDIA_TYPE") as RecordAttachment["mediaType"];
  const url = string(attachment.url, "ASSET_URL");
  if (!isAssetId(id) || !MEDIA_TYPES.includes(mediaType) || url !== `/api/v1/assets/${id}`) {
    throw new Error("ATTACHMENT_INVALID");
  }
  return {
    id,
    mediaType,
    url,
    ...(attachment.title === undefined ? {} : { title: string(attachment.title, "ATTACHMENT_TITLE") }),
    ...(attachment.width === undefined ? {} : { width: positiveInteger(attachment.width, "ATTACHMENT_WIDTH") }),
    ...(attachment.height === undefined ? {} : { height: positiveInteger(attachment.height, "ATTACHMENT_HEIGHT") }),
  };
}

type RecordSummaryParser = (value: unknown) => RecordSummary;

function parseRecordDetail(value: unknown, parseSummary: RecordSummaryParser): RecordDetail {
  const summary = parseSummary(value);
  const record = object(value, "RECORD");
  const body = object(record.body, "RECORD_BODY");
  if (body.parseRevision !== MARKDOWN_PARSE_REVISION || !Array.isArray(body.toc) || !Array.isArray(record.attachments) || !Array.isArray(record.relatedRecords)) {
    throw new Error("RECORD_BODY_INVALID");
  }
  const toc = body.toc.map((item): TocItem => {
    const entry = object(item, "TOC_ITEM");
    const level = positiveInteger(entry.level, "TOC_LEVEL");
    if (level < 2 || level > 6) throw new Error("TOC_LEVEL_INVALID");
    return {
      id: string(entry.id, "TOC_ID"),
      text: string(entry.text, "TOC_TEXT", true),
      level,
    };
  });
  return {
    ...summary,
    body: {
      html: string(body.html, "RECORD_HTML", true),
      toc,
      parseRevision: MARKDOWN_PARSE_REVISION,
    },
    attachments: record.attachments.map(parseAttachment),
    relatedRecords: record.relatedRecords.map(parseSummary),
  };
}

export function parsePublicRecordDetail(value: unknown): RecordDetail {
  return parseRecordDetail(value, parsePublicRecordSummary);
}

function parseListResponse(value: unknown, parseSummary: RecordSummaryParser): RecordListResponse {
  const envelope = success(value);
  const data = object(envelope.data, "LIST_DATA");
  const pageInfo = object(data.pageInfo, "PAGE_INFO");
  if (!Array.isArray(data.items) || typeof pageInfo.hasMore !== "boolean") {
    throw new Error("LIST_DATA_INVALID");
  }
  if (pageInfo.nextCursor !== null && typeof pageInfo.nextCursor !== "string") {
    throw new Error("NEXT_CURSOR_INVALID");
  }
  return {
    schemaVersion: API_SCHEMA_VERSION,
    data: {
      items: data.items.map(parseSummary),
      pageInfo: {
        hasMore: pageInfo.hasMore,
        nextCursor: pageInfo.nextCursor as string | null,
      },
    },
    meta: parseMeta(envelope.meta),
  };
}

export function parsePublicTagsResponse(value: unknown): ApiSuccess<{ readonly tags: readonly string[] }> {
  const envelope = success(value);
  const data = object(envelope.data, "TAGS_DATA");
  return { schemaVersion: API_SCHEMA_VERSION, data: { tags: strings(data.tags, "TAG") }, meta: parseMeta(envelope.meta) };
}

export function parseRecordListResponse(value: unknown): RecordListResponse {
  return parseListResponse(value, parsePublicRecordSummary);
}

export function parseOwnerRecordListResponse(value: unknown): RecordListResponse {
  return parseListResponse(value, parseOwnerRecordSummary);
}

export function parseRecordDetailResponse(value: unknown): RecordDetailResponse {
  const envelope = success(value);
  return {
    schemaVersion: API_SCHEMA_VERSION,
    data: parseRecordDetail(envelope.data, parsePublicRecordSummary),
    meta: parseMeta(envelope.meta),
  };
}

export function parseOwnerRecordDetailResponse(value: unknown): RecordDetailResponse {
  const envelope = success(value);
  return {
    schemaVersion: API_SCHEMA_VERSION,
    data: parseRecordDetail(envelope.data, parseOwnerRecordSummary),
    meta: parseMeta(envelope.meta),
  };
}

export function parseApiErrorResponse(value: unknown): ApiErrorResponse {
  const envelope = object(value, "ERROR_RESPONSE");
  const error = object(envelope.error, "ERROR");
  const code = string(error.code, "ERROR_CODE") as ApiErrorCode;
  if (
    envelope.schemaVersion !== API_SCHEMA_VERSION ||
    !ERROR_CODES.includes(code) ||
    !Array.isArray(error.details)
  ) {
    throw new Error("ERROR_RESPONSE_INVALID");
  }
  const requestId = string(error.requestId, "REQUEST_ID");
  if (requestId.length > 128) throw new Error("REQUEST_ID_INVALID");
  const details = error.details.map((item): ApiErrorDetail => {
    const detail = object(item, "ERROR_DETAIL");
    const result: { [key: string]: string } = {};
    for (const key of ["code", "message", "file", "field", "parameter"]) {
      if (detail[key] !== undefined) result[key] = string(detail[key], "ERROR_DETAIL_VALUE", true);
    }
    return result;
  });
  return {
    schemaVersion: API_SCHEMA_VERSION,
    error: {
      code,
      message: string(error.message, "ERROR_MESSAGE"),
      requestId,
      details,
    },
  };
}

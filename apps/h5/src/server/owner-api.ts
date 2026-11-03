import { cookies } from "next/headers";
import { parseSiteRuntimeConfig } from "@daytrace/config";
import {
  API_SCHEMA_VERSION,
  CONTENT_REVISION_PATTERN,
  MARKDOWN_PARSE_REVISION,
  isAssetId,
  isRecordId,
  parseApiErrorResponse,
  parseOwnerRecordSummary,
  type RecordDetail,
  type RecordListData,
  type RecordSummary,
} from "@daytrace/contracts";
import { PublicApiError } from "@daytrace/content/public-api";

const SESSION_COOKIE = "__Host-daytrace_session";
const SESSION_VALUE = /^[A-Za-z0-9_-]{43}$/;

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("OBJECT_INVALID");
  return value as Record<string, unknown>;
}

function text(value: unknown, empty = false): string {
  if (typeof value !== "string" || !empty && value === "") throw new Error("TEXT_INVALID");
  return value;
}

function strings(value: unknown): readonly string[] {
  if (!Array.isArray(value)) throw new Error("STRINGS_INVALID");
  return value.map((item) => text(item));
}

function positiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new Error("INTEGER_INVALID");
  return value;
}

function ownerSummary(value: unknown): RecordSummary {
  const record = object(value);
  const id = text(record.id);
  const status = text(record.status);
  const visibility = text(record.visibility);
  const type = text(record.type);
  const slug = text(record.slug);
  if (
    !isRecordId(id) || !["draft", "published", "archived"].includes(status) ||
    !["public", "private"].includes(visibility) ||
    !["engineering", "recipe", "reflection"].includes(type) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80
  ) throw new Error("OWNER_RECORD_INVALID");
  const occurredOn = record.occurredOn === null ? null : text(record.occurredOn);
  if (occurredOn !== null && !/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) throw new Error("OWNER_DATE_INVALID");
  return {
    id,
    type: type as RecordSummary["type"],
    title: text(record.title),
    slug,
    oldSlugs: strings(record.oldSlugs),
    occurredOn,
    updatedAt: text(record.updatedAt),
    revision: positiveInteger(record.revision),
    tags: strings(record.tags),
    summary: record.summary === null ? null : text(record.summary, true),
    status: status as RecordSummary["status"],
    visibility: visibility as RecordSummary["visibility"],
  };
}

function ownerDetail(value: unknown): RecordDetail {
  const summary = ownerSummary(value);
  const record = object(value);
  const body = object(record.body);
  if (body.parseRevision !== MARKDOWN_PARSE_REVISION || !Array.isArray(body.toc) || !Array.isArray(record.attachments) || !Array.isArray(record.relatedRecords)) {
    throw new Error("OWNER_BODY_INVALID");
  }
  return {
    ...summary,
    body: {
      html: text(body.html, true),
      toc: body.toc.map((item) => {
        const entry = object(item);
        const level = positiveInteger(entry.level);
        if (level < 2 || level > 6) throw new Error("OWNER_TOC_INVALID");
        return { id: text(entry.id), text: text(entry.text, true), level };
      }),
      parseRevision: MARKDOWN_PARSE_REVISION,
    },
    relatedRecords: record.relatedRecords.map(parseOwnerRecordSummary),
    attachments: record.attachments.map((item) => {
      const attachment = object(item);
      const id = text(attachment.id);
      const mediaType = text(attachment.mediaType) as RecordDetail["attachments"][number]["mediaType"];
      if (
        !isAssetId(id) ||
        !["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"].includes(mediaType) ||
        attachment.url !== `/api/v1/assets/${id}`
      ) throw new Error("OWNER_ATTACHMENT_INVALID");
      return {
        id,
        mediaType,
        url: attachment.url,
        ...(attachment.title === undefined ? {} : { title: text(attachment.title) }),
        ...(attachment.width === undefined ? {} : { width: positiveInteger(attachment.width) }),
        ...(attachment.height === undefined ? {} : { height: positiveInteger(attachment.height) }),
      };
    }),
  };
}

function envelope(value: unknown): Record<string, unknown> {
  const response = object(value);
  const meta = object(response.meta);
  if (
    response.schemaVersion !== API_SCHEMA_VERSION || text(meta.requestId).length > 128 ||
    !CONTENT_REVISION_PATTERN.test(text(meta.contentRevision))
  ) throw new Error("OWNER_ENVELOPE_INVALID");
  return response;
}

function ownerList(value: unknown): RecordListData {
  const response = envelope(value);
  const data = object(response.data);
  const pageInfo = object(data.pageInfo);
  if (!Array.isArray(data.items) || typeof pageInfo.hasMore !== "boolean") throw new Error("OWNER_LIST_INVALID");
  if (pageInfo.nextCursor !== null && typeof pageInfo.nextCursor !== "string") throw new Error("OWNER_CURSOR_INVALID");
  return {
    items: data.items.map(ownerSummary),
    pageInfo: { hasMore: pageInfo.hasMore, nextCursor: pageInfo.nextCursor },
  };
}

async function readError(response: Response): Promise<PublicApiError> {
  try {
    const payload = parseApiErrorResponse(await response.json());
    return new PublicApiError(response.status, payload.error.code, payload.error.requestId);
  } catch {
    return new PublicApiError(response.status, "CONTRACT_INVALID");
  }
}

export interface OwnerApiClient {
  list(cursor?: string): Promise<RecordListData>;
  record(recordId: string): Promise<RecordDetail | null>;
  csrf(): Promise<string>;
}

export function createOwnerApiClient(sessionValue: string | null): OwnerApiClient {
  async function request(path: string): Promise<Response> {
    if (sessionValue === null || !SESSION_VALUE.test(sessionValue)) throw new PublicApiError(401, "AUTH_REQUIRED");
    let config: ReturnType<typeof parseSiteRuntimeConfig>;
    try {
      config = parseSiteRuntimeConfig(process.env);
    } catch {
      throw new PublicApiError(500, "API_UNAVAILABLE");
    }
    try {
      return await fetch(new URL(path, config.apiInternalOrigin), {
        cache: "no-store",
        redirect: "manual",
        headers: {
          accept: "application/json",
          cookie: `${SESSION_COOKIE}=${sessionValue}`,
        },
        signal: AbortSignal.timeout(2_000),
      });
    } catch {
      throw new PublicApiError(503, "API_UNAVAILABLE");
    }
  }

  return {
    async list(cursor?: string): Promise<RecordListData> {
      const suffix = cursor === undefined ? "" : `&cursor=${encodeURIComponent(cursor)}`;
      const response = await request(`/api/v1/records?scope=owner${suffix}`);
      if (!response.ok) throw await readError(response);
      try {
        return ownerList(await response.json());
      } catch {
        throw new PublicApiError(502, "CONTRACT_INVALID");
      }
    },
    async record(recordId: string): Promise<RecordDetail | null> {
      if (!isRecordId(recordId)) return null;
      const response = await request(`/api/v1/records/${encodeURIComponent(recordId)}?scope=owner`);
      if (response.status === 404) {
        const error = await readError(response);
        if (error.code === "RECORD_NOT_FOUND") return null;
        throw error;
      }
      if (!response.ok) throw await readError(response);
      try {
        return ownerDetail(envelope(await response.json()).data);
      } catch {
        throw new PublicApiError(502, "CONTRACT_INVALID");
      }
    },
    async csrf(): Promise<string> {
      const response = await request("/api/v1/auth/csrf");
      if (!response.ok) throw await readError(response);
      try {
        const token = text((await response.json()).csrfToken);
        if (!SESSION_VALUE.test(token)) throw new Error("CSRF_INVALID");
        return token;
      } catch {
        throw new PublicApiError(502, "CONTRACT_INVALID");
      }
    },
  };
}

export async function ownerApi(): Promise<OwnerApiClient> {
  const session = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  return createOwnerApiClient(session);
}

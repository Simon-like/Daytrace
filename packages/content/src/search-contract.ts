import {
  API_SCHEMA_VERSION,
  CONTENT_REVISION_PATTERN,
  parseOwnerRecordSummary,
  parsePublicRecordSummary,
  type RecordSummary,
} from "@daytrace/contracts";

export interface PublicSearchMatch {
  readonly field: "title" | "tag" | "body";
  readonly text: string;
  readonly ranges: readonly { start: number; length: number }[];
}

export interface PublicSearchItem {
  readonly record: RecordSummary;
  readonly matches: readonly PublicSearchMatch[];
}

export interface PublicSearchData {
  readonly items: readonly PublicSearchItem[];
  readonly pageInfo: { hasMore: boolean; nextCursor: string | null };
}

export interface PublicSearchResponse {
  readonly data: PublicSearchData;
  readonly meta: { requestId: string; contentRevision: string };
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("SEARCH_RESPONSE_INVALID");
  return value as Record<string, unknown>;
}

function parseMatch(value: unknown): PublicSearchMatch {
  const match = object(value);
  if (!["title", "tag", "body"].includes(String(match.field)) || typeof match.text !== "string" || !Array.isArray(match.ranges)) {
    throw new Error("SEARCH_MATCH_INVALID");
  }
  const textLength = Array.from(match.text).length;
  const ranges = match.ranges.map((value) => {
    const range = object(value);
    if (
      typeof range.start !== "number" || !Number.isSafeInteger(range.start) || range.start < 0 ||
      typeof range.length !== "number" || !Number.isSafeInteger(range.length) || range.length < 1 ||
      range.start + range.length > textLength
    ) throw new Error("SEARCH_RANGE_INVALID");
    return { start: range.start, length: range.length };
  });
  return { field: match.field as PublicSearchMatch["field"], text: match.text, ranges };
}

function parseSearchResponse(value: unknown, publicOnly: boolean): PublicSearchResponse {
  const envelope = object(value);
  const data = object(envelope.data);
  const pageInfo = object(data.pageInfo);
  const meta = object(envelope.meta);
  if (
    envelope.schemaVersion !== API_SCHEMA_VERSION || !Array.isArray(data.items) ||
    typeof pageInfo.hasMore !== "boolean" ||
    (pageInfo.nextCursor !== null && typeof pageInfo.nextCursor !== "string") ||
    typeof meta.requestId !== "string" || meta.requestId.length < 1 || meta.requestId.length > 128 ||
    typeof meta.contentRevision !== "string" || !CONTENT_REVISION_PATTERN.test(meta.contentRevision)
  ) throw new Error("SEARCH_RESPONSE_INVALID");
  return {
    data: {
      items: data.items.map((value): PublicSearchItem => {
        const item = object(value);
        if (!Array.isArray(item.matches)) throw new Error("SEARCH_ITEM_INVALID");
        const record = publicOnly ? parsePublicRecordSummary(item.record) : parseOwnerRecordSummary(item.record);
        return { record, matches: item.matches.map(parseMatch) };
      }),
      pageInfo: { hasMore: pageInfo.hasMore, nextCursor: pageInfo.nextCursor as string | null },
    },
    meta: { requestId: meta.requestId, contentRevision: meta.contentRevision },
  };
}

export function parsePublicSearchResponse(value: unknown): PublicSearchResponse {
  return parseSearchResponse(value, true);
}

export function parseOwnerSearchResponse(value: unknown): PublicSearchResponse {
  return parseSearchResponse(value, false);
}

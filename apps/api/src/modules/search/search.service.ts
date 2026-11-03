import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ApiError, invalidQuery } from "../../common/api-error";
import { PublicSearchIndex } from "./public-search.index";
import type {
  OwnerSearchQuery,
  PublicSearchQuery,
  SearchIndexRecord,
  SearchIndexReader,
  SearchMatch,
  SearchMatchRange,
  SearchPage,
  SearchResultItem,
} from "./search.types";

export type { SearchIndexSnapshot } from "./search.types";

interface RankedResult {
  readonly item: SearchResultItem;
  readonly rank: number;
  readonly order: number;
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function matchRange(text: string, query: string): SearchMatchRange | null {
  const foldedText = text.toLocaleLowerCase("en-US");
  const foldedQuery = query.toLocaleLowerCase("en-US");
  const index = foldedText.indexOf(foldedQuery);
  if (index < 0) return null;
  return {
    start: codePointLength(foldedText.slice(0, index)),
    length: codePointLength(foldedText.slice(index, index + foldedQuery.length)),
  };
}

function match(field: SearchMatch["field"], text: string, query: string): SearchMatch | null {
  const range = matchRange(text, query);
  return range === null ? null : { field, text, ranges: [range] };
}

function bodyMatch(text: string, query: string): SearchMatch | null {
  const range = matchRange(text, query);
  if (range === null) return null;
  const points = Array.from(text);
  const start = Math.max(0, range.start - 48);
  const end = Math.min(points.length, range.start + range.length + 96);
  return {
    field: "body",
    text: points.slice(start, end).join(""),
    ranges: [{ start: range.start - start, length: range.length }],
  };
}

function rankRecord(indexed: SearchIndexRecord, query: string, order: number): RankedResult | null {
  const title = match("title", indexed.record.title, query);
  const tag = indexed.record.tags.map((value) => match("tag", value, query)).find((value) => value !== null) ?? null;
  const body = bodyMatch(indexed.bodyText, query);
  const matches = [title, tag, body].filter((value): value is SearchMatch => value !== null);
  if (matches.length === 0) return null;
  return {
    item: { record: indexed.record, matches },
    rank: title !== null ? 0 : tag !== null ? 1 : 2,
    order,
  };
}

@Injectable()
export class SearchService {
  private readonly cursorKey = randomBytes(32);

  constructor(private readonly index: SearchIndexReader) {}

  searchPublic(query: PublicSearchQuery): SearchPage {
    return this.search(query, "public");
  }

  searchOwner(query: OwnerSearchQuery): SearchPage {
    return this.search(query, "owner");
  }

  private search(query: OwnerSearchQuery, scope: "public" | "owner"): SearchPage {
    const q = query.q.trim().normalize("NFC");
    if (codePointLength(q) < 1 || codePointLength(q) > 100) throw invalidQuery("q 去除首尾空白后需为 1–100 字", "q");
    const snapshot = this.index.read();
    const fingerprint = this.fingerprint(query, q, scope);
    let offset = 0;
    if (query.cursor !== undefined) offset = this.decodeCursor(query.cursor, snapshot.contentRevision, fingerprint);
    const matches = snapshot.records
      .filter(({ record }) =>
        (query.type === undefined || record.type === query.type) &&
        query.tags.every((tag) => record.tags.includes(tag)) &&
        (scope === "public" ||
          (query.status === undefined || record.status === query.status) &&
          (query.visibility === undefined || record.visibility === query.visibility))
      )
      .map((record, order) => rankRecord(record, q, order))
      .filter((value): value is RankedResult => value !== null)
      .sort((left, right) => left.rank - right.rank || left.order - right.order || left.item.record.id.localeCompare(right.item.record.id));
    const page = matches.slice(offset, offset + query.limit);
    const hasMore = offset + query.limit < matches.length;
    return {
      contentRevision: snapshot.contentRevision,
      items: page.map(({ item }) => item),
      pageInfo: {
        hasMore,
        nextCursor: hasMore ? this.encodeCursor(snapshot.contentRevision, fingerprint, offset + query.limit) : null,
      },
    };
  }

  private fingerprint(query: OwnerSearchQuery, normalizedQuery: string, scope: "public" | "owner"): string {
    return createHash("sha256").update(JSON.stringify({
      scope,
      q: normalizedQuery,
      type: query.type ?? null,
      tags: [...query.tags].sort(),
      limit: query.limit,
      status: scope === "owner" ? query.status ?? null : null,
      visibility: scope === "owner" ? query.visibility ?? null : null,
    })).digest("hex");
  }

  private encodeCursor(contentRevision: string, fingerprint: string, offset: number): string {
    const payload = Buffer.from(JSON.stringify({ r: contentRevision, f: fingerprint, o: offset })).toString("base64url");
    const signature = createHmac("sha256", this.cursorKey).update(payload).digest("base64url");
    return `${payload}.${signature}`;
  }

  private decodeCursor(cursor: string, contentRevision: string, fingerprint: string): number {
    try {
      const [payload, supplied, extra] = cursor.split(".");
      if (!payload || !supplied || extra !== undefined) throw new Error("shape");
      const expected = createHmac("sha256", this.cursorKey).update(payload).digest("base64url");
      const suppliedBytes = Buffer.from(supplied);
      const expectedBytes = Buffer.from(expected);
      if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
        throw new Error("signature");
      }
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
      if (parsed.r !== contentRevision || parsed.f !== fingerprint || typeof parsed.o !== "number" || !Number.isSafeInteger(parsed.o) || parsed.o < 0) {
        throw new Error("revision");
      }
      return parsed.o;
    } catch {
      throw new ApiError(400, "INVALID_CURSOR", "分页游标无效或已过期", [{ parameter: "cursor", message: "请从第一页重新请求" }]);
    }
  }
}

export function searchServiceProvider() {
  return { provide: SearchService, useFactory: (index: PublicSearchIndex) => new SearchService(index), inject: [PublicSearchIndex] };
}

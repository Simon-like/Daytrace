import { Inject, Injectable } from "@nestjs/common";
import type { RecordDetail, RecordSummary } from "@daytrace/contracts";
import sanitizeHtml from "sanitize-html";
import { ApiError } from "../../common/api-error";
import { ContentService, type PublicListQuery } from "../content/content.service";
import { SearchUnavailableError } from "./search.errors";
import type { SearchIndexRecord, SearchIndexSnapshot, SearchIndexReader } from "./search.types";

export interface PublicContentReader {
  readonly contentRevision: string;
  listPublic(query: PublicListQuery): {
    items: readonly RecordSummary[];
    hasMore: boolean;
    nextCursor: string | null;
  };
  getPublicRecord(recordId: string): { readonly detail: RecordDetail };
}

function bodyText(detail: RecordDetail): string {
  return sanitizeHtml(detail.body.html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/gu, " ")
    .trim();
}

@Injectable()
export class PublicSearchIndex implements SearchIndexReader {
  private cached: SearchIndexSnapshot | undefined;

  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  read(): SearchIndexSnapshot {
    try {
      const revision = this.content.contentRevision;
      if (this.cached?.contentRevision === revision) return this.cached;
      const summaries: RecordSummary[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | undefined;
      do {
        const page = this.content.listPublic({ tags: [], limit: 50, ...(cursor === undefined ? {} : { cursor }) });
        summaries.push(...page.items);
        if (page.nextCursor !== null) {
          if (seenCursors.has(page.nextCursor)) throw new SearchUnavailableError();
          seenCursors.add(page.nextCursor);
        }
        cursor = page.nextCursor ?? undefined;
      } while (cursor !== undefined);

      const records: SearchIndexRecord[] = summaries.map((record) => ({
        record,
        bodyText: bodyText(this.content.getPublicRecord(record.id).detail),
      }));
      if (this.content.contentRevision !== revision) {
        throw new SearchUnavailableError("公开搜索索引与内容快照不一致");
      }
      this.cached = { contentRevision: revision, records };
      return this.cached;
    } catch (error: unknown) {
      if (error instanceof ApiError) throw error;
      throw new SearchUnavailableError();
    }
  }
}

export function publicSearchIndexProvider() {
  return { provide: PublicSearchIndex, useClass: PublicSearchIndex };
}

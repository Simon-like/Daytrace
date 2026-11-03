import { Inject, Injectable } from "@nestjs/common";
import sanitizeHtml from "sanitize-html";
import { ApiError } from "../../common/api-error";
import { ContentService } from "../content/content.service";
import { SearchUnavailableError } from "./search.errors";
import type { SearchIndexRecord, SearchIndexSnapshot, SearchIndexReader } from "./search.types";

function bodyText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/gu, " ")
    .trim();
}

/** Built only after owner authorization; never used by the public search provider. */
@Injectable()
export class OwnerSearchIndex implements SearchIndexReader {
  private cached: SearchIndexSnapshot | undefined;

  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  read(): SearchIndexSnapshot {
    try {
      const revision = this.content.ownerContentRevision;
      if (this.cached?.contentRevision === revision) return this.cached;
      const records: SearchIndexRecord[] = this.content.listOwner().items.map((record) => ({
        record,
        bodyText: bodyText(this.content.getOwnerRecord(record.id).detail.body.html),
      }));
      if (this.content.ownerContentRevision !== revision) {
        throw new SearchUnavailableError("主人搜索索引与内容快照不一致");
      }
      this.cached = { contentRevision: revision, records };
      return this.cached;
    } catch (error: unknown) {
      if (error instanceof ApiError) throw error;
      throw new SearchUnavailableError("主人搜索暂时不可用");
    }
  }
}

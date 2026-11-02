import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { isAssetId, isRecordId, type RecordSummary } from "@daytrace/contracts";
import {
  ApiError,
  AssetNotFoundError,
  ContentSnapshotInvalidError,
  ContentSnapshotUnavailableError,
  RecordNotFoundError,
  invalidAssetId,
  invalidRecordId,
} from "../../common/api-error";
import { loadContentSnapshot, readAssetBytes } from "./content.snapshot";
import { toPublicSummary, type ContentSnapshot, type SourceRecord } from "./content.types";

export interface PublicListQuery {
  readonly type?: string;
  readonly tags: readonly string[];
  readonly limit: number;
  readonly cursor?: string;
}

@Injectable()
export class ContentService implements OnModuleInit {
  private snapshot: ContentSnapshot | undefined;
  private failure: ApiError | undefined;
  private readonly cursorKey = randomBytes(32);

  constructor(readonly contentRoot: string) {}

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      const candidate = await loadContentSnapshot(this.contentRoot);
      this.snapshot = candidate;
      this.failure = undefined;
    } catch (error: unknown) {
      if (this.snapshot !== undefined) return;
      if (error instanceof ContentSnapshotInvalidError || error instanceof ContentSnapshotUnavailableError) {
        this.failure = error instanceof ContentSnapshotInvalidError
          ? new ContentSnapshotInvalidError(error.details.filter(detail => !detail.file?.startsWith("private/")))
          : error;
      } else {
        this.failure = new ContentSnapshotUnavailableError();
      }
    }
  }

  private current(): ContentSnapshot {
    if (this.snapshot === undefined) throw this.failure ?? new ContentSnapshotUnavailableError();
    return this.snapshot;
  }

  get contentRevision(): string {
    return this.current().publicContentRevision;
  }

  get ownerContentRevision(): string {
    return this.current().contentRevision;
  }

  listPublic(query: PublicListQuery): { items: readonly RecordSummary[]; hasMore: boolean; nextCursor: string | null } {
    const snapshot = this.current();
    const fingerprint = createHash("sha256").update(JSON.stringify({
      type: query.type ?? null,
      tags: [...query.tags].sort(),
      limit: query.limit,
    })).digest("hex");
    let offset = 0;
    if (query.cursor !== undefined) offset = this.decodeCursor(query.cursor, snapshot.publicContentRevision, fingerprint);
    const filtered = snapshot.publicRecords.filter((record) =>
      (query.type === undefined || record.metadata.type === query.type) &&
      query.tags.every((tag) => record.metadata.tags.includes(tag)),
    );
    const page = filtered.slice(offset, offset + query.limit);
    const hasMore = offset + query.limit < filtered.length;
    return {
      items: page.map(toPublicSummary),
      hasMore,
      nextCursor: hasMore ? this.encodeCursor(snapshot.publicContentRevision, fingerprint, offset + query.limit) : null,
    };
  }

  getPublicRecord(recordId: string): SourceRecord {
    if (!isRecordId(recordId)) throw invalidRecordId();
    const record = this.current().publicRecords.find((item) => item.metadata.id === recordId);
    if (record === undefined) throw new RecordNotFoundError();
    return record;
  }

  async getPublicAsset(assetId: string): Promise<{ bytes: Buffer; mediaType: string; etag: string }> {
    if (!isAssetId(assetId)) throw invalidAssetId();
    for (const record of this.current().publicRecords) {
      const asset = await readAssetBytes(record, assetId);
      if (asset !== null) return asset;
    }
    throw new AssetNotFoundError();
  }

  listOwner(): { items: readonly RecordSummary[]; hasMore: false; nextCursor: null } {
    return { items: this.current().records.map(toPublicSummary), hasMore: false, nextCursor: null };
  }

  getOwnerRecord(recordId: string): SourceRecord {
    if (!isRecordId(recordId)) throw invalidRecordId();
    const record = this.current().records.find((item) => item.metadata.id === recordId);
    if (record === undefined) throw new RecordNotFoundError();
    return record;
  }

  findPublishedAsset(assetId: string) {
    for (const record of this.current().records) {
      if (record.metadata.status !== "published") continue;
      const asset = record.metadata.attachments.find((item) => item.id === assetId);
      if (asset !== undefined) return {
        id: asset.id, visibility: record.metadata.visibility, rootPath: record.recordDirectory,
        relativePath: asset.path, mediaType: asset.mediaType,
      };
    }
    return null;
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

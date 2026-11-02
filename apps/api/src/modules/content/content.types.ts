import type {
  RecordDetail,
  RecordSummary,
  RecordType,
  RecordStatus,
  Visibility,
} from "@daytrace/contracts";
import type { ApiErrorDetail } from "@daytrace/contracts";

export interface SourceAttachment {
  readonly id: string;
  readonly path: string;
  readonly mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "application/pdf" | "text/plain";
  readonly title?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface SourceFrontmatter {
  readonly schemaVersion: 1;
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
  readonly attachments: readonly SourceAttachment[];
}

export interface SourceRecord {
  readonly sourceFile: string;
  readonly recordDirectory: string;
  readonly metadata: SourceFrontmatter;
  readonly detail: RecordDetail;
}

export interface ContentSnapshot {
  readonly contentRevision: string;
  readonly publicContentRevision: string;
  readonly records: readonly SourceRecord[];
  readonly publicRecords: readonly SourceRecord[];
}

export interface LoadedAsset {
  readonly bytes: Buffer;
  readonly mediaType: SourceAttachment["mediaType"];
  readonly etag: string;
}

export type ContentIssue = ApiErrorDetail & {
  readonly code: string;
  readonly message: string;
  readonly file: string;
  readonly field?: string;
};

export function toPublicSummary(record: SourceRecord): RecordSummary {
  const { body: _body, attachments: _attachments, ...summary } = record.detail;
  return summary;
}

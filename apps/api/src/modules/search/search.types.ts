import type { RecordSummary, RecordStatus, RecordType, Visibility } from "@daytrace/contracts";

export interface SearchMatchRange {
  readonly start: number;
  readonly length: number;
}

export interface SearchMatch {
  readonly field: "title" | "tag" | "body";
  readonly text: string;
  readonly ranges: readonly SearchMatchRange[];
}

export interface SearchResultItem {
  readonly record: RecordSummary;
  readonly matches: readonly SearchMatch[];
}

export interface SearchData {
  readonly items: readonly SearchResultItem[];
  readonly pageInfo: {
    readonly hasMore: boolean;
    readonly nextCursor: string | null;
  };
}

export interface SearchPage extends SearchData {
  readonly contentRevision: string;
}

export interface PublicSearchQuery {
  readonly q: string;
  readonly type?: RecordType;
  readonly tags: readonly string[];
  readonly limit: number;
  readonly cursor?: string;
}

export interface OwnerSearchQuery extends PublicSearchQuery {
  readonly status?: RecordStatus;
  readonly visibility?: Visibility;
}

export interface SearchIndexRecord {
  readonly record: RecordSummary;
  readonly bodyText: string;
}

export interface SearchIndexSnapshot {
  readonly contentRevision: string;
  readonly records: readonly SearchIndexRecord[];
}

export interface SearchIndexReader {
  read(): SearchIndexSnapshot;
}

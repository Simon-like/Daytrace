import {
  CONTENT_REVISION_PATTERN,
  parsePublicRecordSummary,
  type RecordListData,
  type RecordType,
} from "@daytrace/contracts";

export interface DiscoveryFilters {
  readonly type: RecordType | null;
  readonly tags: readonly string[];
}

export interface DiscoverySnapshot {
  readonly filters: DiscoveryFilters;
  readonly records: RecordListData;
  readonly contentRevision: string | null;
}

export interface DiscoveryEntry {
  readonly snapshot: DiscoverySnapshot;
  readonly scrollY: number;
}

const RECORD_TYPES: readonly RecordType[] = ["engineering", "recipe", "reflection"];

export const EMPTY_DISCOVERY_FILTERS: DiscoveryFilters = { type: null, tags: [] };

export function normalizeDiscoveryFilters(filters: DiscoveryFilters): DiscoveryFilters {
  return {
    type: filters.type !== null && RECORD_TYPES.includes(filters.type) ? filters.type : null,
    tags: [...new Set(filters.tags.filter((tag) => tag.trim().length > 0).map((tag) => tag.trim()))].sort(),
  };
}

export function parseDiscoveryFilters(search: string): DiscoveryFilters {
  const params = new URLSearchParams(search);
  const type = params.get("type");
  return normalizeDiscoveryFilters({
    type: type !== null && RECORD_TYPES.includes(type as RecordType) ? type as RecordType : null,
    tags: params.getAll("tag"),
  });
}

export function createDiscoveryUrl(pathname: string, currentSearch: string, filters: DiscoveryFilters): string {
  const params = new URLSearchParams(currentSearch);
  params.delete("type");
  params.delete("tag");
  params.delete("cursor");
  const normalized = normalizeDiscoveryFilters(filters);
  if (normalized.type !== null) params.set("type", normalized.type);
  normalized.tags.forEach((tag) => params.append("tag", tag));
  const query = params.toString();
  return `${pathname}${query.length > 0 ? `?${query}` : ""}`;
}

export function sameDiscoveryFilters(left: DiscoveryFilters, right: DiscoveryFilters): boolean {
  return left.type === right.type && left.tags.length === right.tags.length && left.tags.every((tag, index) => tag === right.tags[index]);
}

export function createDiscoveryEntry(snapshot: DiscoverySnapshot, scrollY: number): DiscoveryEntry {
  return { snapshot, scrollY };
}

export function mergeDiscoveryHistoryState(current: unknown, entry: DiscoveryEntry): Record<string, unknown> {
  const existing = typeof current === "object" && current !== null && !Array.isArray(current)
    ? current as Record<string, unknown>
    : {};
  return { ...existing, daytraceDiscovery: entry };
}

export function readDiscoveryEntry(value: unknown): DiscoveryEntry | null {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const candidate = value as { snapshot?: unknown; scrollY?: unknown };
    if (typeof candidate.scrollY !== "number" || !Number.isFinite(candidate.scrollY) || candidate.scrollY < 0) return null;
    if (typeof candidate.snapshot !== "object" || candidate.snapshot === null) return null;
    const snapshot = candidate.snapshot as {
      filters?: { type?: unknown; tags?: unknown };
      records?: {
        items?: unknown[];
        pageInfo?: { hasMore?: unknown; nextCursor?: unknown };
      };
      contentRevision?: unknown;
    };
    const type = snapshot.filters?.type;
    const tags = snapshot.filters?.tags;
    const records = snapshot.records;
    if (
      (type !== null && (typeof type !== "string" || !RECORD_TYPES.includes(type as RecordType))) ||
      !Array.isArray(tags) || !tags.every((tag) => typeof tag === "string") ||
      !Array.isArray(records?.items) || typeof records.pageInfo?.hasMore !== "boolean" ||
      (records.pageInfo.nextCursor !== null && typeof records.pageInfo.nextCursor !== "string") ||
      (snapshot.contentRevision !== null && (typeof snapshot.contentRevision !== "string" || !CONTENT_REVISION_PATTERN.test(snapshot.contentRevision)))
    ) return null;
    const filters = normalizeDiscoveryFilters({ type: type as RecordType | null, tags: tags as string[] });
    return {
      snapshot: {
        filters,
        records: {
          items: records.items.map(parsePublicRecordSummary),
          pageInfo: {
            hasMore: records.pageInfo.hasMore,
            nextCursor: records.pageInfo.nextCursor as string | null,
          },
        },
        contentRevision: snapshot.contentRevision as string | null,
      },
      scrollY: candidate.scrollY,
    };
  } catch {
    return null;
  }
}

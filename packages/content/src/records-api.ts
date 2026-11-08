import {
  parseApiErrorResponse,
  parseRecordListResponse,
  type ApiErrorCode,
  type RecordListData,
} from "@daytrace/contracts";
import type { DiscoveryFilters } from "./discovery-state";

export class RecordsRequestError extends Error {
  constructor(
    readonly code: ApiErrorCode | "API_UNAVAILABLE" | "CONTRACT_INVALID",
    readonly requestId?: string,
  ) {
    super(code);
    this.name = "RecordsRequestError";
  }
}

export interface RecordsResult {
  readonly data: RecordListData;
  readonly contentRevision: string;
}

export async function fetchPublicRecords(filters: DiscoveryFilters, signal?: AbortSignal, cursor?: string): Promise<RecordsResult> {
  const params = new URLSearchParams({ limit: "50" });
  if (cursor !== undefined) params.set("cursor", cursor);
  if (filters.type !== null) params.set("type", filters.type);
  filters.tags.forEach((tag) => params.append("tag", tag));
  let response: Response;
  try {
    response = await fetch(`/api/v1/records?${params.toString()}`, {
      headers: { accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal: signal ?? null,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new RecordsRequestError("API_UNAVAILABLE");
  }
  if (!response.ok) {
    try {
      const payload = parseApiErrorResponse(await response.json());
      throw new RecordsRequestError(payload.error.code, payload.error.requestId);
    } catch (error: unknown) {
      if (error instanceof RecordsRequestError) throw error;
      throw new RecordsRequestError("CONTRACT_INVALID");
    }
  }
  try {
    const payload = parseRecordListResponse(await response.json());
    return { data: payload.data, contentRevision: payload.meta.contentRevision };
  } catch {
    throw new RecordsRequestError("CONTRACT_INVALID");
  }
}

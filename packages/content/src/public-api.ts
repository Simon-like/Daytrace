import { parseSiteRuntimeConfig } from "@daytrace/config";
import {
  isRecordId,
  parseApiErrorResponse,
  parseRecordDetailResponse,
  parseRecordListResponse,
  parsePublicRecordSummary,
  type ApiErrorCode,
  type RecordDetail,
  type RecordListData,
  type RecordSummary,
} from "@daytrace/contracts";

export class PublicApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | "API_UNAVAILABLE" | "CONTRACT_INVALID",
    readonly requestId?: string,
  ) {
    super(code);
    this.name = "PublicApiError";
  }
}

async function readError(response: Response): Promise<PublicApiError> {
  try {
    const payload = parseApiErrorResponse(await response.json());
    return new PublicApiError(response.status, payload.error.code, payload.error.requestId);
  } catch {
    return new PublicApiError(response.status, "CONTRACT_INVALID");
  }
}

async function request(path: string): Promise<Response> {
  let config: ReturnType<typeof parseSiteRuntimeConfig>;
  try {
    config = parseSiteRuntimeConfig(process.env);
  } catch {
    throw new PublicApiError(500, "API_UNAVAILABLE");
  }
  let response: Response;
  try {
    response = await fetch(new URL(path, config.apiInternalOrigin), {
      cache: "no-store",
      redirect: "manual",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(2_000),
    });
  } catch {
    throw new PublicApiError(503, "API_UNAVAILABLE");
  }
  return response;
}

export async function getPublicRecords(cursor?: string): Promise<RecordListData> {
  const suffix = cursor === undefined ? "" : `?cursor=${encodeURIComponent(cursor)}`;
  const response = await request(`/api/v1/records${suffix}`);
  if (!response.ok) throw await readError(response);
  try {
    return parseRecordListResponse(await response.json()).data;
  } catch {
    throw new PublicApiError(502, "CONTRACT_INVALID");
  }
}

export async function getPublicRecord(recordId: string): Promise<RecordDetail | null> {
  if (!isRecordId(recordId)) return null;
  const response = await request(`/api/v1/records/${encodeURIComponent(recordId)}`);
  if (response.status === 404) {
    const error = await readError(response);
    if (error.code === "RECORD_NOT_FOUND") return null;
    throw error;
  }
  if (!response.ok) throw await readError(response);
  try {
    return parseRecordDetailResponse(await response.json()).data;
  } catch {
    throw new PublicApiError(502, "CONTRACT_INVALID");
  }
}

export async function findPublicRecordBySlug(slug: string): Promise<RecordSummary | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
  const response = await request(`/api/v1/records/resolve/${encodeURIComponent(slug)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw await readError(response);
  try { return parsePublicRecordSummary((await response.json()).data); }
  catch { throw new PublicApiError(502, "CONTRACT_INVALID"); }
}

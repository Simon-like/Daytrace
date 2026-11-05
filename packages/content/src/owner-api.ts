import { parseSiteRuntimeConfig } from "@daytrace/config";
import {
  isRecordId,
  parseApiErrorResponse,
  parseOwnerRecordDetailResponse,
  parseOwnerRecordListResponse,
  type RecordDetail,
  type RecordListData,
} from "@daytrace/contracts";
import { PublicApiError } from "./public-api";

const SESSION_COOKIE = "__Host-daytrace_session";
const SESSION_VALUE = /^[A-Za-z0-9_-]{43}$/;

export interface OwnerApiClientOptions {
  readonly apiInternalOrigin?: string;
  readonly fetch?: typeof fetch;
}

export interface OwnerApiClient {
  list(cursor?: string): Promise<RecordListData>;
  record(recordId: string): Promise<RecordDetail | null>;
  csrf(): Promise<string>;
}

async function readError(response: Response): Promise<PublicApiError> {
  try {
    const payload = parseApiErrorResponse(await response.json());
    return new PublicApiError(response.status, payload.error.code, payload.error.requestId);
  } catch {
    return new PublicApiError(response.status, "CONTRACT_INVALID");
  }
}

export function createOwnerApiClient(
  sessionValue: string | null,
  options: OwnerApiClientOptions = {},
): OwnerApiClient {
  async function request(path: string): Promise<Response> {
    if (sessionValue === null || !SESSION_VALUE.test(sessionValue)) {
      throw new PublicApiError(401, "AUTH_REQUIRED");
    }
    let url: URL;
    try {
      const origin = options.apiInternalOrigin ?? parseSiteRuntimeConfig(process.env).apiInternalOrigin;
      url = new URL(path, origin);
    } catch {
      throw new PublicApiError(500, "API_UNAVAILABLE");
    }
    try {
      return await (options.fetch ?? globalThis.fetch)(url, {
        cache: "no-store",
        redirect: "manual",
        headers: {
          accept: "application/json",
          cookie: `${SESSION_COOKIE}=${sessionValue}`,
        },
        signal: AbortSignal.timeout(2_000),
      });
    } catch {
      throw new PublicApiError(503, "API_UNAVAILABLE");
    }
  }

  return {
    async list(cursor?: string): Promise<RecordListData> {
      const suffix = cursor === undefined ? "" : `&cursor=${encodeURIComponent(cursor)}`;
      const response = await request(`/api/v1/records?scope=owner${suffix}`);
      if (!response.ok) throw await readError(response);
      try {
        return parseOwnerRecordListResponse(await response.json()).data;
      } catch {
        throw new PublicApiError(502, "CONTRACT_INVALID");
      }
    },
    async record(recordId: string): Promise<RecordDetail | null> {
      if (!isRecordId(recordId)) return null;
      const response = await request(`/api/v1/records/${encodeURIComponent(recordId)}?scope=owner`);
      if (response.status === 404) {
        const error = await readError(response);
        if (error.code === "RECORD_NOT_FOUND") return null;
        throw error;
      }
      if (!response.ok) throw await readError(response);
      try {
        return parseOwnerRecordDetailResponse(await response.json()).data;
      } catch {
        throw new PublicApiError(502, "CONTRACT_INVALID");
      }
    },
    async csrf(): Promise<string> {
      const response = await request("/api/v1/auth/csrf");
      if (!response.ok) throw await readError(response);
      try {
        const payload = await response.json() as { csrfToken?: unknown };
        if (typeof payload.csrfToken !== "string" || !SESSION_VALUE.test(payload.csrfToken)) {
          throw new Error("CSRF_INVALID");
        }
        return payload.csrfToken;
      } catch {
        throw new PublicApiError(502, "CONTRACT_INVALID");
      }
    },
  };
}

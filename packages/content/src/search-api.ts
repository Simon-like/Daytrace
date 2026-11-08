import { parseApiErrorResponse } from "@daytrace/contracts";
import { parseOwnerSearchResponse, parsePublicSearchResponse, type PublicSearchResponse } from "./search-contract";
import { EMPTY_SEARCH_FILTERS, normalizeSearchFilters, type SearchFailure, type SearchFilters } from "./search-state";

export class SearchRequestError extends Error {
  constructor(readonly failure: SearchFailure) {
    super(failure.code);
    this.name = "SearchRequestError";
  }
}

export type SearchScope = "public" | "owner";

export async function fetchPublicSearch(query: string, signal?: AbortSignal): Promise<PublicSearchResponse> {
  return fetchSearch(query, "public", signal);
}

export async function fetchSearch(query: string, scope: SearchScope, signal?: AbortSignal, cursor?: string, filters: SearchFilters = EMPTY_SEARCH_FILTERS): Promise<PublicSearchResponse> {
  const params = new URLSearchParams({ q: query.trim(), limit: "20" });
  if (scope === "owner") params.set("scope", "owner");
  if (cursor !== undefined) params.set("cursor", cursor);
  const normalized = normalizeSearchFilters(filters, scope === "owner");
  if (normalized.type) params.set("type", normalized.type);
  if (normalized.status) params.set("status", normalized.status);
  if (normalized.visibility) params.set("visibility", normalized.visibility);
  let response: Response;
  try {
    response = await fetch(`/api/v1/search?${params.toString()}`, {
      headers: { accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal: signal ?? null,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new SearchRequestError({ code: "API_UNAVAILABLE" });
  }
  if (!response.ok) {
    try {
      const payload = parseApiErrorResponse(await response.json());
      throw new SearchRequestError({ code: payload.error.code, requestId: payload.error.requestId });
    } catch (error: unknown) {
      if (error instanceof SearchRequestError) throw error;
      throw new SearchRequestError({ code: "CONTRACT_INVALID" });
    }
  }
  try {
    const payload = await response.json();
    return scope === "owner" ? parseOwnerSearchResponse(payload) : parsePublicSearchResponse(payload);
  } catch {
    throw new SearchRequestError({ code: "CONTRACT_INVALID" });
  }
}

import { parseApiErrorResponse } from "@daytrace/contracts";
import { parsePublicSearchResponse, type PublicSearchResponse } from "./search-contract";
import type { SearchFailure } from "./search-state";

export class SearchRequestError extends Error {
  constructor(readonly failure: SearchFailure) {
    super(failure.code);
    this.name = "SearchRequestError";
  }
}

export async function fetchPublicSearch(query: string, signal?: AbortSignal): Promise<PublicSearchResponse> {
  const params = new URLSearchParams({ q: query.trim(), limit: "20" });
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
    return parsePublicSearchResponse(await response.json());
  } catch {
    throw new SearchRequestError({ code: "CONTRACT_INVALID" });
  }
}

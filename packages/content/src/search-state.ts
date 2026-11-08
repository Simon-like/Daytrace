import type { ApiErrorCode } from "@daytrace/contracts";
import type { PublicSearchData } from "./search-contract";

export interface SearchFailure {
  readonly code: ApiErrorCode | "API_UNAVAILABLE" | "CONTRACT_INVALID";
  readonly requestId?: string;
}

export interface SearchState {
  readonly query: string;
  readonly status: "idle" | "loading" | "results" | "empty" | "error";
  readonly result: PublicSearchData | null;
  readonly contentRevision: string | null;
  readonly error: SearchFailure | null;
  readonly attempt: number;
  readonly moreStatus: "idle" | "loading" | "error";
}

export const initialSearchState: SearchState = {
  query: "",
  status: "idle",
  result: null,
  contentRevision: null,
  error: null,
  attempt: 0,
  moreStatus: "idle",
};

export type SearchAction =
  | { type: "start"; query: string }
  | { type: "success"; attempt: number; result: PublicSearchData; contentRevision: string }
  | { type: "failure"; attempt: number; error: SearchFailure }
  | { type: "more-start"; attempt: number }
  | { type: "more-success"; attempt: number; result: PublicSearchData; contentRevision: string }
  | { type: "more-failure"; attempt: number; error: SearchFailure }
  | { type: "clear" };

export function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "start": {
      const query = action.query.trim();
      if (query.length === 0) return { ...initialSearchState, attempt: state.attempt + 1 };
      return { query, status: "loading", result: null, contentRevision: null, error: null, attempt: state.attempt + 1, moreStatus: "idle" };
    }
    case "success":
      if (action.attempt !== state.attempt) return state;
      return {
        ...state,
        status: action.result.items.length === 0 ? "empty" : "results",
        result: action.result,
        contentRevision: action.contentRevision,
        error: null,
      };
    case "failure":
      if (action.attempt !== state.attempt) return state;
      return { ...state, status: "error", result: null, contentRevision: null, error: action.error };
    case "more-start":
      if (action.attempt !== state.attempt || state.status !== "results" || !state.result?.pageInfo.nextCursor || state.moreStatus === "loading") return state;
      return { ...state, moreStatus: "loading", error: null };
    case "more-success":
      if (action.attempt !== state.attempt || state.moreStatus !== "loading" || !state.result) return state;
      return { ...state, result: { items: [...state.result.items, ...action.result.items], pageInfo: action.result.pageInfo }, contentRevision: action.contentRevision, moreStatus: "idle" };
    case "more-failure":
      if (action.attempt !== state.attempt || state.moreStatus !== "loading") return state;
      if (action.error.code === "AUTH_REQUIRED") return { ...state, status: "error", result: null, contentRevision: null, error: action.error, moreStatus: "idle" };
      return { ...state, moreStatus: "error", error: action.error };
    case "clear":
      return { ...initialSearchState, attempt: state.attempt + 1 };
  }
}

export function parseSearchLocation(search: string): string {
  return (new URLSearchParams(search).get("q") ?? "").trim();
}

export function createSearchUrl(pathname: string, currentSearch: string, query: string): string {
  const params = new URLSearchParams(currentSearch);
  params.delete("q");
  params.delete("cursor");
  const normalized = query.trim();
  if (normalized.length > 0) params.set("q", normalized);
  const serialized = params.toString();
  return `${pathname}${serialized.length > 0 ? `?${serialized}` : ""}`;
}

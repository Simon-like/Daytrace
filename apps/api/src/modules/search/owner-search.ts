import type { RequestWithId } from "../../common/request-id.middleware";
import { authRequired } from "../../common/api-error";
import { SearchUnavailableError } from "./search.errors";
import type { OwnerSearchQuery, SearchPage } from "./search.types";

export const OWNER_SEARCH_AUTHORIZATION = Symbol("OWNER_SEARCH_AUTHORIZATION");
export const OWNER_SEARCH_SERVICE = Symbol("OWNER_SEARCH_SERVICE");

/** Implemented by ACCESS using the Nest owner session and whitelist policy. */
export interface OwnerSearchAuthorization {
  authorize(request: RequestWithId): void | Promise<void>;
}

/** Implemented only against the separate owner projection/index after authorization. */
export interface OwnerSearchService {
  search(request: RequestWithId, query: OwnerSearchQuery): SearchPage | Promise<SearchPage>;
}

export class MissingOwnerSearchAuthorization implements OwnerSearchAuthorization {
  authorize(): never {
    throw authRequired();
  }
}

export class MissingOwnerSearchService implements OwnerSearchService {
  search(): never {
    throw new SearchUnavailableError("主人搜索尚未接入授权后的独立索引");
  }
}

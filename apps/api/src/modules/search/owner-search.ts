import type { RequestWithId } from "../../common/request-id.middleware";
import { authRequired } from "../../common/api-error";
import { onlySessionCookie } from "../auth/cookies";
import { SessionService } from "../auth/session.service";
import { SearchUnavailableError } from "./search.errors";
import { SearchService } from "./search.service";
import type { OwnerSearchIndex } from "./owner-search.index";
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

export class SessionOwnerSearchAuthorization implements OwnerSearchAuthorization {
  constructor(private readonly sessions: SessionService) {}

  authorize(request: RequestWithId): void {
    if (this.sessions.resolve(onlySessionCookie(request.headers.cookie)) === null) throw authRequired();
  }
}

export class IndexedOwnerSearchService implements OwnerSearchService {
  private readonly searchService: SearchService;

  constructor(index: OwnerSearchIndex) {
    this.searchService = new SearchService(index);
  }

  search(_request: RequestWithId, query: OwnerSearchQuery): SearchPage {
    return this.searchService.searchOwner(query);
  }
}

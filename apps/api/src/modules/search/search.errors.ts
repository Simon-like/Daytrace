import { ApiError } from "../../common/api-error";

export class SearchUnavailableError extends ApiError {
  constructor(message = "公开搜索索引暂时不可用") {
    super(503, "SEARCH_UNAVAILABLE", message);
    this.name = "SearchUnavailableError";
  }
}

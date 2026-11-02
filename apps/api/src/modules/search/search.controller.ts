import { Controller, Get, Inject, Query, Req, Res } from "@nestjs/common";
import { API_SCHEMA_VERSION, type ApiSuccess, type RecordStatus, type RecordType, type Visibility } from "@daytrace/contracts";
import type { Response } from "express";
import { invalidQuery } from "../../common/api-error";
import type { RequestWithId } from "../../common/request-id.middleware";
import {
  OWNER_SEARCH_AUTHORIZATION,
  OWNER_SEARCH_SERVICE,
  type OwnerSearchAuthorization,
  type OwnerSearchService,
} from "./owner-search";
import { SearchService } from "./search.service";
import type { OwnerSearchQuery, PublicSearchQuery, SearchData } from "./search.types";

const RECORD_TYPES: readonly RecordType[] = ["engineering", "recipe", "reflection"];
const RECORD_STATUSES: readonly RecordStatus[] = ["draft", "published", "archived"];
const VISIBILITIES: readonly Visibility[] = ["public", "private"];

function textParameter(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw invalidQuery(`${name} 必须为字符串`, name);
  return value;
}

function searchParameters(params: {
  q: unknown;
  type: unknown;
  tag: unknown;
  limit: unknown;
  cursor: unknown;
  status: unknown;
  visibility: unknown;
}, owner: boolean): OwnerSearchQuery {
  const q = textParameter(params.q, "q")?.trim().normalize("NFC") ?? "";
  if (Array.from(q).length < 1 || Array.from(q).length > 100) throw invalidQuery("q 去除首尾空白后需为 1–100 字", "q");
  const type = textParameter(params.type, "type");
  if (type !== undefined && !RECORD_TYPES.includes(type as RecordType)) throw invalidQuery("type 不在允许列表", "type");
  const rawTags = params.tag === undefined ? [] : Array.isArray(params.tag) ? params.tag : [params.tag];
  if (rawTags.length > 16 || !rawTags.every((tag) => typeof tag === "string" && Array.from(tag).length > 0 && Array.from(tag).length <= 32)) {
    throw invalidQuery("tag 必须为 1–32 字，且最多重复 16 次", "tag");
  }
  const rawLimit = textParameter(params.limit, "limit");
  let limit = 20;
  if (rawLimit !== undefined) {
    if (!/^\d+$/.test(rawLimit)) throw invalidQuery("limit 必须为整数", "limit");
    limit = Number(rawLimit);
    if (limit < 1 || limit > 50) throw invalidQuery("limit 范围为 1–50", "limit");
  }
  const cursor = textParameter(params.cursor, "cursor");
  const status = textParameter(params.status, "status");
  const visibility = textParameter(params.visibility, "visibility");
  if (!owner && (status !== undefined || visibility !== undefined)) {
    throw invalidQuery("公开范围不接受主人过滤参数", status === undefined ? "visibility" : "status");
  }
  if (status !== undefined && !RECORD_STATUSES.includes(status as RecordStatus)) throw invalidQuery("status 不在允许列表", "status");
  if (visibility !== undefined && !VISIBILITIES.includes(visibility as Visibility)) throw invalidQuery("visibility 不在允许列表", "visibility");
  return {
    q,
    ...(type === undefined ? {} : { type: type as RecordType }),
    tags: rawTags as string[],
    limit,
    ...(cursor === undefined ? {} : { cursor }),
    ...(status === undefined ? {} : { status: status as RecordStatus }),
    ...(visibility === undefined ? {} : { visibility: visibility as Visibility }),
  };
}

@Controller()
export class SearchController {
  constructor(
    @Inject(SearchService) private readonly search: SearchService,
    @Inject(OWNER_SEARCH_AUTHORIZATION) private readonly authorization: OwnerSearchAuthorization,
    @Inject(OWNER_SEARCH_SERVICE) private readonly ownerSearch: OwnerSearchService,
  ) {}

  @Get("search")
  async find(
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
    @Query("q") q?: unknown,
    @Query("scope") scope?: unknown,
    @Query("type") type?: unknown,
    @Query("tag") tag?: unknown,
    @Query("limit") limit?: unknown,
    @Query("cursor") cursor?: unknown,
    @Query("status") status?: unknown,
    @Query("visibility") visibility?: unknown,
  ): Promise<ApiSuccess<SearchData>> {
    const normalizedScope = scope ?? "public";
    if (normalizedScope !== "public" && normalizedScope !== "owner") throw invalidQuery("scope 仅支持 public 或 owner", "scope");
    const owner = normalizedScope === "owner";
    const query = searchParameters({ q, type, tag, limit, cursor, status, visibility }, owner);
    response.setHeader("Cache-Control", owner ? "no-store" : "public, max-age=0, must-revalidate");
    const result = owner
      ? await this.searchOwner(request, query)
      : this.search.searchPublic(query as PublicSearchQuery);
    return {
      schemaVersion: API_SCHEMA_VERSION,
      data: { items: result.items, pageInfo: result.pageInfo },
      meta: { requestId: request.requestId, contentRevision: result.contentRevision },
    };
  }

  private async searchOwner(request: RequestWithId, query: OwnerSearchQuery) {
    await this.authorization.authorize(request);
    return this.ownerSearch.search(request, query);
  }
}

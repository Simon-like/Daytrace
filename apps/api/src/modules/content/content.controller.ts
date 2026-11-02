import { Controller, Get, Header, Inject, Optional, Param, Query, Req, Res } from "@nestjs/common";
import {
  API_SCHEMA_VERSION,
  type ApiSuccess,
  type RecordDetail,
  type RecordListData,
} from "@daytrace/contracts";
import type { Response } from "express";
import { authRequired, invalidQuery } from "../../common/api-error";
import type { RequestWithId } from "../../common/request-id.middleware";
import { AssetsService } from "../assets/assets.service";
import { noStore, onlySessionCookie, SessionService } from "../auth";
import { ContentService } from "./content.service";

@Controller()
export class ContentController {
  constructor(
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(AssetsService) private readonly assets: AssetsService,
    @Optional() @Inject(SessionService) private readonly sessions?: SessionService,
  ) {}

  private isOwner(request: RequestWithId): boolean {
    return this.sessions?.resolve(onlySessionCookie(request.headers.cookie)) != null;
  }

  private requireOwner(request: RequestWithId, response: Response): void {
    noStore(response);
    if (!this.isOwner(request)) throw authRequired();
  }

  @Get("health/live")
  @Header("Cache-Control", "no-store")
  live(): { status: string } {
    return { status: "ok" };
  }

  @Get("health/ready")
  @Header("Cache-Control", "no-store")
  ready(): { status: string; contentRevision: string } {
    return { status: "ok", contentRevision: this.content.contentRevision };
  }

  @Get("records")
  @Header("Cache-Control", "public, max-age=0, must-revalidate")
  list(
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
    @Query("scope") scope?: unknown,
    @Query("type") type?: unknown,
    @Query("tag") tag?: unknown,
    @Query("limit") limit?: unknown,
    @Query("cursor") cursor?: unknown,
    @Query("status") status?: unknown,
    @Query("visibility") visibility?: unknown,
  ): ApiSuccess<RecordListData> {
    if (scope === "owner") {
      this.requireOwner(request, response);
      return { schemaVersion: API_SCHEMA_VERSION, data: {
        items: this.content.listOwner().items,
        pageInfo: { hasMore: false, nextCursor: null },
      }, meta: { requestId: request.requestId, contentRevision: this.content.ownerContentRevision } };
    }
    if (scope !== undefined && scope !== "public") throw invalidQuery("scope 仅支持 public", "scope");
    if (status !== undefined || visibility !== undefined) throw invalidQuery("公开范围不接受主人过滤参数", "status");
    if (type !== undefined && (typeof type !== "string" || !["engineering", "recipe", "reflection"].includes(type))) {
      throw invalidQuery("type 不在允许列表", "type");
    }
    const tags = tag === undefined ? [] : Array.isArray(tag) ? tag : [tag];
    if (!tags.every((item) => typeof item === "string" && item.length > 0)) throw invalidQuery("tag 必须为非空文本", "tag");
    let parsedLimit = 20;
    if (limit !== undefined) {
      if (typeof limit !== "string" || !/^\d+$/.test(limit)) throw invalidQuery("limit 必须为整数", "limit");
      parsedLimit = Number(limit);
      if (parsedLimit < 1 || parsedLimit > 50) throw invalidQuery("limit 范围为 1–50", "limit");
    }
    if (cursor !== undefined && typeof cursor !== "string") throw invalidQuery("cursor 必须为字符串", "cursor");
    const result = this.content.listPublic({
      ...(type === undefined ? {} : { type: type as string }),
      tags: tags as string[],
      limit: parsedLimit,
      ...(cursor === undefined ? {} : { cursor }),
    });
    return {
      schemaVersion: API_SCHEMA_VERSION,
      data: {
        items: result.items,
        pageInfo: { hasMore: result.hasMore, nextCursor: result.nextCursor },
      },
      meta: { requestId: request.requestId, contentRevision: this.content.contentRevision },
    };
  }

  @Get("records/:recordId")
  @Header("Cache-Control", "public, max-age=0, must-revalidate")
  detail(
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
    @Param("recordId") recordId: string,
    @Query("scope") scope?: unknown,
  ): ApiSuccess<RecordDetail> {
    if (scope === "owner") this.requireOwner(request, response);
    if (scope !== undefined && scope !== "public" && scope !== "owner") throw invalidQuery("scope 仅支持 public 或 owner", "scope");
    const record = scope === "owner" ? this.content.getOwnerRecord(recordId) : this.content.getPublicRecord(recordId);
    response.setHeader("ETag", `"${scope === "owner" ? this.content.ownerContentRevision : this.content.contentRevision}:${record.metadata.id}:${record.metadata.revision}"`);
    return {
      schemaVersion: API_SCHEMA_VERSION,
      data: record.detail,
      meta: { requestId: request.requestId, contentRevision: scope === "owner" ? this.content.ownerContentRevision : this.content.contentRevision },
    };
  }

  @Get("assets/:assetId")
  async asset(@Param("assetId") assetId: string, @Req() request: RequestWithId, @Res() response: Response): Promise<void> {
    // One asset route for both projections, using ACCESS's confined file reader.
    noStore(response);
    const asset = await this.assets.open(assetId, this.isOwner(request));
    response.setHeader("Content-Type", asset.mediaType);
    response.setHeader("Content-Length", asset.size);
    response.setHeader("Content-Disposition", asset.mediaType.startsWith("image/") ? "inline" : "attachment");
    response.setHeader("X-Content-Type-Options", "nosniff");
    asset.stream.once("error", () => response.destroy());
    asset.stream.pipe(response);
  }
}

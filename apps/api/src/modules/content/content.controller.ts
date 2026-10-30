import { Controller, Get, Header, Inject, Param, Query, Req, Res } from "@nestjs/common";
import {
  API_SCHEMA_VERSION,
  type ApiSuccess,
  type RecordDetail,
  type RecordListData,
} from "@daytrace/contracts";
import type { Response } from "express";
import { authRequired, invalidQuery } from "../../common/api-error";
import type { RequestWithId } from "../../common/request-id.middleware";
import { ContentService } from "./content.service";

@Controller()
export class ContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

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
    @Query("scope") scope?: unknown,
    @Query("type") type?: unknown,
    @Query("tag") tag?: unknown,
    @Query("limit") limit?: unknown,
    @Query("cursor") cursor?: unknown,
    @Query("status") status?: unknown,
    @Query("visibility") visibility?: unknown,
  ): ApiSuccess<RecordListData> {
    if (scope === "owner") throw authRequired();
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
    if (scope === "owner") throw authRequired();
    if (scope !== undefined && scope !== "public") throw invalidQuery("scope 仅支持 public", "scope");
    const record = this.content.getPublicRecord(recordId);
    response.setHeader("ETag", `"${record.metadata.id}:${record.metadata.revision}"`);
    return {
      schemaVersion: API_SCHEMA_VERSION,
      data: record.detail,
      meta: { requestId: request.requestId, contentRevision: this.content.contentRevision },
    };
  }

  @Get("assets/:assetId")
  async asset(@Param("assetId") assetId: string, @Res() response: Response): Promise<void> {
    const asset = await this.content.getPublicAsset(assetId);
    const disposition = asset.mediaType.startsWith("image/") ? "inline" : "attachment";
    response.setHeader("Content-Type", asset.mediaType);
    response.setHeader("Content-Length", asset.bytes.byteLength);
    response.setHeader("Content-Disposition", disposition);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    response.setHeader("ETag", asset.etag);
    response.send(asset.bytes);
  }
}

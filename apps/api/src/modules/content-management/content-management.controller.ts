import { Body, Controller, Get, Inject, Param, Post, Res, UploadedFiles, UseGuards, UseInterceptors, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response, Request } from "express";
import { OwnerGuard, OriginCsrfGuard } from "../auth";
import { ContentManagementService } from "./content-management.service";
import { invalid, MAX_UPLOAD } from "./files";
import type { ImportOptions } from "./normalize";

@Injectable()
class UploadLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const length = request.headers["content-length"];
    if (!length || !/^\d+$/.test(length) || Number(length) > MAX_UPLOAD + 1024 * 1024) throw invalid("上传需要明确长度，总量不能超过 32 MiB");
    return true;
  }
}
@Controller("owner")
@UseGuards(OwnerGuard)
export class ContentManagementController {
  constructor(@Inject(ContentManagementService) private readonly service: ContentManagementService) {}
  @Get("content") list() { return this.service.list(); }
  @Post("imports")
  @UseGuards(OriginCsrfGuard, UploadLimitGuard)
  @UseInterceptors(FilesInterceptor("files", 1000, { preservePath: true, limits: { files: 1000, fileSize: 20 * 1024 * 1024, fields: 4, fieldSize: 64 * 1024 } }))
  async import(@UploadedFiles() files: { originalname: string; buffer: Buffer }[], @Body() body: { paths?: string; type?: string; updateId?: string; expectedRevision?: string }) {
    let paths: unknown;
    try { paths = body.paths ? JSON.parse(body.paths) : files.map(f => f.originalname); } catch { throw invalid("文件路径清单无法读取"); }
    if (!Array.isArray(paths) || paths.length !== files.length || !paths.every(p => typeof p === "string")) throw invalid("文件路径清单与上传文件不符");
    if (body.type && !["engineering", "recipe", "reflection"].includes(body.type)) throw invalid("文章类型无效");
    return this.service.import(files.map((f,i) => ({ path: paths[i] as string, bytes: f.buffer })), {
      ...(body.type ? { type: body.type as NonNullable<ImportOptions["type"]> } : {}),
      ...(body.updateId ? { updateId: body.updateId } : {}),
      ...(body.expectedRevision ? { expectedRevision: Number(body.expectedRevision) } : {}),
    });
  }
  @Get("imports/:id") preview(@Param("id") id: string) { return this.service.preview(id); }
  @Post("imports/:id/discard") @UseGuards(OriginCsrfGuard)
  discard(@Param("id") id: string) { return this.service.discard(id); }
  @Post("imports/:id/commit") @UseGuards(OriginCsrfGuard)
  commit(@Param("id") id: string, @Body() body: { baseRevision?: unknown; status?: unknown; visibility?: unknown }) { return this.service.commit(id, body ?? {}); }
  @Get("imports/:id/assets/:assetId")
  async previewAsset(@Param("id") id: string, @Param("assetId") assetId: string, @Res() response: Response) {
    const asset = await this.service.previewAsset(id, assetId);
    response.setHeader("Content-Type", asset.mediaType); response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Disposition", asset.mediaType.startsWith("image/") ? "inline" : "attachment");
    response.send(asset.bytes);
  }
  @Post("content/:id") @UseGuards(OriginCsrfGuard)
  change(@Param("id") id: string, @Body() body: Record<string, unknown>) { return this.service.change(id, body ?? {}); }
  @Get("content/:id/history") history(@Param("id") id: string) { return this.service.history(id); }
  @Get("content/:id/export")
  async export(@Param("id") id: string, @Res() response: Response) {
    const zip = await this.service.exportRecord(id);
    response.setHeader("Content-Type", "application/zip");
    response.setHeader("Content-Disposition", `attachment; filename="${id}.zip"`);
    response.setHeader("X-Content-Type-Options", "nosniff"); response.send(zip);
  }
}

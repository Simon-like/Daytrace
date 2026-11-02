import { Controller, Get, Inject, Param, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { noStore, onlySessionCookie, SessionService } from "../auth";
import { AssetsService } from "./assets.service";

@Controller("assets")
export class AssetsController {
  constructor(
    @Inject(AssetsService) private readonly assets: AssetsService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  @Get(":assetId")
  async asset(@Param("assetId") assetId: string, @Req() request: Request, @Res() response: Response): Promise<void> {
    const session = this.sessions.resolve(onlySessionCookie(request.headers.cookie));
    const asset = await this.assets.open(assetId, session !== null);
    if (asset.visibility === "private") noStore(response);
    else response.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    response.setHeader("Content-Type", asset.mediaType);
    response.setHeader("Content-Length", asset.size);
    response.setHeader("Content-Disposition", asset.mediaType.startsWith("image/") ? "inline" : "attachment");
    response.setHeader("X-Content-Type-Options", "nosniff");
    asset.stream.once("error", () => response.destroy());
    asset.stream.pipe(response);
  }
}

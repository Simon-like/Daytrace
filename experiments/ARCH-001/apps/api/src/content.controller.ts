import { Controller, Get, Header, Param } from "@nestjs/common";
import type { PublicArticle } from "@daytrace/arch-contracts";
import { ContentService } from "./content.service";

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get("health/live")
  @Header("Cache-Control", "no-store")
  live(): { status: string } {
    return { status: "ok" };
  }

  @Get("health/ready")
  @Header("Cache-Control", "no-store")
  async ready(): Promise<{ status: string }> {
    await this.content.ready();
    return { status: "ok" };
  }

  @Get("records/:slug")
  @Header("Cache-Control", "no-store")
  getRecord(@Param("slug") slug: string): Promise<PublicArticle> {
    return this.content.getPublicRecord(slug);
  }
}

import { Module } from "@nestjs/common";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";

@Module({
  controllers: [ContentController],
  providers: [
    {
      provide: ContentService,
      useFactory: () => new ContentService(process.env.CONTENT_ROOT!),
    },
  ],
})
export class AppModule {}

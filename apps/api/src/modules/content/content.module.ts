import { Module, type DynamicModule } from "@nestjs/common";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";

@Module({})
export class ContentModule {
  static register(contentRoot: string): DynamicModule {
    return {
      module: ContentModule,
      controllers: [ContentController],
      providers: [{ provide: ContentService, useValue: new ContentService(contentRoot) }],
      exports: [ContentService],
    };
  }
}

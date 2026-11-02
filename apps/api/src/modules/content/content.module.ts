import { Module, type DynamicModule } from "@nestjs/common";
import { ContentController } from "./content.controller";
import { AssetsService } from "../assets/assets.service";
import { ContentService } from "./content.service";

@Module({})
export class ContentModule {
  static register(contentRoot: string): DynamicModule {
    return {
      module: ContentModule,
      controllers: [ContentController],
      providers: [
        { provide: ContentService, useValue: new ContentService(contentRoot) },
        { provide: AssetsService, useFactory: (content: ContentService) => new AssetsService(content), inject: [ContentService] },
      ],
      exports: [ContentService],
    };
  }
}

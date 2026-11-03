import { Module, type DynamicModule } from "@nestjs/common";
import { ContentManagementService } from "../content-management/content-management.service";
import { ContentManagementController } from "../content-management/content-management.controller";
import { ContentController } from "./content.controller";
import { AssetsService } from "../assets/assets.service";
import { ContentService } from "./content.service";

@Module({})
export class ContentModule {
  static register(contentRoot: string, management = false): DynamicModule {
    return {
      module: ContentModule,
      controllers: [ContentController, ...(management ? [ContentManagementController] : [])],
      providers: [
        ...(management ? [{ provide: ContentManagementService, useFactory: (content: ContentService) => new ContentManagementService(content), inject: [ContentService] }] : []),
        { provide: ContentService, useValue: new ContentService(contentRoot) },
        { provide: AssetsService, useFactory: (content: ContentService) => new AssetsService(content), inject: [ContentService] },
      ],
      exports: [ContentService],
    };
  }
}

import { Module, type DynamicModule } from "@nestjs/common";
import { ContentModule } from "../content/content.module";
import {
  MissingOwnerSearchAuthorization,
  MissingOwnerSearchService,
  OWNER_SEARCH_AUTHORIZATION,
  OWNER_SEARCH_SERVICE,
} from "./owner-search";
import { PublicSearchIndex } from "./public-search.index";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({})
export class SearchModule {
  static register(contentModule: DynamicModule): DynamicModule {
    return {
      module: SearchModule,
      imports: [contentModule],
      controllers: [SearchController],
      providers: [
        PublicSearchIndex,
        {
          provide: SearchService,
          useFactory: (index: PublicSearchIndex) => new SearchService(index),
          inject: [PublicSearchIndex],
        },
        { provide: OWNER_SEARCH_AUTHORIZATION, useClass: MissingOwnerSearchAuthorization },
        { provide: OWNER_SEARCH_SERVICE, useClass: MissingOwnerSearchService },
      ],
      exports: [SearchService, ContentModule],
    };
  }
}

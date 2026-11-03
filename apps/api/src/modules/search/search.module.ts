import { Module, type DynamicModule } from "@nestjs/common";
import { ContentModule } from "../content/content.module";
import { SessionService } from "../auth/session.service";
import {
  IndexedOwnerSearchService,
  MissingOwnerSearchAuthorization,
  MissingOwnerSearchService,
  OWNER_SEARCH_AUTHORIZATION,
  OWNER_SEARCH_SERVICE,
  SessionOwnerSearchAuthorization,
} from "./owner-search";
import { OwnerSearchIndex } from "./owner-search.index";
import { PublicSearchIndex } from "./public-search.index";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({})
export class SearchModule {
  static register(contentModule: DynamicModule, owner = false): DynamicModule {
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
        ...(owner ? [
          OwnerSearchIndex,
          {
            provide: OWNER_SEARCH_AUTHORIZATION,
            useFactory: (sessions: SessionService) => new SessionOwnerSearchAuthorization(sessions),
            inject: [SessionService],
          },
          {
            provide: OWNER_SEARCH_SERVICE,
            useFactory: (index: OwnerSearchIndex) => new IndexedOwnerSearchService(index),
            inject: [OwnerSearchIndex],
          },
        ] : [
          { provide: OWNER_SEARCH_AUTHORIZATION, useClass: MissingOwnerSearchAuthorization },
          { provide: OWNER_SEARCH_SERVICE, useClass: MissingOwnerSearchService },
        ]),
      ],
      exports: [SearchService, ContentModule],
    };
  }
}

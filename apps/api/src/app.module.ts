import { Module, type DynamicModule } from "@nestjs/common";
import { ContentModule } from "./modules/content/content.module";
import { SearchModule } from "./modules/search/search.module";
import { AuthModule } from "./modules/auth/auth.module";
import { SyntheticOidcProvider, SYNTHETIC_ISSUER } from "./modules/auth/oidc-provider";

@Module({})
export class AppModule {
  static register(contentRoot: string, demoOrigin?: string): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ...(demoOrigin === undefined ? [] : [AuthModule.register({
          environment: "test", publicOrigin: demoOrigin, databasePath: ":memory:",
          ownerIdentities: [{ issuer: SYNTHETIC_ISSUER, subject: "owner" }],
          provider: new SyntheticOidcProvider(),
        })]),
        SearchModule.register(ContentModule.register(contentRoot)),
      ],
    };
  }
}

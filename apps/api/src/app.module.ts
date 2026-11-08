import { Module, type DynamicModule } from "@nestjs/common";
import { ContentModule } from "./modules/content/content.module";
import { SearchModule } from "./modules/search/search.module";
import type { AuthRuntimeOptions } from "./modules/auth/auth.types";
import { AuthModule } from "./modules/auth/auth.module";
import { SyntheticOidcProvider, SYNTHETIC_ISSUER } from "./modules/auth/oidc-provider";

@Module({})
export class AppModule {
  static register(contentRoot: string, demoOrigin?: string, auth?: AuthRuntimeOptions, demoH5Origin?: string): DynamicModule {
    const ownerAccess = demoOrigin !== undefined || auth !== undefined;
    return {
      module: AppModule,
      imports: [
        ...(auth ? [AuthModule.register(auth)] : []),
        ...(demoOrigin === undefined ? [] : [AuthModule.register({
          environment: "test", publicOrigin: demoOrigin, databasePath: ":memory:",
          ...(demoH5Origin ? { additionalWriteOrigins: [demoH5Origin] } : {}),
          ownerIdentities: [{ issuer: SYNTHETIC_ISSUER, subject: "owner" }],
          provider: new SyntheticOidcProvider(),
        })]),
        SearchModule.register(ContentModule.register(contentRoot, ownerAccess), ownerAccess),
      ],
    };
  }
}

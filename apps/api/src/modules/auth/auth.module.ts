import { type DynamicModule, Global, Module } from "@nestjs/common";
import type { Auth0ProtocolClient, AuthRuntimeOptions } from "./auth.types";
import { authOptionsFromEnvironment } from "./auth.config";
import { AuthController, AUTH_PUBLIC_ORIGIN, OIDC_PROVIDER } from "./auth.controller";
import { OwnerGuard } from "./owner.guard";
import { OwnerObjectGuard } from "./owner-object.guard";
import { OwnerPolicy } from "./owner-policy";
import { SessionService } from "./session.service";
import { SqliteSessionStore } from "./sqlite-session.store";
import { OriginCsrfGuard, PUBLIC_ORIGIN } from "./write-protection.guard";

@Global()
@Module({})
export class AuthModule {
  static register(options: AuthRuntimeOptions): DynamicModule {
    if (options.provider.kind === "synthetic-test" && options.environment !== "test") {
      throw new Error("synthetic authentication is restricted to tests");
    }
    if (options.environment === "production" && (!options.publicOrigin.startsWith("https:") || options.databasePath === ":memory:")) {
      throw new Error("production authentication requires HTTPS and persistent sessions");
    }
    if (options.environment !== "test" && options.additionalWriteOrigins?.length) throw new Error("additional write origins are restricted to isolated tests");
    const owners = new OwnerPolicy(options.ownerIdentities);
    const store = new SqliteSessionStore(options.databasePath);
    const sessions = new SessionService(store, owners, {
      ...(options.now === undefined ? {} : { now: options.now }),
      ...(options.idleTtlMs === undefined ? {} : { idleTtlMs: options.idleTtlMs }),
      ...(options.absoluteTtlMs === undefined ? {} : { absoluteTtlMs: options.absoluteTtlMs }),
      ...(options.loginTtlMs === undefined ? {} : { loginTtlMs: options.loginTtlMs }),
    });
    return {
      module: AuthModule,
      controllers: [AuthController],
      providers: [
        { provide: OwnerPolicy, useValue: owners },
        { provide: SqliteSessionStore, useValue: store },
        { provide: SessionService, useValue: sessions },
        { provide: OIDC_PROVIDER, useValue: options.provider },
        { provide: PUBLIC_ORIGIN, useValue: [options.publicOrigin, ...(options.additionalWriteOrigins ?? [])] },
        { provide: AUTH_PUBLIC_ORIGIN, useValue: options.publicOrigin },
        OwnerGuard,
        OwnerObjectGuard,
        OriginCsrfGuard,
      ],
      exports: [OwnerPolicy, SessionService, OwnerGuard, OwnerObjectGuard, OriginCsrfGuard, PUBLIC_ORIGIN],
    };
  }

  static fromEnvironment(
    env: Readonly<Record<string, string | undefined>>,
    auth0Client?: Auth0ProtocolClient,
  ): DynamicModule {
    return AuthModule.register(authOptionsFromEnvironment(env, auth0Client));
  }
}

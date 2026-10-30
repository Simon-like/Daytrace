import { createHash, randomBytes } from "node:crypto";
import type {
  Auth0Configuration,
  Auth0ProtocolClient,
  AuthorizationRequest,
  LoginTransaction,
  OidcProvider,
  VerifiedIdentity,
} from "./auth.types";

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export class Auth0OidcProvider implements OidcProvider {
  readonly kind = "auth0" as const;

  constructor(
    private readonly configuration: Auth0Configuration,
    private readonly client: Auth0ProtocolClient,
  ) {}

  authorizationUrl(request: AuthorizationRequest): Promise<URL> | URL {
    return this.client.authorizationUrl(this.configuration, request);
  }

  verifyCallback(
    input: { readonly code: string; readonly state: string },
    transaction: LoginTransaction,
  ): Promise<VerifiedIdentity> {
    return this.client.verifyCallback(this.configuration, input, transaction);
  }
}

export const SYNTHETIC_ISSUER = "https://synthetic.invalid/";

export class SyntheticOidcProvider implements OidcProvider {
  readonly kind = "synthetic-test" as const;

  authorizationUrl(request: AuthorizationRequest): URL {
    const callback = new URL(request.redirectUri);
    callback.searchParams.set("code", "synthetic-owner-code");
    callback.searchParams.set("state", request.state);
    return callback;
  }

  async verifyCallback(
    input: { readonly code: string; readonly state: string },
    transaction: LoginTransaction,
  ): Promise<VerifiedIdentity> {
    if (input.state !== transaction.state) throw new Error("synthetic state mismatch");
    if (input.code === "synthetic-owner-code") {
      return { issuer: SYNTHETIC_ISSUER, subject: "owner", authTime: Math.floor(Date.now() / 1000) };
    }
    if (input.code === "synthetic-non-owner-code") {
      return { issuer: SYNTHETIC_ISSUER, subject: "not-owner", authTime: Math.floor(Date.now() / 1000) };
    }
    throw new Error("unknown synthetic code");
  }
}

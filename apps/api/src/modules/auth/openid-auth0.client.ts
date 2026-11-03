import type * as Openid from "openid-client";
import type {
  Auth0Configuration,
  Auth0ProtocolClient,
  AuthorizationRequest,
  LoginTransaction,
  VerifiedIdentity,
} from "./auth.types";

export interface OpenidOperations {
  readonly discovery: typeof Openid.discovery;
  readonly buildAuthorizationUrl: typeof Openid.buildAuthorizationUrl;
  readonly authorizationCodeGrant: typeof Openid.authorizationCodeGrant;
}

/** Auth0 protocol adapter. Discovery and token validation stay inside openid-client. */
export class OpenidAuth0Client implements Auth0ProtocolClient {
  private readonly operations: Promise<OpenidOperations>;
  private discovered: Promise<Openid.Configuration> | undefined;

  constructor(operations: OpenidOperations | Promise<OpenidOperations> = import("openid-client")) {
    this.operations = Promise.resolve(operations);
  }

  async authorizationUrl(configuration: Auth0Configuration, request: AuthorizationRequest): Promise<URL> {
    const [operations, discovered] = await Promise.all([this.operations, this.configuration(configuration)]);
    return operations.buildAuthorizationUrl(discovered, {
      redirect_uri: request.redirectUri,
      scope: "openid",
      state: request.state,
      nonce: request.nonce,
      code_challenge: request.codeChallenge,
      code_challenge_method: "S256",
    });
  }

  async verifyCallback(
    configuration: Auth0Configuration,
    input: { readonly code: string; readonly state: string },
    transaction: LoginTransaction,
  ): Promise<VerifiedIdentity> {
    const [operations, discovered] = await Promise.all([this.operations, this.configuration(configuration)]);
    const callback = new URL(configuration.redirectUri);
    callback.searchParams.set("code", input.code);
    callback.searchParams.set("state", input.state);
    const tokens = await operations.authorizationCodeGrant(discovered, callback, {
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      pkceCodeVerifier: transaction.codeVerifier,
    });
    const claims = tokens.claims();
    if (
      claims === undefined || typeof claims.sub !== "string" || claims.sub.length === 0 || claims.sub.length > 512 ||
      typeof claims.iss !== "string" || claims.iss.length === 0 ||
      typeof claims.auth_time !== "number" || !Number.isSafeInteger(claims.auth_time) || claims.auth_time < 0
    ) {
      throw new Error("ID token claims are invalid");
    }
    return { issuer: claims.iss, subject: claims.sub, authTime: claims.auth_time };
  }

  private async configuration(configuration: Auth0Configuration): Promise<Openid.Configuration> {
    if (this.discovered === undefined) {
      const operations = await this.operations;
      this.discovered = operations.discovery(
        new URL(configuration.issuer),
        configuration.clientId,
        configuration.clientSecret,
      ).catch((error: unknown) => {
        this.discovered = undefined;
        throw error;
      });
    }
    return this.discovered;
  }
}

export interface OwnerIdentity {
  readonly issuer: string;
  readonly subject: string;
}

export interface VerifiedIdentity extends OwnerIdentity {
  readonly authTime: number;
}

export interface AuthorizationRequest {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly redirectUri: string;
}

export interface LoginTransaction {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly returnTo: string;
}

export interface OidcProvider {
  readonly kind: "auth0" | "synthetic-test";
  authorizationUrl(request: AuthorizationRequest): Promise<URL> | URL;
  verifyCallback(
    input: { readonly code: string; readonly state: string },
    transaction: LoginTransaction,
  ): Promise<VerifiedIdentity>;
}

export interface Auth0ProtocolClient {
  authorizationUrl(configuration: Auth0Configuration, request: AuthorizationRequest): Promise<URL> | URL;
  verifyCallback(
    configuration: Auth0Configuration,
    input: { readonly code: string; readonly state: string },
    transaction: LoginTransaction,
  ): Promise<VerifiedIdentity>;
}

export interface Auth0Configuration {
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
}

export interface AuthRuntimeOptions {
  readonly environment: "test" | "development" | "production";
  readonly publicOrigin: string;
  readonly databasePath: string;
  readonly ownerIdentities: readonly OwnerIdentity[];
  readonly provider: OidcProvider;
  readonly now?: () => number;
  readonly idleTtlMs?: number;
  readonly absoluteTtlMs?: number;
  readonly loginTtlMs?: number;
}

export interface OwnerSession {
  readonly tokenHash: string;
  readonly identity: OwnerIdentity;
  readonly csrfHash: string | null;
  readonly authTime: number;
}

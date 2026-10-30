import { isAbsolute } from "node:path";
import type {
  Auth0ProtocolClient,
  AuthRuntimeOptions,
  OwnerIdentity,
} from "./auth.types";
import { Auth0OidcProvider, SyntheticOidcProvider } from "./oidc-provider";

type Environment = Readonly<Record<string, string | undefined>>;

function required(env: Environment, name: string): string {
  const value = env[name];
  if (value === undefined || value.trim() === "" || value !== value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function httpsOrigin(value: string, name: string, allowHttp: boolean): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) origin`);
  }
  if (
    (!allowHttp && url.protocol !== "https:") ||
    (allowHttp && url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" || url.password !== "" || url.pathname !== "/" && url.pathname !== "" ||
    url.search !== "" || url.hash !== ""
  ) {
    throw new Error(`${name} must contain only a trusted origin`);
  }
  return url.origin;
}

function httpsIssuer(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTPS issuer`);
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") {
    throw new Error(`${name} must be an HTTPS issuer without credentials or query`);
  }
  return value;
}

export function parseOwnerIdentities(value: string): readonly OwnerIdentity[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("OWNER_IDENTITIES must be a JSON array");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("OWNER_IDENTITIES must not be empty");
  const identities = parsed.map((entry): OwnerIdentity => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error("OWNER_IDENTITIES entries must be objects");
    }
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.issuer !== "string" || typeof candidate.subject !== "string") {
      throw new Error("OWNER_IDENTITIES requires issuer and subject");
    }
    const subject = candidate.subject;
    if (
      subject === "" || subject === "*" || subject.length > 512 ||
      Array.from(subject).some((character) => character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f)
    ) {
      throw new Error("OWNER_IDENTITIES subject is invalid");
    }
    return { issuer: httpsIssuer(candidate.issuer, "OWNER_IDENTITIES issuer"), subject };
  });
  const unique = new Set(identities.map((identity) => JSON.stringify([identity.issuer, identity.subject])));
  if (unique.size !== identities.length) throw new Error("OWNER_IDENTITIES contains duplicates");
  return identities;
}

export function authOptionsFromEnvironment(
  env: Environment,
  auth0Client?: Auth0ProtocolClient,
): AuthRuntimeOptions {
  const nodeEnvironment = env.NODE_ENV ?? "development";
  if (!["test", "development", "production"].includes(nodeEnvironment)) {
    throw new Error("NODE_ENV must be test, development, or production");
  }
  const environment = nodeEnvironment as AuthRuntimeOptions["environment"];
  const production = environment === "production";
  const providerName = required(env, "AUTH_PROVIDER");
  const publicOrigin = httpsOrigin(required(env, "PUBLIC_ORIGIN"), "PUBLIC_ORIGIN", !production);
  const databasePath = required(env, "SESSION_DATABASE_PATH");
  if (production && (!isAbsolute(databasePath) || databasePath === ":memory:")) {
    throw new Error("SESSION_DATABASE_PATH must be an absolute persistent file in production");
  }
  const ownerIdentities = parseOwnerIdentities(required(env, "OWNER_IDENTITIES"));

  if (providerName === "synthetic") {
    if (environment !== "test" || env.ALLOW_SYNTHETIC_AUTH !== "true") {
      throw new Error("synthetic authentication is restricted to explicit tests");
    }
    return { environment, publicOrigin, databasePath, ownerIdentities, provider: new SyntheticOidcProvider() };
  }
  if (providerName !== "auth0") throw new Error("AUTH_PROVIDER must be auth0");
  const configuration = {
    issuer: httpsIssuer(required(env, "AUTH0_ISSUER"), "AUTH0_ISSUER"),
    clientId: required(env, "AUTH0_CLIENT_ID"),
    clientSecret: required(env, "AUTH0_CLIENT_SECRET"),
    redirectUri: `${publicOrigin}/api/v1/auth/callback`,
  };
  if (auth0Client === undefined) throw new Error("AUTH0_OIDC_CLIENT is not configured");
  return {
    environment,
    publicOrigin,
    databasePath,
    ownerIdentities,
    provider: new Auth0OidcProvider(configuration, auth0Client),
  };
}

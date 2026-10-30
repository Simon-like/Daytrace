export type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export interface ApiRuntimeConfig {
  readonly host: string;
  readonly port: number;
  readonly contentRoot: string;
}

export interface SiteRuntimeConfig {
  readonly apiInternalOrigin: string;
}

function requiredText(value: string | undefined, name: string): string {
  if (value === undefined || value.trim() === "" || value !== value.trim()) {
    throw new Error(`${name} must be non-empty text without surrounding whitespace`);
  }
  return value;
}

function parsePort(value: string | undefined, name: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be an integer TCP port`);
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be between 1 and 65535`);
  }
  return port;
}

export function parseApiRuntimeConfig(
  env: RuntimeEnvironment,
  defaultContentRoot: string,
): ApiRuntimeConfig {
  return {
    host: requiredText(env.API_HOST ?? "127.0.0.1", "API_HOST"),
    port: parsePort(env.API_PORT, "API_PORT", 3001),
    contentRoot: requiredText(env.CONTENT_ROOT ?? defaultContentRoot, "CONTENT_ROOT"),
  };
}

export function parseSiteRuntimeConfig(env: RuntimeEnvironment): SiteRuntimeConfig {
  const input = requiredText(env.API_INTERNAL_ORIGIN, "API_INTERNAL_ORIGIN");
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("API_INTERNAL_ORIGIN must be an absolute HTTP(S) origin");
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== "" ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("API_INTERNAL_ORIGIN must contain only an HTTP(S) origin without credentials");
  }
  return { apiInternalOrigin: url.origin };
}

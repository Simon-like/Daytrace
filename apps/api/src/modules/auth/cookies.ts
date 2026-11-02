export const SESSION_COOKIE = "__Host-daytrace_session";
export const LOGIN_COOKIE = "__Host-daytrace_login";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function cookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return cookie(SESSION_COOKIE, token, maxAgeSeconds);
}

export function loginCookie(token: string): string {
  return cookie(LOGIN_COOKIE, token, 600);
}

export function clearCookie(name: typeof SESSION_COOKIE | typeof LOGIN_COOKIE): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (header === undefined) return null;
  const values = header.split(";").flatMap((part) => {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) return [];
    return [part.slice(separator + 1).trim()];
  });
  if (values.length !== 1 || !TOKEN_PATTERN.test(values[0] ?? "")) return null;
  return values[0] ?? null;
}

export function onlySessionCookie(header: string | undefined): string | null {
  return readCookie(header, SESSION_COOKIE);
}

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const COOKIE_NAME = '__Host-daytrace_session';
export const EXPECTED_ORIGIN = 'https://daytrace.test';
export const PRIVATE_CANARY = 'DAYTRACE_SYNTHETIC_PRIVATE_CANARY_9F27C1';
export const OUTSIDE_CANARY = 'DAYTRACE_SYNTHETIC_OUTSIDE_CANARY_61B4E0';

const OWNER_KEY = 'https://synthetic-idp.invalid/|synthetic-owner-001';
const IDLE_TTL_SECONDS = 30 * 60;
const ABSOLUTE_TTL_SECONDS = 8 * 60 * 60;
const ASSET_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const SESSION_TOKEN = /^[A-Za-z0-9_-]{43}$/;

interface Session {
  tokenHash: string;
  csrfHash: string;
  ownerKey: string;
  absoluteExpiresAt: number;
  idleExpiresAt: number;
  revoked: boolean;
}

interface RecordItem {
  visibility?: 'public' | 'private';
  status: 'published' | 'draft';
  title: string;
  body: string;
}

interface ForwardObservation {
  path: string;
  cookieNames: string[];
  hasAuthorization: boolean;
  hasForwardedHost: boolean;
  cache: string;
}

export interface Fixture {
  nestOrigin: string;
  nextOrigin: string;
  forwarded: ForwardObservation[];
  setNow: (value: number) => void;
  close: () => Promise<void>;
}

const records: Record<string, RecordItem> = {
  'public-note': {
    visibility: 'public',
    status: 'published',
    title: 'Synthetic public note',
    body: 'A synthetic public record used for access-boundary tests.',
  },
  'private-note': {
    visibility: 'private',
    status: 'published',
    title: 'Synthetic private title',
    body: `Synthetic private body with ${PRIVATE_CANARY}`,
  },
  'missing-visibility': {
    status: 'published',
    title: 'Quarantined synthetic record',
    body: 'This record has no visibility and must not enter either search index.',
  },
};

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function token(): string {
  return randomBytes(32).toString('base64url');
}

function requestId(): string {
  return randomBytes(8).toString('hex');
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) result[name] = value;
  }
  return result;
}

function privateHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    Vary: 'Cookie',
    'X-Content-Type-Options': 'nosniff',
  };
}

function publicHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'public, max-age=60',
    'X-Content-Type-Options': 'nosniff',
  };
}

function send(
  response: ServerResponse,
  status: number,
  body: string | Buffer,
  contentType: string,
  headers: Record<string, string>,
  extraHeaders: Record<string, string> = {},
): void {
  response.writeHead(status, {
    'Content-Type': contentType,
    ...headers,
    ...extraHeaders,
  });
  response.end(body);
}

function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown,
  visibility: 'public' | 'private',
  extraHeaders: Record<string, string> = {},
): void {
  send(
    response,
    status,
    JSON.stringify(value),
    'application/json; charset=utf-8',
    visibility === 'public' ? publicHeaders() : privateHeaders(),
    extraHeaders,
  );
}

function sendError(
  response: ServerResponse,
  status: number,
  code: string,
  visibility: 'public' | 'private' = 'private',
): void {
  const id = requestId();
  sendJson(response, status, { error: { code, requestId: id } }, visibility, {
    'X-Request-Id': id,
  });
}

function sessionCookie(value: string): string {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ABSOLUTE_TTL_SECONDS}`;
}

function clearedSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function equalHash(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

class MemorySessionStore {
  private sessions = new Map<string, Session>();

  create(ownerKey: string, now: number): { token: string; csrf: string } {
    const sessionToken = token();
    const csrf = token();
    const absoluteExpiresAt = now + ABSOLUTE_TTL_SECONDS;
    const tokenHash = hash(sessionToken);
    this.sessions.set(tokenHash, {
      tokenHash,
      csrfHash: hash(csrf),
      ownerKey,
      absoluteExpiresAt,
      idleExpiresAt: Math.min(now + IDLE_TTL_SECONDS, absoluteExpiresAt),
      revoked: false,
    });
    return { token: sessionToken, csrf };
  }

  resolve(rawToken: string | undefined, now: number): Session | null {
    if (!rawToken || !SESSION_TOKEN.test(rawToken)) return null;
    const session = this.sessions.get(hash(rawToken));
    if (!session || session.revoked || session.ownerKey !== OWNER_KEY) return null;
    if (now >= session.idleExpiresAt || now >= session.absoluteExpiresAt) {
      this.sessions.delete(session.tokenHash);
      return null;
    }
    session.idleExpiresAt = Math.min(now + IDLE_TTL_SECONDS, session.absoluteExpiresAt);
    return session;
  }

  issueCsrf(session: Session): string {
    const csrf = token();
    session.csrfHash = hash(csrf);
    return csrf;
  }

  revoke(rawToken: string | undefined): void {
    if (rawToken) this.sessions.delete(hash(rawToken));
  }

  revokeAll(): void {
    this.sessions.clear();
  }
}

async function jsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    length += buffer.length;
    if (length > 4096) throw new Error('body too large');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function validMutation(request: IncomingMessage): boolean {
  const fetchSite = request.headers['sec-fetch-site'];
  return request.headers.origin === EXPECTED_ORIGIN &&
    (!fetchSite || fetchSite === 'same-origin');
}

function validCsrf(session: Session, request: IncomingMessage): boolean {
  const supplied = request.headers['x-csrf-token'];
  return typeof supplied === 'string' && equalHash(hash(supplied), session.csrfHash);
}

function searchable(visibility: 'public' | 'owner'): RecordItem[] {
  return Object.values(records).filter((record) => {
    if (record.status !== 'published' || !record.visibility) return false;
    return visibility === 'owner'
      ? record.visibility === 'public' || record.visibility === 'private'
      : record.visibility === 'public';
  });
}

function search(visibility: 'public' | 'owner', query: string) {
  const normalized = query.toLocaleLowerCase('en-US');
  return searchable(visibility)
    .filter((record) => `${record.title}\n${record.body}`.toLocaleLowerCase('en-US').includes(normalized))
    .map((record) => ({ title: record.title, body: record.body, visibility: record.visibility }));
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function html(title: string, body: string): string {
  return `<!doctype html><html><head><title>${escapeHtml(title)}</title></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></main></body></html>`;
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing test port');
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
}

export async function startFixture(): Promise<Fixture> {
  let now = 1_800_000_000;
  const store = new MemorySessionStore();
  const forwarded: ForwardObservation[] = [];
  const publicCache = new Map<string, { body: string; contentType: string }>();
  const assetRoot = realpathSync(fileURLToPath(new URL('../fixtures/assets', import.meta.url)));

  function readAsset(id: string): Buffer | null {
    if (!ASSET_ID.test(id)) return null;
    const fileName = id === 'public-asset' ? 'public.txt' : id === 'private-asset' ? 'private.txt' : null;
    if (!fileName) return null;
    try {
      const candidate = resolve(assetRoot, fileName);
      const real = realpathSync(candidate);
      if (real !== assetRoot && !real.startsWith(`${assetRoot}${sep}`)) return null;
      return readFileSync(real);
    } catch {
      return null;
    }
  }

  const nest = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://nest.internal');
      const path = url.pathname;
      const cookies = parseCookies(request.headers.cookie);
      const rawSession = cookies[COOKIE_NAME];
      const session = store.resolve(rawSession, now);

      if (request.method === 'POST' && path === '/__synthetic/login') {
        if (!validMutation(request)) return sendError(response, 403, 'CSRF_REJECTED');
        const identity = await jsonBody(request) as { issuer?: string; subject?: string };
        const key = `${identity.issuer}|${identity.subject}`;
        if (key !== OWNER_KEY) return sendError(response, 403, 'OWNER_REQUIRED');
        store.revoke(rawSession);
        const created = store.create(key, now);
        sendJson(response, 200, { authenticated: true }, 'private', {
          'Set-Cookie': sessionCookie(created.token),
        });
        return;
      }

      if (request.method === 'GET' && path === '/api/v1/auth/csrf') {
        if (!session) return sendError(response, 401, 'AUTH_REQUIRED');
        sendJson(response, 200, { csrfToken: store.issueCsrf(session) }, 'private');
        return;
      }

      if (request.method === 'POST' && path === '/api/v1/auth/logout') {
        if (!validMutation(request)) return sendError(response, 403, 'CSRF_REJECTED');
        if (!session) return sendError(response, 401, 'AUTH_REQUIRED');
        if (!validCsrf(session, request)) return sendError(response, 403, 'CSRF_REJECTED');
        store.revoke(rawSession);
        sendJson(response, 200, { authenticated: false }, 'private', {
          'Set-Cookie': clearedSessionCookie(),
        });
        return;
      }

      if (request.method === 'POST' && path === '/api/v1/auth/revoke-all') {
        if (!validMutation(request)) return sendError(response, 403, 'CSRF_REJECTED');
        if (!session) return sendError(response, 401, 'AUTH_REQUIRED');
        if (!validCsrf(session, request)) return sendError(response, 403, 'CSRF_REJECTED');
        store.revokeAll();
        sendJson(response, 200, { authenticated: false }, 'private', {
          'Set-Cookie': clearedSessionCookie(),
        });
        return;
      }

      if (request.method === 'GET' && path === '/api/v1/search') {
        const query = url.searchParams.get('q') ?? '';
        if (query === 'fail') return sendError(response, 500, 'SEARCH_UNAVAILABLE', 'public');
        sendJson(response, 200, { results: search('public', query) }, 'public');
        return;
      }

      if (request.method === 'GET' && path === '/api/v1/owner/search') {
        if (!session) return sendError(response, 401, 'AUTH_REQUIRED');
        const query = url.searchParams.get('q') ?? '';
        if (query === 'fail') return sendError(response, 500, 'SEARCH_UNAVAILABLE');
        sendJson(response, 200, { results: search('owner', query) }, 'private');
        return;
      }

      if (request.method === 'GET' && path.startsWith('/api/v1/records/')) {
        const id = path.slice('/api/v1/records/'.length);
        const record = records[id];
        if (!record || !record.visibility || record.status !== 'published') {
          return sendError(response, 404, 'NOT_FOUND');
        }
        if (record.visibility === 'private' && !session) return sendError(response, 404, 'NOT_FOUND');
        if (url.searchParams.get('fail') === '1') return sendError(response, 500, 'INTERNAL_ERROR');
        sendJson(response, 200, record, record.visibility === 'public' ? 'public' : 'private');
        return;
      }

      if (request.method === 'GET' && path.startsWith('/api/v1/assets/')) {
        const id = path.slice('/api/v1/assets/'.length);
        const isPublic = id === 'public-asset';
        const isPrivate = id === 'private-asset';
        if (!isPublic && !isPrivate) return sendError(response, 404, 'NOT_FOUND');
        if (isPrivate && !session) return sendError(response, 404, 'NOT_FOUND');
        const asset = readAsset(id);
        if (!asset) return sendError(response, 404, 'NOT_FOUND');
        send(response, 200, asset, 'text/plain; charset=utf-8', isPublic ? publicHeaders() : privateHeaders());
        return;
      }

      sendError(response, 404, 'NOT_FOUND');
    } catch {
      sendError(response, 500, 'INTERNAL_ERROR');
    }
  });

  const nestOrigin = await listen(nest);

  async function fetchNest(
    path: string,
    incoming: IncomingMessage,
    isPrivate: boolean,
  ): Promise<Response> {
    const target = new URL(path, nestOrigin);
    if (target.origin !== nestOrigin || !target.pathname.startsWith('/api/v1/')) {
      throw new Error('invalid fixed upstream');
    }
    const cookieNames = Object.keys(parseCookies(incoming.headers.cookie));
    const rawSession = parseCookies(incoming.headers.cookie)[COOKIE_NAME];
    forwarded.push({
      path: target.pathname,
      cookieNames: isPrivate && rawSession ? [COOKIE_NAME] : [],
      hasAuthorization: false,
      hasForwardedHost: false,
      cache: isPrivate ? 'no-store' : 'default',
    });
    return fetch(target, {
      headers: isPrivate && rawSession ? { Cookie: `${COOKIE_NAME}=${rawSession}` } : {},
      cache: isPrivate ? 'no-store' : 'default',
      redirect: 'manual',
      signal: AbortSignal.timeout(2000),
    });
  }

  const next = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://next.internal');
      const path = url.pathname;
      const isPublicRoute = request.method === 'GET' &&
        (path === '/records/public-note' || path === '/search');

      if (isPublicRoute) {
        const cacheKey = `${path}?${url.searchParams.toString()}`;
        const cached = publicCache.get(cacheKey);
        if (cached) {
          send(response, 200, cached.body, cached.contentType, publicHeaders(), { 'X-Next-Cache': 'HIT' });
          return;
        }
        const upstreamPath = path === '/search'
          ? `/api/v1/search?q=${encodeURIComponent(url.searchParams.get('q') ?? '')}`
          : '/api/v1/records/public-note';
        const upstream = await fetchNest(upstreamPath, request, false);
        const data = await upstream.json() as RecordItem & { results?: unknown[] };
        const body = path === '/search' ? JSON.stringify(data) : html(data.title, data.body);
        const contentType = path === '/search' ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8';
        if (upstream.ok) publicCache.set(cacheKey, { body, contentType });
        send(response, upstream.status, body, contentType,
          upstream.ok ? publicHeaders() : privateHeaders(),
          { 'X-Next-Cache': upstream.ok ? 'MISS' : 'BYPASS' });
        return;
      }

      if (request.method === 'GET' && path === '/owner/records/private-note') {
        const upstream = await fetchNest('/api/v1/records/private-note', request, true);
        if (!upstream.ok) {
          send(response, upstream.status, html('Unavailable', 'The requested page is unavailable.'),
            'text/html; charset=utf-8', privateHeaders(), { 'X-Next-Cache': 'BYPASS' });
          return;
        }
        const record = await upstream.json() as RecordItem;
        send(response, 200, html(record.title, record.body), 'text/html; charset=utf-8', privateHeaders(), {
          'X-Next-Cache': 'BYPASS',
        });
        return;
      }

      if (request.method === 'GET' && path === '/owner/search') {
        const upstream = await fetchNest(
          `/api/v1/owner/search?q=${encodeURIComponent(url.searchParams.get('q') ?? '')}`,
          request,
          true,
        );
        const body = await upstream.text();
        send(response, upstream.status, upstream.ok ? body : JSON.stringify({ error: { code: 'UNAVAILABLE' } }),
          'application/json; charset=utf-8', privateHeaders(), { 'X-Next-Cache': 'BYPASS' });
        return;
      }

      send(response, 404, html('Not found', 'The requested page is unavailable.'),
        'text/html; charset=utf-8', privateHeaders());
    } catch {
      send(response, 500, html('Unavailable', 'The requested page is unavailable.'),
        'text/html; charset=utf-8', privateHeaders());
    }
  });

  const nextOrigin = await listen(next);
  return {
    nestOrigin,
    nextOrigin,
    forwarded,
    setNow: (value: number) => { now = value; },
    close: async () => {
      await Promise.all([closeServer(next), closeServer(nest)]);
    },
  };
}

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  COOKIE_NAME,
  EXPECTED_ORIGIN,
  OUTSIDE_CANARY,
  PRIVATE_CANARY,
  startFixture,
  type Fixture,
} from '../src/fixture.ts';

let fixture: Fixture;
let clock = 1_800_000_000;

before(async () => {
  fixture = await startFixture();
});

after(async () => {
  await fixture.close();
});

function advance(seconds: number): void {
  clock += seconds;
  fixture.setNow(clock);
}

async function login(existingCookie?: string): Promise<string> {
  const response = await fetch(`${fixture.nestOrigin}/__synthetic/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: EXPECTED_ORIGIN,
      'Sec-Fetch-Site': 'same-origin',
      ...(existingCookie ? { Cookie: existingCookie } : {}),
    },
    body: JSON.stringify({
      issuer: 'https://synthetic-idp.invalid/',
      subject: 'synthetic-owner-001',
    }),
  });
  assert.equal(response.status, 200);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie);
  return setCookie.split(';', 1)[0];
}

async function csrf(cookie: string): Promise<string> {
  const response = await fetch(`${fixture.nestOrigin}/api/v1/auth/csrf`, {
    headers: { Cookie: cookie },
  });
  assert.equal(response.status, 200);
  const body = await response.json() as { csrfToken: string };
  return body.csrfToken;
}

async function mutate(path: string, cookie: string, csrfToken?: string, origin = EXPECTED_ORIGIN) {
  return fetch(`${fixture.nestOrigin}${path}`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      Origin: origin,
      'Sec-Fetch-Site': origin === EXPECTED_ORIGIN ? 'same-origin' : 'cross-site',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
}

function assertNoPrivateLeak(body: string): void {
  assert.equal(body.includes(PRIVATE_CANARY), false);
  assert.equal(body.includes('Synthetic private title'), false);
}

function assertNoStore(response: Response): void {
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
}

test('public content is available without identity and never contains private canary', async () => {
  const response = await fetch(`${fixture.nextOrigin}/records/public-note`);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control') ?? '', /public/);
  assertNoPrivateLeak(body);
});

test('guest cannot read private record through Nest or Next', async () => {
  for (const url of [
    `${fixture.nestOrigin}/api/v1/records/private-note`,
    `${fixture.nextOrigin}/owner/records/private-note`,
  ]) {
    const response = await fetch(url);
    const body = await response.text();
    assert.equal(response.status, 404);
    assertNoPrivateLeak(body);
    assertNoStore(response);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
});

test('non-owner synthetic identity is rejected without a session cookie', async () => {
  const response = await fetch(`${fixture.nestOrigin}/__synthetic/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: EXPECTED_ORIGIN },
    body: JSON.stringify({
      issuer: 'https://synthetic-idp.invalid/',
      subject: 'synthetic-not-owner-002',
    }),
  });
  await response.text();
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('set-cookie'), null);
  assertNoStore(response);
});

test('owner cookie uses host-only HttpOnly Secure SameSite=Lax attributes', async () => {
  const response = await fetch(`${fixture.nestOrigin}/__synthetic/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: EXPECTED_ORIGIN },
    body: JSON.stringify({
      issuer: 'https://synthetic-idp.invalid/',
      subject: 'synthetic-owner-001',
    }),
  });
  await response.text();
  const setCookie = response.headers.get('set-cookie') ?? '';
  assert.ok(setCookie.startsWith(`${COOKIE_NAME}=`));
  assert.match(setCookie, /Path=\//);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Max-Age=28800/);
  assert.equal(/Domain=/i.test(setCookie), false);
});

test('owner positive control can read private SSR without cookie disclosure', async () => {
  const cookie = await login();
  const response = await fetch(`${fixture.nextOrigin}/owner/records/private-note`, {
    headers: { Cookie: cookie },
  });
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(body.includes(PRIVATE_CANARY), true);
  assert.equal(body.includes(cookie), false);
  assert.equal(body.includes(cookie.slice(cookie.indexOf('=') + 1)), false);
  assertNoStore(response);
  assert.equal(response.headers.get('x-next-cache'), 'BYPASS');
});

test('Next forwards only the session cookie to fixed Nest upstream', async () => {
  const cookie = await login();
  const beforeCount = fixture.forwarded.length;
  const response = await fetch(`${fixture.nextOrigin}/owner/records/private-note`, {
    headers: {
      Cookie: `${cookie}; unrelated=synthetic; preference=public`,
      Authorization: 'Bearer synthetic-must-not-forward',
      'X-Forwarded-Host': 'attacker.invalid',
    },
  });
  await response.text();
  assert.equal(response.status, 200);
  const observation = fixture.forwarded[beforeCount];
  assert.deepEqual(observation.cookieNames, [COOKIE_NAME]);
  assert.equal(observation.hasAuthorization, false);
  assert.equal(observation.hasForwardedHost, false);
  assert.equal(observation.cache, 'no-store');
  assert.equal(observation.path, '/api/v1/records/private-note');
});

test('idle expiration blocks owner search and private object', async () => {
  const cookie = await login();
  advance(30 * 60 + 1);
  const searchResponse = await fetch(`${fixture.nextOrigin}/owner/search?q=private`, {
    headers: { Cookie: cookie },
  });
  const objectResponse = await fetch(`${fixture.nestOrigin}/api/v1/records/private-note`, {
    headers: { Cookie: cookie },
  });
  const [searchBody, objectBody] = await Promise.all([searchResponse.text(), objectResponse.text()]);
  assert.equal(searchResponse.status, 401);
  assert.equal(objectResponse.status, 404);
  assertNoPrivateLeak(searchBody);
  assertNoPrivateLeak(objectBody);
  assertNoStore(searchResponse);
});

test('absolute expiration cannot be extended by activity', async () => {
  const cookie = await login();
  for (let elapsed = 0; elapsed < 16; elapsed += 1) {
    advance(29 * 60);
    const active = await fetch(`${fixture.nestOrigin}/api/v1/owner/search?q=private`, {
      headers: { Cookie: cookie },
    });
    await active.text();
    assert.equal(active.status, 200);
  }
  advance(17 * 60);
  const response = await fetch(`${fixture.nestOrigin}/api/v1/owner/search?q=private`, {
    headers: { Cookie: cookie },
  });
  await response.text();
  assert.equal(response.status, 401);
  assertNoStore(response);
});

test('logout enforces Origin and CSRF, revokes server session, and clears cookie', async () => {
  const cookie = await login();
  const csrfToken = await csrf(cookie);
  const crossSite = await mutate('/api/v1/auth/logout', cookie, csrfToken, 'https://attacker.invalid');
  await crossSite.text();
  assert.equal(crossSite.status, 403);

  const missingToken = await mutate('/api/v1/auth/logout', cookie);
  await missingToken.text();
  assert.equal(missingToken.status, 403);

  const response = await mutate('/api/v1/auth/logout', cookie, csrfToken);
  await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie') ?? '', /Max-Age=0/);
  assertNoStore(response);

  const replay = await fetch(`${fixture.nestOrigin}/api/v1/records/private-note`, {
    headers: { Cookie: cookie },
  });
  const replayBody = await replay.text();
  assert.equal(replay.status, 404);
  assertNoPrivateLeak(replayBody);
});

test('revoke-all invalidates every synthetic owner session', async () => {
  const first = await login();
  const second = await login();
  const csrfToken = await csrf(first);
  const response = await mutate('/api/v1/auth/revoke-all', first, csrfToken);
  await response.text();
  assert.equal(response.status, 200);
  for (const cookie of [first, second]) {
    const retry = await fetch(`${fixture.nestOrigin}/api/v1/owner/search?q=private`, {
      headers: { Cookie: cookie },
    });
    await retry.text();
    assert.equal(retry.status, 401);
  }
});

test('tampered session token is denied without revealing record existence', async () => {
  const cookie = await login();
  const [name, value] = cookie.split('=', 2);
  const replacement = value.endsWith('A') ? 'B' : 'A';
  const tampered = `${name}=${value.slice(0, -1)}${replacement}`;
  const response = await fetch(`${fixture.nestOrigin}/api/v1/records/private-note`, {
    headers: { Cookie: tampered },
  });
  const body = await response.text();
  assert.equal(response.status, 404);
  assertNoPrivateLeak(body);
});

test('login rotates the session identifier and revokes the presented session', async () => {
  const oldCookie = await login();
  const newCookie = await login(oldCookie);
  assert.notEqual(oldCookie, newCookie);
  const oldResponse = await fetch(`${fixture.nestOrigin}/api/v1/records/private-note`, {
    headers: { Cookie: oldCookie },
  });
  const newResponse = await fetch(`${fixture.nestOrigin}/api/v1/records/private-note`, {
    headers: { Cookie: newCookie },
  });
  const [oldBody, newBody] = await Promise.all([oldResponse.text(), newResponse.text()]);
  assert.equal(oldResponse.status, 404);
  assert.equal(newResponse.status, 200);
  assertNoPrivateLeak(oldBody);
  assert.equal(newBody.includes(PRIVATE_CANARY), true);
});

test('public and owner search indexes are isolated and missing visibility is quarantined', async () => {
  const cookie = await login();
  const publicResponse = await fetch(`${fixture.nestOrigin}/api/v1/search?q=private`, {
    headers: { Cookie: cookie },
  });
  const ownerResponse = await fetch(`${fixture.nestOrigin}/api/v1/owner/search?q=private`, {
    headers: { Cookie: cookie },
  });
  const unknownResponse = await fetch(`${fixture.nestOrigin}/api/v1/owner/search?q=quarantined`, {
    headers: { Cookie: cookie },
  });
  const [publicBody, ownerBody, unknownBody] = await Promise.all([
    publicResponse.text(), ownerResponse.text(), unknownResponse.text(),
  ]);
  assert.equal(publicResponse.status, 200);
  assert.equal(ownerResponse.status, 200);
  assertNoPrivateLeak(publicBody);
  assert.equal(ownerBody.includes(PRIVATE_CANARY), true);
  assert.equal((JSON.parse(unknownBody) as { results: unknown[] }).results.length, 0);
  assertNoStore(ownerResponse);
});

test('private asset requires a live owner session', async () => {
  const cookie = await login();
  const guest = await fetch(`${fixture.nestOrigin}/api/v1/assets/private-asset`);
  const owner = await fetch(`${fixture.nestOrigin}/api/v1/assets/private-asset`, {
    headers: { Cookie: cookie },
  });
  const [guestBody, ownerBody] = await Promise.all([guest.text(), owner.text()]);
  assert.equal(guest.status, 404);
  assert.equal(owner.status, 200);
  assertNoPrivateLeak(guestBody);
  assert.equal(ownerBody.includes(PRIVATE_CANARY), true);
  assertNoStore(guest);
  assertNoStore(owner);
});

test('asset path escape and encoded separators cannot reach outside canary', async () => {
  const cookie = await login();
  const attempts = [
    '../outside-canary',
    '..%2Foutside-canary',
    '..%5Coutside-canary',
    '%2Fetc%2Fpasswd',
    'private.txt',
    '..%252Foutside-canary',
  ];
  for (const attempt of attempts) {
    const response = await fetch(`${fixture.nestOrigin}/api/v1/assets/${attempt}`, {
      headers: { Cookie: cookie },
    });
    const body = await response.text();
    assert.equal(response.status, 404);
    assert.equal(body.includes(OUTSIDE_CANARY), false);
    assertNoPrivateLeak(body);
  }
});

test('public cache can be shared while private responses always bypass it', async () => {
  const cookie = await login();
  const firstPublic = await fetch(`${fixture.nextOrigin}/records/public-note`);
  await firstPublic.text();
  const secondPublic = await fetch(`${fixture.nextOrigin}/records/public-note`, {
    headers: { Cookie: cookie },
  });
  const secondPublicBody = await secondPublic.text();
  assert.equal(secondPublic.headers.get('x-next-cache'), 'HIT');
  assertNoPrivateLeak(secondPublicBody);

  for (const currentCookie of [cookie, cookie]) {
    const response = await fetch(`${fixture.nextOrigin}/owner/records/private-note`, {
      headers: { Cookie: currentCookie },
    });
    await response.text();
    assert.equal(response.headers.get('x-next-cache'), 'BYPASS');
    assertNoStore(response);
  }
  const guest = await fetch(`${fixture.nextOrigin}/owner/records/private-note`);
  const guestBody = await guest.text();
  assert.equal(guest.status, 404);
  assert.equal(guest.headers.get('x-next-cache'), 'BYPASS');
  assertNoPrivateLeak(guestBody);
});

test('private errors and public cache errors are generic and not cacheable', async () => {
  const cookie = await login();
  const privateError = await fetch(`${fixture.nestOrigin}/api/v1/records/private-note?fail=1`, {
    headers: { Cookie: cookie },
  });
  const publicError = await fetch(`${fixture.nextOrigin}/search?q=fail`);
  const [privateBody, publicBody] = await Promise.all([privateError.text(), publicError.text()]);
  assert.equal(privateError.status, 500);
  assert.equal(publicError.status, 500);
  for (const [response, body] of [[privateError, privateBody], [publicError, publicBody]] as const) {
    assertNoStore(response);
    assertNoPrivateLeak(body);
    assert.equal(/stack|fixtures|outside-canary/i.test(body), false);
  }
  assert.equal(publicError.headers.get('x-next-cache'), 'BYPASS');
});

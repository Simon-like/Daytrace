import assert from "node:assert/strict";
import { test } from "node:test";
import type { Configuration } from "openid-client";
import { OpenidAuth0Client, type OpenidOperations } from "./openid-auth0.client";
import type { Auth0Configuration, AuthorizationRequest, LoginTransaction } from "./auth.types";

const configuration: Auth0Configuration = {
  issuer: "https://tenant.example.com/",
  clientId: "synthetic-client",
  clientSecret: "synthetic-secret",
  redirectUri: "https://daytrace.example.com/api/v1/auth/callback",
};
const request: AuthorizationRequest = {
  state: "state-value",
  nonce: "nonce-value",
  codeVerifier: "verifier-value",
  codeChallenge: "challenge-value",
  redirectUri: configuration.redirectUri,
};
const transaction: LoginTransaction = {
  state: request.state,
  nonce: request.nonce,
  codeVerifier: request.codeVerifier,
  returnTo: "/owner",
};

function operations(claims: Record<string, unknown> | undefined): {
  client: OpenidAuth0Client;
  authorizationParameters: () => Record<string, string> | URLSearchParams | undefined;
  callbackChecks: () => unknown;
  callbackUrl: () => URL | Request | undefined;
} {
  let authorizationParameters: Record<string, string> | URLSearchParams | undefined;
  let callbackChecks: unknown;
  let callbackUrl: URL | Request | undefined;
  const discovered = { marker: "synthetic-discovery" } as unknown as Configuration;
  const tokens = { claims: () => claims } as unknown as Awaited<ReturnType<OpenidOperations["authorizationCodeGrant"]>>;
  const operations: OpenidOperations = {
    discovery: async () => discovered,
    buildAuthorizationUrl: (_configuration, parameters) => {
      authorizationParameters = parameters;
      return new URL("https://tenant.example.com/authorize");
    },
    authorizationCodeGrant: async (_configuration, currentUrl, checks) => {
      callbackUrl = currentUrl;
      callbackChecks = checks;
      return tokens;
    },
  };
  return {
    client: new OpenidAuth0Client(operations),
    authorizationParameters: () => authorizationParameters,
    callbackChecks: () => callbackChecks,
    callbackUrl: () => callbackUrl,
  };
}

test("authorization URL includes OpenID scope, state, nonce and S256 PKCE", async () => {
  const harness = operations({ sub: "owner", iss: configuration.issuer, auth_time: 123 });
  const url = await harness.client.authorizationUrl(configuration, request);
  assert.equal(url.origin, "https://tenant.example.com");
  const parameters = harness.authorizationParameters();
  assert.ok(parameters && !(parameters instanceof URLSearchParams));
  assert.deepEqual(parameters, {
    redirect_uri: configuration.redirectUri,
    scope: "openid",
    state: request.state,
    nonce: request.nonce,
    code_challenge: request.codeChallenge,
    code_challenge_method: "S256",
  });
});

test("callback validates state nonce and PKCE then maps verified identity claims", async () => {
  const harness = operations({ sub: "owner-subject", iss: configuration.issuer, auth_time: 123 });
  const identity = await harness.client.verifyCallback(configuration, { code: "code", state: request.state }, transaction);
  assert.deepEqual(identity, { issuer: configuration.issuer, subject: "owner-subject", authTime: 123 });
  assert.deepEqual(harness.callbackChecks(), {
    expectedState: request.state,
    expectedNonce: request.nonce,
    pkceCodeVerifier: request.codeVerifier,
  });
  const callback = harness.callbackUrl();
  assert.ok(callback instanceof URL);
  assert.equal(callback.searchParams.get("code"), "code");
  assert.equal(callback.searchParams.get("state"), request.state);
});

test("missing or malformed identity claims fail closed", async () => {
  for (const claims of [
    undefined,
    { iss: configuration.issuer, auth_time: 123 },
    { sub: "owner", auth_time: 123 },
    { sub: "owner", iss: configuration.issuer },
    { sub: "owner", iss: configuration.issuer, auth_time: Number.NaN },
  ]) {
    const harness = operations(claims);
    await assert.rejects(
      harness.client.verifyCallback(configuration, { code: "code", state: request.state }, transaction),
      /ID token claims are invalid/,
    );
  }
});

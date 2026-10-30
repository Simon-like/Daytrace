import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  LoginTransaction,
  OwnerIdentity,
  OwnerSession,
  VerifiedIdentity,
} from "./auth.types";
import { OwnerPolicy } from "./owner-policy";
import { createPkcePair } from "./oidc-provider";
import { SqliteSessionStore } from "./sqlite-session.store";

const DEFAULT_IDLE_TTL = 30 * 60 * 1000;
const DEFAULT_ABSOLUTE_TTL = 8 * 60 * 60 * 1000;
const DEFAULT_LOGIN_TTL = 10 * 60 * 1000;

export interface LoginStart {
  readonly transactionToken: string;
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly codeChallenge: string;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function equalHash(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

@Injectable()
export class SessionService {
  private readonly now: () => number;
  private readonly idleTtlMs: number;
  private readonly absoluteTtlMs: number;
  private readonly loginTtlMs: number;

  constructor(
    private readonly store: SqliteSessionStore,
    private readonly owners: OwnerPolicy,
    options: {
      readonly now?: () => number;
      readonly idleTtlMs?: number;
      readonly absoluteTtlMs?: number;
      readonly loginTtlMs?: number;
    } = {},
  ) {
    this.now = options.now ?? Date.now;
    this.idleTtlMs = options.idleTtlMs ?? DEFAULT_IDLE_TTL;
    this.absoluteTtlMs = options.absoluteTtlMs ?? DEFAULT_ABSOLUTE_TTL;
    this.loginTtlMs = options.loginTtlMs ?? DEFAULT_LOGIN_TTL;
  }

  get absoluteMaxAgeSeconds(): number {
    return Math.floor(this.absoluteTtlMs / 1000);
  }

  beginLogin(returnTo: string): LoginStart {
    const transactionToken = randomBytes(32).toString("base64url");
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const pkce = createPkcePair();
    this.store.insertLoginTransaction({
      transactionHash: hash(transactionToken),
      stateHash: hash(state),
      nonceHash: hash(nonce),
      codeVerifier: pkce.verifier,
      returnTo,
      expiresAt: this.now() + this.loginTtlMs,
      consumedAt: null,
    });
    return { transactionToken, state, nonce, codeVerifier: pkce.verifier, codeChallenge: pkce.challenge };
  }

  consumeLogin(transactionToken: string | null, state: string): (LoginTransaction & { transactionToken: string }) | null {
    if (transactionToken === null || !/^[A-Za-z0-9_-]{43}$/.test(state)) return null;
    const transactionHash = hash(transactionToken);
    const stored = this.store.getLoginTransaction(transactionHash);
    const now = this.now();
    if (
      stored === null || stored.consumedAt !== null || stored.expiresAt <= now ||
      !equalHash(stored.stateHash, hash(state)) ||
      !this.store.consumeLoginTransaction(transactionHash, now)
    ) {
      return null;
    }
    return {
      transactionToken,
      state,
      nonceHash: stored.nonceHash,
      codeVerifier: stored.codeVerifier,
      returnTo: stored.returnTo,
    };
  }

  createSession(identity: VerifiedIdentity, previousToken?: string | null): { token: string; session: OwnerSession } {
    if (!this.owners.isOwner(identity)) throw new Error("cannot create a session for a non-owner");
    if (previousToken !== undefined && previousToken !== null) this.revokeToken(previousToken);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hash(token);
    const now = this.now();
    this.store.createSession({
      tokenHash,
      identity,
      createdAt: now,
      idleExpiresAt: now + this.idleTtlMs,
      absoluteExpiresAt: now + this.absoluteTtlMs,
      authTime: identity.authTime,
    });
    return {
      token,
      session: { tokenHash, identity, csrfHash: null, authTime: identity.authTime },
    };
  }

  resolve(token: string | null): OwnerSession | null {
    if (token === null || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const tokenHash = hash(token);
    const stored = this.store.getSession(tokenHash);
    if (stored === null) return null;
    if (!this.owners.isOwner(stored.identity)) {
      this.store.deleteAllSessions(stored.identity);
      return null;
    }
    const now = this.now();
    if (
      stored.schemaVersion !== 1 || stored.revokedAt !== null ||
      stored.idleExpiresAt <= now || stored.absoluteExpiresAt <= now
    ) {
      this.store.deleteSession(tokenHash);
      return null;
    }
    const idleExpiresAt = Math.min(now + this.idleTtlMs, stored.absoluteExpiresAt);
    this.store.touchSession(tokenHash, now, idleExpiresAt);
    return {
      tokenHash,
      identity: stored.identity,
      csrfHash: stored.csrfHash,
      authTime: stored.authTime,
    };
  }

  issueCsrf(session: OwnerSession): string {
    const token = randomBytes(32).toString("base64url");
    this.store.setCsrfHash(session.tokenHash, hash(token));
    return token;
  }

  verifyCsrf(session: OwnerSession, token: string | null): boolean {
    if (token === null || session.csrfHash === null || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
    return equalHash(session.csrfHash, hash(token));
  }

  revoke(session: OwnerSession): void {
    this.store.deleteSession(session.tokenHash);
  }

  revokeToken(token: string): void {
    this.store.deleteSession(hash(token));
  }

  revokeAll(identity: OwnerIdentity): void {
    this.store.deleteAllSessions(identity);
  }

  cleanup(): void {
    this.store.deleteExpired(this.now());
  }
}

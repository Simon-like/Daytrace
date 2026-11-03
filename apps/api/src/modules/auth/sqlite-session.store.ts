import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import type { OwnerIdentity } from "./auth.types";

export interface StoredLoginTransaction {
  readonly transactionHash: string;
  readonly stateHash: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly returnTo: string;
  readonly expiresAt: number;
  readonly consumedAt: number | null;
}

export interface StoredSession {
  readonly tokenHash: string;
  readonly identity: OwnerIdentity;
  readonly csrfHash: string | null;
  readonly createdAt: number;
  readonly lastSeenAt: number;
  readonly idleExpiresAt: number;
  readonly absoluteExpiresAt: number;
  readonly revokedAt: number | null;
  readonly authTime: number;
  readonly schemaVersion: number;
}

interface NewSession {
  readonly tokenHash: string;
  readonly identity: OwnerIdentity;
  readonly createdAt: number;
  readonly idleExpiresAt: number;
  readonly absoluteExpiresAt: number;
  readonly authTime: number;
}

function text(value: unknown): string {
  if (typeof value !== "string") throw new Error("session database text invariant failed");
  return value;
}

function integer(value: unknown): number {
  if (typeof value !== "number" && typeof value !== "bigint") throw new Error("session database integer invariant failed");
  return Number(value);
}

function nullableInteger(value: unknown): number | null {
  return value === null ? null : integer(value);
}

@Injectable()
export class SqliteSessionStore implements OnModuleDestroy {
  private readonly database: DatabaseSync;
  private closed = false;

  constructor(readonly databasePath: string) {
    if (databasePath !== ":memory:") {
      mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });
      this.database = new DatabaseSync(databasePath);
      chmodSync(databasePath, 0o600);
    } else {
      this.database = new DatabaseSync(databasePath);
    }
    this.database.exec("PRAGMA busy_timeout = 5000;");
    this.database.exec("PRAGMA journal_mode = WAL;");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        owner_issuer TEXT NOT NULL,
        owner_subject TEXT NOT NULL,
        csrf_hash TEXT,
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        idle_expires_at INTEGER NOT NULL,
        absolute_expires_at INTEGER NOT NULL,
        revoked_at INTEGER,
        auth_time INTEGER NOT NULL,
        schema_version INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_owner_idx
        ON sessions(owner_issuer, owner_subject);
      CREATE TABLE IF NOT EXISTS login_transactions (
        transaction_hash TEXT PRIMARY KEY,
        state_hash TEXT NOT NULL UNIQUE,
        nonce TEXT NOT NULL,
        code_verifier TEXT NOT NULL,
        return_to TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        consumed_at INTEGER
      );
    `);
    const legacyNonce = this.database.prepare("PRAGMA table_info(login_transactions)").all().some((column) =>
      typeof column === "object" && column !== null && "name" in column && column.name === "nonce_hash"
    );
    if (legacyNonce) {
      this.database.exec("BEGIN");
      try {
        // Hashed nonces cannot be used for exact OIDC validation; old short-lived logins must restart.
        this.database.exec("ALTER TABLE login_transactions RENAME COLUMN nonce_hash TO nonce");
        this.database.exec("DELETE FROM login_transactions");
        this.database.exec("COMMIT");
      } catch (error: unknown) {
        this.database.exec("ROLLBACK");
        throw error;
      }
    }
  }

  onModuleDestroy(): void {
    this.close();
  }

  close(): void {
    if (this.closed) return;
    this.database.close();
    this.closed = true;
  }

  insertLoginTransaction(transaction: StoredLoginTransaction): void {
    this.database.prepare(`
      INSERT INTO login_transactions (
        transaction_hash, state_hash, nonce, code_verifier, return_to, expires_at, consumed_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL)
    `).run(
      transaction.transactionHash,
      transaction.stateHash,
      transaction.nonce,
      transaction.codeVerifier,
      transaction.returnTo,
      transaction.expiresAt,
    );
  }

  getLoginTransaction(transactionHash: string): StoredLoginTransaction | null {
    const row = this.database.prepare(`
      SELECT * FROM login_transactions WHERE transaction_hash = ?
    `).get(transactionHash);
    if (row === undefined) return null;
    return {
      transactionHash: text(row.transaction_hash),
      stateHash: text(row.state_hash),
      nonce: text(row.nonce),
      codeVerifier: text(row.code_verifier),
      returnTo: text(row.return_to),
      expiresAt: integer(row.expires_at),
      consumedAt: nullableInteger(row.consumed_at),
    };
  }

  consumeLoginTransaction(transactionHash: string, now: number): boolean {
    return this.database.prepare(`
      UPDATE login_transactions SET consumed_at = ?
      WHERE transaction_hash = ? AND consumed_at IS NULL
    `).run(now, transactionHash).changes > 0;
  }

  createSession(session: NewSession): void {
    this.database.prepare(`
      INSERT INTO sessions (
        token_hash, owner_issuer, owner_subject, csrf_hash, created_at, last_seen_at,
        idle_expires_at, absolute_expires_at, revoked_at, auth_time, schema_version
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, NULL, ?, 1)
    `).run(
      session.tokenHash,
      session.identity.issuer,
      session.identity.subject,
      session.createdAt,
      session.createdAt,
      session.idleExpiresAt,
      session.absoluteExpiresAt,
      session.authTime,
    );
  }

  getSession(tokenHash: string): StoredSession | null {
    const row = this.database.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(tokenHash);
    if (row === undefined) return null;
    return {
      tokenHash: text(row.token_hash),
      identity: { issuer: text(row.owner_issuer), subject: text(row.owner_subject) },
      csrfHash: row.csrf_hash === null ? null : text(row.csrf_hash),
      createdAt: integer(row.created_at),
      lastSeenAt: integer(row.last_seen_at),
      idleExpiresAt: integer(row.idle_expires_at),
      absoluteExpiresAt: integer(row.absolute_expires_at),
      revokedAt: nullableInteger(row.revoked_at),
      authTime: integer(row.auth_time),
      schemaVersion: integer(row.schema_version),
    };
  }

  touchSession(tokenHash: string, now: number, idleExpiresAt: number): void {
    this.database.prepare(`
      UPDATE sessions SET last_seen_at = ?, idle_expires_at = ? WHERE token_hash = ?
    `).run(now, idleExpiresAt, tokenHash);
  }

  setCsrfHash(tokenHash: string, csrfHash: string): void {
    this.database.prepare("UPDATE sessions SET csrf_hash = ? WHERE token_hash = ?").run(csrfHash, tokenHash);
  }

  deleteSession(tokenHash: string): void {
    this.database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
  }

  deleteAllSessions(identity: OwnerIdentity): void {
    this.database.prepare(`
      DELETE FROM sessions WHERE owner_issuer = ? AND owner_subject = ?
    `).run(identity.issuer, identity.subject);
  }

  deleteExpired(now: number): void {
    this.database.prepare(`
      DELETE FROM sessions
      WHERE idle_expires_at <= ? OR absolute_expires_at <= ? OR revoked_at IS NOT NULL
    `).run(now, now);
    this.database.prepare("DELETE FROM login_transactions WHERE expires_at <= ?").run(now);
  }
}

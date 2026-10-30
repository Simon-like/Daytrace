import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { OidcProvider } from "./auth.types";
import { loginFailed, ownerRequired } from "./auth.errors";
import {
  clearCookie,
  LOGIN_COOKIE,
  loginCookie,
  onlySessionCookie,
  readCookie,
  SESSION_COOKIE,
  sessionCookie,
} from "./cookies";
import { OwnerGuard, noStore, type OwnerRequest } from "./owner.guard";
import { OwnerPolicy } from "./owner-policy";
import { SessionService } from "./session.service";
import { OriginCsrfGuard } from "./write-protection.guard";

export const OIDC_PROVIDER = "ACCESS_OIDC_PROVIDER";
export const AUTH_PUBLIC_ORIGIN = "ACCESS_AUTH_PUBLIC_ORIGIN";

export function safeReturnTo(value: unknown): string {
  if (value === undefined) return "/owner";
  if (
    typeof value !== "string" || value.length > 512 || !/^\/(?![/\\])[^\\]*$/.test(value) ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f)
  ) {
    throw loginFailed();
  }
  return value;
}

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(OwnerPolicy) private readonly owners: OwnerPolicy,
    @Inject(OIDC_PROVIDER) private readonly provider: OidcProvider,
    @Inject(AUTH_PUBLIC_ORIGIN) private readonly publicOrigin: string,
  ) {}

  @Get("login")
  async login(
    @Query("returnTo") returnTo: unknown,
    @Res() response: Response,
  ): Promise<void> {
    noStore(response);
    const destination = safeReturnTo(returnTo);
    const login = this.sessions.beginLogin(destination);
    const redirect = await this.provider.authorizationUrl({
      state: login.state,
      nonce: login.nonce,
      codeVerifier: login.codeVerifier,
      codeChallenge: login.codeChallenge,
      redirectUri: `${this.publicOrigin}/api/v1/auth/callback`,
    });
    response.setHeader("Set-Cookie", loginCookie(login.transactionToken));
    response.redirect(302, redirect.toString());
  }

  @Get("callback")
  async callback(
    @Query("code") code: unknown,
    @Query("state") state: unknown,
    @Req() request: OwnerRequest,
    @Res() response: Response,
  ): Promise<void> {
    noStore(response);
    response.setHeader("Set-Cookie", clearCookie(LOGIN_COOKIE));
    if (typeof code !== "string" || typeof state !== "string" || code.length > 2048) throw loginFailed();
    const transaction = this.sessions.consumeLogin(readCookie(request.headers.cookie, LOGIN_COOKIE), state);
    if (transaction === null) throw loginFailed();
    let identity;
    try {
      identity = await this.provider.verifyCallback({ code, state }, transaction);
    } catch {
      throw loginFailed();
    }
    if (!this.owners.isOwner(identity)) throw ownerRequired();
    const created = this.sessions.createSession(identity, onlySessionCookie(request.headers.cookie));
    response.setHeader("Set-Cookie", [
      clearCookie(LOGIN_COOKIE),
      sessionCookie(created.token, this.sessions.absoluteMaxAgeSeconds),
    ]);
    response.redirect(302, transaction.returnTo);
  }

  @Get("session")
  @UseGuards(OwnerGuard)
  session(): { authenticated: true } {
    return { authenticated: true };
  }

  @Get("csrf")
  @UseGuards(OwnerGuard)
  csrf(@Req() request: OwnerRequest): { csrfToken: string } {
    return { csrfToken: this.sessions.issueCsrf(request.ownerSession) };
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(OwnerGuard, OriginCsrfGuard)
  logout(@Req() request: OwnerRequest, @Res() response: Response): void {
    noStore(response);
    this.sessions.revoke(request.ownerSession);
    response.setHeader("Set-Cookie", clearCookie(SESSION_COOKIE));
    response.status(204).end();
  }

  @Post("revoke-all")
  @HttpCode(204)
  @UseGuards(OwnerGuard, OriginCsrfGuard)
  revokeAll(@Req() request: OwnerRequest, @Res() response: Response): void {
    noStore(response);
    this.sessions.revokeAll(request.ownerSession.identity);
    response.setHeader("Set-Cookie", clearCookie(SESSION_COOKIE));
    response.status(204).end();
  }
}

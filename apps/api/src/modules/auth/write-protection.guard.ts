import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import type { Response } from "express";
import { csrfRejected } from "./auth.errors";
import type { OwnerRequest } from "./owner.guard";
import { noStore } from "./owner.guard";
import { SessionService } from "./session.service";

export const PUBLIC_ORIGIN = "ACCESS_PUBLIC_ORIGIN";

@Injectable()
export class OriginCsrfGuard implements CanActivate {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(PUBLIC_ORIGIN) private readonly publicOrigin: string,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OwnerRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    noStore(response);
    const origin = request.headers.origin;
    const fetchSite = request.headers["sec-fetch-site"];
    if (origin !== this.publicOrigin || fetchSite === "cross-site") throw csrfRejected();
    const body = typeof request.body === "object" && request.body !== null
      ? request.body as Record<string, unknown>
      : {};
    const header = request.headers["x-csrf-token"];
    const bodyToken = typeof body.csrf_token === "string" ? body.csrf_token : null;
    const headerToken = typeof header === "string" ? header : null;
    if (headerToken !== null && bodyToken !== null && headerToken !== bodyToken) throw csrfRejected();
    if (!this.sessions.verifyCsrf(request.ownerSession, headerToken ?? bodyToken)) throw csrfRejected();
    return true;
  }
}

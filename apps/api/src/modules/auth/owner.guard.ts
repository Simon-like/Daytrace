import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import type { OwnerSession } from "./auth.types";
import { authRequired } from "./auth.errors";
import { onlySessionCookie } from "./cookies";
import { SessionService } from "./session.service";

export interface OwnerRequest extends Request {
  ownerSession: OwnerSession;
}

export function noStore(response: Response): void {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("CDN-Cache-Control", "no-store");
  response.setHeader("Pragma", "no-cache");
}

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(@Inject(SessionService) private readonly sessions: SessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OwnerRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    noStore(response);
    const session = this.sessions.resolve(onlySessionCookie(request.headers.cookie));
    if (session === null) throw authRequired();
    request.ownerSession = session;
    return true;
  }
}

import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import type { Response } from "express";
import { RecordNotFoundError } from "../../common/api-error";
import type { OwnerSession } from "./auth.types";
import { onlySessionCookie } from "./cookies";
import { noStore } from "./owner.guard";
import { SessionService } from "./session.service";
import type { OwnerRequest } from "./owner.guard";

@Injectable()
export class OwnerObjectGuard implements CanActivate {
  constructor(@Inject(SessionService) private readonly sessions: SessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OwnerRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    noStore(response);
    const session: OwnerSession | null = this.sessions.resolve(onlySessionCookie(request.headers.cookie));
    if (session === null) throw new RecordNotFoundError();
    request.ownerSession = session;
    return true;
  }
}

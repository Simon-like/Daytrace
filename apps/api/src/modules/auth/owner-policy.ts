import { Injectable } from "@nestjs/common";
import type { OwnerIdentity } from "./auth.types";

function key(identity: OwnerIdentity): string {
  return JSON.stringify([identity.issuer, identity.subject]);
}

@Injectable()
export class OwnerPolicy {
  private allowed: ReadonlySet<string>;

  constructor(identities: readonly OwnerIdentity[]) {
    this.allowed = new Set(identities.map(key));
  }

  isOwner(identity: OwnerIdentity): boolean {
    return this.allowed.has(key(identity));
  }

  replace(identities: readonly OwnerIdentity[]): void {
    this.allowed = new Set(identities.map(key));
  }
}

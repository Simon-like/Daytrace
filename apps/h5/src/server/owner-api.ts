import { cookies } from "next/headers";
import { createOwnerApiClient, type OwnerApiClient } from "@daytrace/content/owner-api";

const SESSION_COOKIE = "__Host-daytrace_session";

export async function ownerApi(): Promise<OwnerApiClient> {
  const session = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  return createOwnerApiClient(session);
}

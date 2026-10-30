import { parsePublicArticle, type PublicArticle } from "@daytrace/arch-contracts";

export async function getPublicArticle(slug: string): Promise<PublicArticle | null> {
  const origin = process.env.API_INTERNAL_ORIGIN;
  if (!origin) throw new Error("API_INTERNAL_ORIGIN is required");

  const base = new URL(origin);
  if ((base.protocol !== "http:" && base.protocol !== "https:") || base.username || base.password) {
    throw new Error("API_INTERNAL_ORIGIN must be an HTTP(S) origin without credentials");
  }
  const url = new URL(`/api/v1/records/${encodeURIComponent(slug)}`, base);
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API_REQUEST_FAILED_${response.status}`);
  return parsePublicArticle(await response.json());
}

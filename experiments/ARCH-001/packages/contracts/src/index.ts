export const CONTRACT_VERSION = "1.0.0-arch.1" as const;

export interface PublicArticle {
  contractVersion: typeof CONTRACT_VERSION;
  id: string;
  slug: string;
  title: string;
  date: string;
  summary: string;
  html: string;
}

export function parsePublicArticle(value: unknown): PublicArticle {
  if (typeof value !== "object" || value === null) {
    throw new Error("PUBLIC_ARTICLE_INVALID");
  }

  const article = value as Record<string, unknown>;
  const requiredStrings = ["id", "slug", "title", "date", "summary", "html"] as const;
  if (
    article.contractVersion !== CONTRACT_VERSION ||
    requiredStrings.some((field) => typeof article[field] !== "string")
  ) {
    throw new Error("PUBLIC_ARTICLE_INVALID");
  }

  return article as unknown as PublicArticle;
}

import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/owner/", "/h5/"] },
    sitemap: new URL("/sitemap.xml", origin).href,
  };
}

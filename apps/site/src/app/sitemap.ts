import type { MetadataRoute } from "next";
import { getAllPublicRecords } from "../server/api";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const records = await getAllPublicRecords();
  const origin = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000";
  const latest = records.reduce<string | undefined>((value, record) => value === undefined || record.updatedAt > value ? record.updatedAt : value, records[0]?.updatedAt);
  return [
    ...["/", "/archive", "/search", "/about"].map(path => ({
      url: new URL(path, origin).href,
      ...(latest === undefined ? {} : { lastModified: new Date(latest) }),
    })),
    ...records.map(record => ({
      url: new URL(`/records/${record.id}/`, origin).href,
      lastModified: new Date(record.updatedAt),
    })),
  ];
}

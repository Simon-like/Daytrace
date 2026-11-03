import { getAllPublicRecords } from "../../server/api";

export const dynamic = "force-dynamic";

export function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export async function GET(): Promise<Response> {
  const records = await getAllPublicRecords();
  const origin = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000";
  const channelUrl = new URL("/", origin).href;
  const items = records.map(record => {
    const url = new URL(`/records/${record.id}/`, origin).href;
    return [
      "<item>",
      `<title>${escapeXml(record.title)}</title>`,
      `<link>${escapeXml(url)}</link>`,
      `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `<pubDate>${new Date(record.updatedAt).toUTCString()}</pubDate>`,
      `<description>${escapeXml(record.summary ?? "")}</description>`,
      "</item>",
    ].join("");
  }).join("");
  const latest = records.reduce((value, record) => record.updatedAt > value ? record.updatedAt : value, records[0]?.updatedAt ?? new Date(0).toISOString());
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>有迹 Daytrace</title><link>${escapeXml(channelUrl)}</link><description>让经历有迹可循。技术实践、生活经验与随想认知的个人档案。</description><language>zh-CN</language><lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>${items}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "no-store" } });
}

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isRecordId } from "@daytrace/contracts";
import { findPublicRecordBySlug, getPublicRecord } from "@daytrace/content/public-api";
import { MobileReader } from "../../../components/mobile-reader";

export const dynamic = "force-dynamic";
interface Props { readonly params: Promise<{ recordRef: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { recordRef } = await params;
  if (!isRecordId(recordRef)) return { title: "记录链接" };
  const record = await getPublicRecord(recordRef);
  if (record === null) return { title: "记录不可用" };
  const origin = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000";
  const description = record.summary ?? "有迹 Daytrace 的一页公开记录。";
  const canonical = new URL(`/records/${record.id}/`, origin).href;
  const image = new URL(`/records/${record.id}/opengraph-image`, origin).href;
  return {
    title: record.title,
    description,
    alternates: { canonical, types: { "application/rss+xml": new URL("/rss.xml", origin).href } },
    openGraph: {
      title: record.title,
      description,
      url: canonical,
      siteName: "有迹 Daytrace",
      locale: "zh_CN",
      type: "article",
      publishedTime: record.occurredOn ?? record.updatedAt,
      modifiedTime: record.updatedAt,
      images: [{ url: image, width: 1200, height: 630, alt: record.title }],
    },
    twitter: { card: "summary_large_image", title: record.title, description, images: [image] },
  };
}
export default async function H5RecordPage({ params }: Props) {
  const { recordRef } = await params;
  if (!isRecordId(recordRef)) {
    const match = await findPublicRecordBySlug(recordRef);
    if (!match) notFound();
    permanentRedirect(`/h5/records/${match.id}/`);
  }
  const record = await getPublicRecord(recordRef);
  if (!record) notFound();
  const mobileRecord = { ...record, body: { ...record.body,
    html: record.body.html.replace(/href="\/records\/(rec_[0-9a-f-]{36})\//g, 'href="/h5/records/$1/'),
  } };
  return <MobileReader record={mobileRecord} />;
}

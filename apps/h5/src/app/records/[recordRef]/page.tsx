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
  return { title: record?.title ?? "记录不可用", description: record?.summary ?? undefined, ...(record ? { alternates: { canonical: `/records/${record.id}/` } } : {}) };
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

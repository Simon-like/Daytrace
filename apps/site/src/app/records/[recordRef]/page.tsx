import Link from "next/link";
import { ReaderArticle } from "../../../features/reader";
import type { Metadata } from "next";
import { isRecordId } from "@daytrace/contracts";
import { notFound, permanentRedirect } from "next/navigation";
import { findPublicRecordBySlug, getPublicRecord } from "../../../server/api";

export const dynamic = "force-dynamic";

interface RecordPageProps {
  params: Promise<{ recordRef: string }>;
}

export async function generateMetadata({ params }: RecordPageProps): Promise<Metadata> {
  const { recordRef } = await params;
  if (!isRecordId(recordRef)) return { title: "记录链接" };
  const record = await getPublicRecord(recordRef);
  if (record === null) return { title: "记录不可用" };
  return { title: record.title, description: record.summary ?? undefined, alternates: { canonical: `/records/${record.id}/` } };
}

export default async function RecordPage({ params }: RecordPageProps) {
  const { recordRef } = await params;
  if (!isRecordId(recordRef)) {
    const match = await findPublicRecordBySlug(recordRef);
    if (match === null) notFound();
    permanentRedirect(`/records/${match.id}/`);
  }
  const record = await getPublicRecord(recordRef);
  if (record === null) notFound();
  return <main className="reader-main"><div className="reader-topline"><Link href="/archive">← 返回归档</Link><span>{process.env.DAYTRACE_DEMO === "1" ? "一页演示记录" : "一页记录"}</span></div><ReaderArticle record={record} marginNote="留下过程，也给后来一点线索。" /><div className="reader-bottom"><span>这一页，先记到这里。</span><Link href="/archive">继续翻阅归档 ↗</Link></div></main>;
}

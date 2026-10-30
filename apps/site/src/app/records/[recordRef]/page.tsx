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
  return { title: record.title, description: record.summary ?? undefined };
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
  return (
    <main className="reader-main">
      <article>
        <header className="reader-header">
          <p className="eyebrow">公开记录 / 合成样本</p>
          <h1>{record.title}</h1>
          <div className="record-meta">
            <time dateTime={record.updatedAt}>发生：{record.occurredOn ?? "未记日期"}</time>
            <span>修订 {record.revision}</span>
          </div>
          {record.summary === null ? null : <p className="reader-summary">{record.summary}</p>}
        </header>
        <div className="reader-layout">
          {record.body.toc.length === 0 ? null : (
            <nav className="toc" aria-label="本文目录">
              <p>本文目录</p>
              <ol>{record.body.toc.map((item) => (
                <li key={item.id} className={`toc-level-${item.level}`}><a href={`#${item.id}`}>{item.text}</a></li>
              ))}</ol>
            </nav>
          )}
          <div className="record-body" dangerouslySetInnerHTML={{ __html: record.body.html }} />
        </div>
      </article>
    </main>
  );
}

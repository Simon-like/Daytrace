import Link from "next/link";
import type { RecordSummary } from "@daytrace/contracts";

export function OwnerRecordList({ records }: { records: readonly RecordSummary[] }) {
  if (records.length === 0) return <p>主人视图当前没有可显示的记录。</p>;
  return (
    <ul className="record-list">
      {records.map((record) => (
        <li key={record.id}>
          <article className="record-card">
            <div className="record-meta">
              <span>{record.visibility === "private" ? "私密" : "公开"}</span>
              <span>{record.status}</span>
              <time dateTime={record.updatedAt}>{record.occurredOn ?? "未记日期"}</time>
            </div>
            <h2><Link href={`/owner/records/${record.id}/`}>{record.title}</Link></h2>
            {record.summary === null ? null : <p>{record.summary}</p>}
          </article>
        </li>
      ))}
    </ul>
  );
}

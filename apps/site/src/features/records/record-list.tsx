import Link from "next/link";
import type { RecordSummary } from "@daytrace/contracts";

const TYPE_LABELS = {
  engineering: "技术实践",
  recipe: "生活经验",
  reflection: "随想认知",
} as const;

export function RecordList({ records }: { records: readonly RecordSummary[] }) {
  if (records.length === 0) {
    return <p className="empty-state">当前公开快照没有记录。这是空集合，不是读取失败。</p>;
  }
  return (
    <ul className="record-list">
      {records.map((record) => (
        <li key={record.id}>
          <article className="record-card">
            <div className="record-meta">
              <span>{TYPE_LABELS[record.type]}</span>
              <time dateTime={record.updatedAt}>{record.occurredOn ?? "未记日期"}</time>
            </div>
            <h2><Link href={`/records/${record.id}/`}>{record.title}</Link></h2>
            {record.summary === null ? null : <p>{record.summary}</p>}
            <div className="tag-row" aria-label="标签">
              {record.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

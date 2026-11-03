import Link from "next/link";
import type { RecordSummary } from "@daytrace/contracts";

export const RECORD_TYPE_LABELS = {
  engineering: "技术实践",
  recipe: "生活经验",
  reflection: "随想认知",
} as const;

interface RecordListProps {
  readonly records: readonly RecordSummary[];
  readonly emptyMessage?: string;
  readonly onRecordClick?: (record: RecordSummary) => void;
}

export function RecordList({
  records,
  emptyMessage = "当前公开快照没有记录。这是空集合，不是读取失败。",
  onRecordClick,
}: RecordListProps) {
  if (records.length === 0) return <p className="archive-record-empty">{emptyMessage}</p>;
  return (
    <ul className="archive-record-list motion-region">
      {records.map((record) => (
        <li key={record.id}>
          <article className="archive-record">
            <time className="archive-record-date" dateTime={record.occurredOn ?? record.updatedAt}>{record.occurredOn ?? "未记日期"}</time>
            <div className="archive-record-content">
              <p className="archive-record-type">{RECORD_TYPE_LABELS[record.type]}</p>
              <h2 className="archive-record-title">
                <Link
                  href={`/records/${record.id}/`}
                  {...(onRecordClick === undefined ? {} : { onClick: () => onRecordClick(record) })}
                >{record.title}</Link>
              </h2>
              {record.summary === null ? null : <p className="archive-record-summary">{record.summary}</p>}
              <div className="archive-record-tags" aria-label="标签">
                {record.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

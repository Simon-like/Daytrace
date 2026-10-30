import Link from "next/link";
import type { RecordSummary } from "@daytrace/contracts";
import styles from "./record-list.module.css";

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
  if (records.length === 0) return <p className={styles.empty}>{emptyMessage}</p>;
  return (
    <ul className={styles.list}>
      {records.map((record) => (
        <li key={record.id}>
          <article className={styles.card}>
            <div className={styles.meta}>
              <span>{RECORD_TYPE_LABELS[record.type]}</span>
              <time dateTime={record.updatedAt}>{record.occurredOn ?? "未记日期"}</time>
            </div>
            <h2 className={styles.title}>
              <Link
                href={`/records/${record.id}/`}
                {...(onRecordClick === undefined ? {} : { onClick: () => onRecordClick(record) })}
              >{record.title}</Link>
            </h2>
            {record.summary === null ? null : <p className={styles.summary}>{record.summary}</p>}
            <div className={styles.tags} aria-label="标签">
              {record.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

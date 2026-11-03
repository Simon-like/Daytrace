import Link from "next/link";
import type { RecordSummary, RecordType } from "@daytrace/contracts";

export const TYPE_LABELS: Readonly<Record<RecordType, string>> = {
  engineering: "技术实践",
  recipe: "生活经验",
  reflection: "随想认知",
};

export function MobileRecordList({ records, onRecordClick }: { readonly records: readonly RecordSummary[]; readonly onRecordClick?: () => void }) {
  if (records.length === 0) return <div className="h5-empty"><span aria-hidden="true">⌁</span><h2>这一页暂时空着</h2><p>换个筛选条件，或稍后再回来翻翻。</p></div>;
  return <ul className="h5-records">{records.map(record => <li key={record.id}><article>
    <div className="h5-record-meta"><span>{TYPE_LABELS[record.type]}</span><time dateTime={record.occurredOn ?? record.updatedAt}>{record.occurredOn ?? "未记日期"}</time></div>
    <h2><Link href={`/records/${record.id}/`} {...(onRecordClick ? { onClick: onRecordClick } : {})}>{record.title}</Link></h2>
    {record.summary ? <p>{record.summary}</p> : null}
    <div className="h5-record-foot"><span>{record.tags.slice(0, 2).map(tag => `#${tag}`).join("  ")}</span><span aria-hidden="true">↗</span></div>
  </article></li>)}</ul>;
}

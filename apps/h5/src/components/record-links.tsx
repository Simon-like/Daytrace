import Link from "next/link";
import type { RecordDetail, RecordSummary } from "@daytrace/contracts";

function byPracticeDate(a: RecordSummary, b: RecordSummary): number {
  return (a.occurredOn ?? "9999-12-31").localeCompare(b.occurredOn ?? "9999-12-31") || a.id.localeCompare(b.id);
}

export function RecordLinks({ record, owner = false }: { readonly record: RecordDetail; readonly owner?: boolean }) {
  const href = (id: string) => `${owner ? "/owner" : ""}/records/${id}/`;
  if (record.type === "recipe") {
    const practices = [record, ...record.relatedRecords.filter(item => item.type === "recipe")].sort(byPracticeDate);
    if (practices.length >= 2) {
      return <section className="h5-record-links" aria-labelledby="h5-record-practices-title"><p className="h5-kicker">RECOOK / 对照这一次与下一次</p><h2 id="h5-record-practices-title">跨次实践</h2><ol className="h5-record-link-list">{practices.map(item => <li className="h5-record-link-item" key={item.id}><div className="h5-record-link-date">{item.occurredOn === null ? <span>未记日期</span> : <time dateTime={item.occurredOn}>{item.occurredOn}</time>}{item.id === record.id ? <span>本次</span> : null}</div><Link className="h5-record-link-title" href={href(item.id)} aria-current={item.id === record.id ? "page" : undefined}>{item.title}</Link>{item.summary ? <p>{item.summary}</p> : null}</li>)}</ol></section>;
    }
  }
  if (record.relatedRecords.length === 0) return null;
  return <section className="h5-record-links" aria-labelledby="h5-related-records-title"><p className="h5-kicker">CONNECTED NOTES / 沿着线索继续</p><h2 id="h5-related-records-title">关联记录</h2><ul className="h5-record-link-list">{record.relatedRecords.map(item => <li className="h5-record-link-item" key={item.id}><div className="h5-record-link-date">{item.occurredOn === null ? <span>未记日期</span> : <time dateTime={item.occurredOn}>{item.occurredOn}</time>}</div><Link className="h5-record-link-title" href={href(item.id)}>{item.title}</Link>{item.summary ? <p>{item.summary}</p> : null}</li>)}</ul></section>;
}

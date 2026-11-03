import Link from "next/link";
import type { RecordDetail, RecordSummary } from "@daytrace/contracts";
import styles from "./reader.module.css";

function byPracticeDate(a: RecordSummary, b: RecordSummary): number {
  return (a.occurredOn ?? "9999-12-31").localeCompare(b.occurredOn ?? "9999-12-31") || a.id.localeCompare(b.id);
}

export function RecordLinks({ record, owner = false }: { readonly record: RecordDetail; readonly owner?: boolean }) {
  const href = (id: string) => `${owner ? "/owner" : ""}/records/${id}/`;
  if (record.type === "recipe") {
    const practices = [record, ...record.relatedRecords.filter(item => item.type === "recipe")].sort(byPracticeDate);
    if (practices.length >= 2) {
      return (
        <section className={styles.recordLinks} aria-labelledby="record-practices-title">
          <p className={styles.recordLinksKicker}>RECOOK / 对照这一次与下一次</p>
          <h2 id="record-practices-title">跨次实践</h2>
          <ol className={styles.recordLinkList}>
            {practices.map(item => (
              <li className={styles.recordLinkItem} key={item.id}>
                <div className={styles.recordLinkDate}>
                  {item.occurredOn === null ? <span>未记日期</span> : <time dateTime={item.occurredOn}>{item.occurredOn}</time>}
                  {item.id === record.id ? <span>本次</span> : null}
                </div>
                <div className={styles.recordLinkBody}>
                  <Link className={styles.recordLinkTitle} href={href(item.id)} aria-current={item.id === record.id ? "page" : undefined}>{item.title}</Link>
                  {item.summary ? <p>{item.summary}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
    }
  }
  if (record.relatedRecords.length === 0) return null;
  return (
    <section className={styles.recordLinks} aria-labelledby="related-records-title">
      <p className={styles.recordLinksKicker}>CONNECTED NOTES / 沿着线索继续</p>
      <h2 id="related-records-title">关联记录</h2>
      <ul className={styles.recordLinkList}>
        {record.relatedRecords.map(item => (
          <li className={styles.recordLinkItem} key={item.id}>
            <div className={styles.recordLinkDate}>
              {item.occurredOn === null ? <span>未记日期</span> : <time dateTime={item.occurredOn}>{item.occurredOn}</time>}
            </div>
            <div className={styles.recordLinkBody}>
              <Link className={styles.recordLinkTitle} href={href(item.id)}>{item.title}</Link>
              {item.summary ? <p>{item.summary}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

import Link from "next/link";
import { RECORD_TYPE_LABELS } from "../records/record-list";
import { HighlightedText } from "./highlighted-text";
import type { PublicSearchItem } from "./search-contract";
import type { SearchScope } from "./search-api";
import styles from "./search-results.module.css";

interface SearchResultsProps {
  readonly items: readonly PublicSearchItem[];
  readonly onRecordClick?: () => void;
  readonly scope?: SearchScope;
}

export function SearchResults({ items, onRecordClick, scope = "public" }: SearchResultsProps) {
  return (
    <ul className={`${styles.list} motion-region`} aria-label={scope === "owner" ? "主人搜索结果" : "公开搜索结果"}>
      {items.map((item) => (
        <li key={item.record.id}>
          <article className={styles.result}>
            <div className={styles.meta}>
              <span>{RECORD_TYPE_LABELS[item.record.type]}</span>
              {scope === "owner" ? <span>{item.record.visibility === "private" ? "私密" : "公开"}</span> : null}
              <time dateTime={item.record.updatedAt}>{item.record.occurredOn ?? "未记日期"}</time>
            </div>
            <h2 className={styles.title}>
              <Link
                href={scope === "owner" ? `/owner/records/${item.record.id}/` : `/records/${item.record.id}/`}
                {...(onRecordClick === undefined ? {} : { onClick: onRecordClick })}
              >{item.record.title}</Link>
            </h2>
            {item.matches.map((match, index) => (
              <p key={`${match.field}-${index}`} className={styles.match}>
                <span className={styles.field}>{match.field === "title" ? "标题" : match.field === "tag" ? "标签" : "正文"}</span>
                <span><HighlightedText text={match.text} ranges={match.ranges} /></span>
              </p>
            ))}
          </article>
        </li>
      ))}
    </ul>
  );
}

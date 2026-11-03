import type { RecordDetail } from "@daytrace/contracts";
import { RecordBody } from "./record-body";
import {
  createReaderToc,
  createRecipeQuickLinks,
  RECORD_TYPE_LABELS,
  type ReaderSupplement,
} from "./reader-model";
import { TableOfContents } from "./table-of-contents";
import { RecordLinks } from "./record-links";
import styles from "./reader.module.css";

export interface ReaderArticleProps {
  readonly record: RecordDetail;
  readonly owner?: boolean;
  readonly supplements?: readonly ReaderSupplement[];
  readonly marginNote?: string;
}

function Supplements({ items }: { readonly items: readonly ReaderSupplement[] }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.supplements} aria-labelledby="reader-supplements-title">
      <p className={styles.supplementKicker} id="reader-supplements-title">后来补充 / REVISIONS</p>
      {items.map((item) => (
        <section className={styles.supplement} key={item.id} aria-labelledby={`supplement-${item.id}`}>
          <time className={styles.supplementDate} dateTime={item.occurredOn}>{item.occurredOn}</time>
          <div className={styles.supplementBody}>
            <h2 id={`supplement-${item.id}`}>{item.title ?? "后来补充"}</h2>
            <p>{item.text}</p>
          </div>
        </section>
      ))}
    </section>
  );
}

export function ReaderArticle({ record, owner = false, supplements = [], marginNote }: ReaderArticleProps) {
  const toc = createReaderToc(record.body.toc);
  const quickLinks = record.type === "recipe" ? createRecipeQuickLinks(toc) : [];

  return (
    <article className={`${styles.reader} ${styles[record.type]}`}>
      <header className={`${styles.header} dt-scene-title`}>
        <p className={styles.eyebrow}>FIELD NOTE / {RECORD_TYPE_LABELS[record.type]}</p>
        <h1>{record.title}</h1>
        <div className={styles.meta}>
          {record.occurredOn === null ? <span>未记日期</span> : <time dateTime={record.occurredOn}>{record.occurredOn}</time>}
          <span>修订 {record.revision}</span>
        </div>
        {record.summary === null || record.summary === "" ? null : <p className={styles.summary}>{record.summary}</p>}
        {record.tags.length === 0 ? null : (
          <ul className={styles.tags} aria-label="标签">
            {record.tags.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}
      </header>

      {quickLinks.length === 0 ? null : (
        <nav className={styles.recipeQuickNav} aria-label="菜谱快速定位">
          <span>下厨时，直接翻到</span>
          <ul>
            {quickLinks.map((link) => <li key={link.id}><a href={`#${link.target}`}>{link.label}</a></li>)}
          </ul>
        </nav>
      )}

      <div className={styles.layout}>
        {toc.length === 0 ? null : (
          <TableOfContents items={toc} {...(marginNote === undefined ? {} : { marginNote })} />
        )}
        <div className={styles.bodyColumn}>
          <RecordBody html={record.body.html} />
          <Supplements items={supplements} />
          <RecordLinks record={record} owner={owner} />
        </div>
      </div>
    </article>
  );
}

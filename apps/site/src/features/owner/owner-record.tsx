import type { RecordDetail } from "@daytrace/contracts";

export function OwnerRecord({ record }: { record: RecordDetail }) {
  return (
    <article>
      <header className="reader-header">
        <p className="eyebrow">主人视图 / {record.visibility === "private" ? "私密" : "公开"}</p>
        <h1>{record.title}</h1>
        <div className="record-meta"><time dateTime={record.updatedAt}>{record.updatedAt}</time></div>
      </header>
      <div className="record-body" dangerouslySetInnerHTML={{ __html: record.body.html }} />
    </article>
  );
}

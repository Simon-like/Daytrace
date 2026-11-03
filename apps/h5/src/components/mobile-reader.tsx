import Link from "next/link";
import { useId } from "react";
import type { RecordDetail, RecordType } from "@daytrace/contracts";
import { OwnerSessionControls } from "../features/owner/owner-session";
import { ReaderEnhancements } from "./reader-enhancements";
import { RecordLinks } from "./record-links";

const labels: Readonly<Record<RecordType, string>> = { engineering: "技术实践", recipe: "生活经验", reflection: "随想认知" };

export function MobileReader({ record, owner = false }: { readonly record: RecordDetail; readonly owner?: boolean }) {
  const targetId = useId();
  const returnHref = owner ? "/owner" : "/archive";
  return <main className="h5-reader"><div className="h5-reader-back"><Link href={returnHref}>{owner ? "← 返回主人空间" : "← 返回归档"}</Link>{owner ? <OwnerSessionControls /> : <span>FIELD NOTE</span>}</div>{owner ? <div className="h5-private-banner">仅在主人空间中可见{process.env.DAYTRACE_DEMO === "1" ? " · 当前为示例资料" : ""}</div> : null}<article><header className="h5-reader-header dt-scene-title"><p className="h5-kicker">{labels[record.type]} / {record.occurredOn ?? "未记日期"}</p><h1>{record.title}</h1><div className="h5-reader-meta"><span>修订 {record.revision}</span><span>{record.tags.map(tag => `#${tag}`).join("  ")}</span></div>{record.summary ? <p>{record.summary}</p> : null}</header>{record.body.toc.length ? <details className="h5-reader-toc"><summary>本页目录 <span>{record.body.toc.length} 节</span></summary><nav aria-label="本文目录">{record.body.toc.map(item => <a key={item.id} href={`#${encodeURIComponent(item.id)}`} data-level={item.level}>{item.text}</a>)}</nav></details> : null}<div id={targetId} className="h5-reader-body" dangerouslySetInnerHTML={{ __html: record.body.html }} /><RecordLinks record={record} owner={owner} /><ReaderEnhancements targetId={targetId} /></article><footer className="h5-reader-footer"><p>{owner ? "有些话，留在这里就很好。" : "这一页，先记到这里。"}</p><Link href={returnHref}>{owner ? "回到主人空间 →" : "继续翻阅归档 →"}</Link></footer></main>;
}

"use client";
import { useCallback, useEffect, useState } from "react";
import type { RecordSummary } from "@daytrace/contracts";
import { managementRequest, type Library, type ImportPreview, typeLabels, statusLabels } from "./api";
import { UploadPanel } from "./upload-panel";
import { ImportReview } from "./import-preview";
import { RecordEditor } from "./record-editor";
import styles from "./content-management.module.css";
export function ContentManager() {
  const [library,setLibrary] = useState<Library | null>(null); const [error,setError] = useState(""); const [notice,setNotice] = useState("");
  const [batch,setBatch] = useState<ImportPreview | null>(null); const [target,setTarget] = useState<RecordSummary | null>(null); const [editing,setEditing] = useState<string | null>(null);
  const [query,setQuery] = useState(""); const [type,setType] = useState(""); const [status,setStatus] = useState(""); const [visibility,setVisibility] = useState("");
  const reload = useCallback(async () => { setError(""); try { setLibrary(await managementRequest<Library>("content")); } catch (e) { setError((e as Error).message); } },[]);
  useEffect(() => {
    void reload();
    const saved = sessionStorage.getItem("daytrace-import-preview");
    if (saved) void managementRequest<ImportPreview>(`imports/${saved}`).then(setBatch).catch(() => { sessionStorage.removeItem("daytrace-import-preview"); });
  },[reload]);
  async function done(message: string) { sessionStorage.removeItem("daytrace-import-preview"); setBatch(null); setTarget(null); setEditing(null); setNotice(message); await reload(); }
  const records = library?.items.filter(r => (!type || r.type === type) && (!status || r.status === status) && (!visibility || r.visibility === visibility) && `${r.title} ${r.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [];
  const selected = library?.items.find(r => r.id === editing);
  return <div className={styles.manager}>
    {error && <div className={styles.error} role="alert"><p>{error}</p><button type="button" onClick={reload}>重新读取内容库</button><a href="/owner">返回主人空间</a></div>}
    {!library && !error && <p role="status">正在打开内容库…</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {library && <>{batch ? <ImportReview key={batch.id} batch={batch} onDone={done} /> : <UploadPanel key={target?.id ?? "new"} target={target} onCancel={() => setTarget(null)} onPreview={value => { sessionStorage.setItem("daytrace-import-preview", value.id); setBatch(value); setNotice(""); }} />}
    <section className={styles.library} aria-labelledby="library-heading"><div className={styles.sectionHeading}><div><p className="eyebrow">YOUR PAGES</p><h2 id="library-heading">已经收好的记录</h2></div><span>{library.items.length} 篇</span></div>
      <div className={styles.filters}><label>找一页<input type="search" placeholder="搜索标题或标签" value={query} onChange={e => setQuery(e.target.value)} /></label><label>类型<select aria-label="筛选类型" value={type} onChange={e => setType(e.target.value)}><option value="">全部类型</option>{Object.entries(typeLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label><label>状态<select aria-label="筛选状态" value={status} onChange={e => setStatus(e.target.value)}><option value="">全部状态</option>{Object.entries(statusLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label><label>公开范围<select aria-label="筛选公开范围" value={visibility} onChange={e => setVisibility(e.target.value)}><option value="">全部范围</option><option value="private">私密</option><option value="public">公开</option></select></label></div>
      <div className={styles.records}>{records.map(record => <article key={record.id}><div><p className={styles.recordMeta}>{typeLabels[record.type]} · {statusLabels[record.status]} · {record.visibility === "private" ? "仅自己" : "公开"} · 修订 {record.revision}</p><h3><a href={`/owner/records/${record.id}`}>{record.title}</a></h3><p>{record.tags.join(" / ") || "还没有标签"}</p></div><div className={styles.actions}><button type="button" disabled={batch !== null} onClick={() => { setTarget(record); setEditing(null); window.scrollTo({ top: 0, behavior: "instant" }); }}>上传新版</button><button type="button" onClick={() => setEditing(record.id)}>管理</button><a href={`/api/v1/owner/content/${record.id}/export`}>导出</a></div></article>)}{records.length === 0 && <p className={styles.explanation}>{library.items.length ? "没有符合筛选的记录，换个条件再找找。" : "这里还是空的，上传第一篇写好的 Markdown 吧。"}</p>}</div>
    </section>{selected && <RecordEditor key={`${selected.id}-${selected.revision}`} record={selected} revision={library.contentRevision} onDone={done} onClose={() => setEditing(null)} />}</>}
  </div>;
}

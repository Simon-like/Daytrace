"use client";
import { useState } from "react";
import { RecordBody } from "../reader/record-body";
import { managementRequest, type ImportPreview, typeLabels } from "./api";
import styles from "./content-management.module.css";
export function ImportReview({ batch, onDone }: { batch: ImportPreview; onDone(message: string): Promise<void> }) {
  const [index,setIndex] = useState(0); const [mobile,setMobile] = useState(false);
  const [busy,setBusy] = useState(false); const [error,setError] = useState(""); const [publish,setPublish] = useState(false);
  const incoming = batch.records[index];
  const previous = batch.previousRecords?.find(r => r.id === incoming?.id);
  const [showPrevious,setShowPrevious] = useState(false);
  const record = showPrevious && previous ? previous : incoming;
  async function commit(status: "draft" | "published", visibility: "public" | "private") {
    setBusy(true); setError("");
    try {
      await managementRequest(`imports/${batch.id}/commit`, { baseRevision: batch.baseRevision, status, visibility });
      await onDone(visibility === "public" ? "文章已公开发布。" : status === "draft" ? "已保存到私密草稿。" : "已保存为私密文章。");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function discard() {
    setBusy(true); setError("");
    try { await managementRequest(`imports/${batch.id}/discard`, {}); await onDone("已丢弃这次预览，原文章未改变。"); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className={styles.review} aria-labelledby="review-heading">
    <div className={styles.sectionHeading}><div><p className="eyebrow">BEFORE IT FINDS A PLACE</p><h2 id="review-heading">先翻一遍。</h2></div><span className={styles.badge}>仅主人可见 · {batch.records.length} 篇</span></div>
    <p className={styles.explanation}>文档和附件已校验。保存或发布将应用这一批全部文章；更新已有文章时，保存草稿会撤下其当前公开版本。</p>
    <div className={styles.previewControls}><label>预览文章<select aria-label="预览文章" value={index} onChange={e => { setIndex(Number(e.target.value)); setShowPrevious(false); }}>{batch.records.map((r,i) => <option key={r.id} value={i}>{r.title}</option>)}</select></label><div className={styles.actions}><button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>桌面宽度</button><button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>手机宽度</button></div></div>
    {previous && <div className={styles.confirm}><p>更新「{previous.title}」：修订 {previous.revision} → {incoming?.revision}；附件 {previous.attachments.length} → {incoming?.attachments.length} 个。</p><div className={styles.actions}><button type="button" aria-pressed={!showPrevious} onClick={() => setShowPrevious(false)}>查看上传新版</button><button type="button" aria-pressed={showPrevious} onClick={() => setShowPrevious(true)}>对照当前版本</button></div></div>}
    {record && <article className={`${styles.preview} ${mobile ? styles.mobilePreview : ""}`}><p className="eyebrow">{typeLabels[record.type]} · {showPrevious ? "当前版本" : "上传预览"}</p><h3>{record.title}</h3><RecordBody key={record.id} html={record.body.html} /><p className={styles.explanation}>{record.attachments.length} 个附件</p></article>}
    <div className={styles.actions}><button type="button" disabled={busy} onClick={() => commit("draft","private")}>保存私密草稿</button><button type="button" disabled={busy} onClick={() => commit("published","private")}>保存私密文章</button><button className={styles.primary} type="button" disabled={busy} onClick={() => setPublish(true)}>公开发布…</button><button type="button" disabled={busy} onClick={discard}>丢弃本次预览</button></div>
    {publish && <div className={styles.confirm} role="group" aria-label="确认公开发布"><p>确认将这 {batch.records.length} 篇文章及附件公开？发布后访客可以阅读和下载。</p><div className={styles.actions}><button className={styles.primary} disabled={busy} type="button" onClick={() => commit("published","public")}>确认公开发布</button><button disabled={busy} type="button" onClick={() => setPublish(false)}>继续检查</button></div></div>}
    {busy && <p role="status">正在保存，请稍候…</p>}{error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}

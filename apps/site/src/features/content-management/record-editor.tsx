"use client";
import { useState } from "react";
import type { RecordSummary } from "@daytrace/contracts";
import { managementRequest, type Version, statusLabels } from "./api";
import styles from "./content-management.module.css";
export function RecordEditor({ record, revision, onDone, onClose }: { record: RecordSummary; revision: string; onDone(message: string): Promise<void>; onClose(): void }) {
  const [title,setTitle] = useState(record.title); const [slug,setSlug] = useState(record.slug); const [tags,setTags] = useState(record.tags.join("，"));
  const [status,setStatus] = useState(record.status); const [visibility,setVisibility] = useState(record.visibility);
  const [history,setHistory] = useState<Version[] | null>(null); const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  const [confirm,setConfirm] = useState(false);
  async function change(snapshot?: string) {
    if (!snapshot && visibility === "public" && status === "published" && record.visibility !== "public" && !confirm) { setConfirm(true); return; }
    setBusy(true); setError("");
    try {
      await managementRequest(`content/${record.id}`, snapshot ? { baseRevision: revision, snapshot } : {
        baseRevision: revision, title, slug, tags: tags.split(/[,，]/).map(t => t.trim()).filter(Boolean), status, visibility: status === "published" ? visibility : "private",
      });
      await onDone(snapshot ? "已恢复历史正文，当前公开范围保持不变。" : "文章信息已保存。");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function showHistory() {
    setBusy(true); setError("");
    try { setHistory(await managementRequest<Version[]>(`content/${record.id}/history`)); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className={styles.editor} aria-label={`管理 ${record.title}`}><div className={styles.sectionHeading}><h2>整理这一页</h2><button type="button" disabled={busy} onClick={onClose}>收起</button></div>
    <div className={styles.formGrid}><label>标题<input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></label><label>链接别名<input value={slug} maxLength={80} onChange={e => setSlug(e.target.value)} /><small>小写字母、数字和连字符；原别名会保留。</small></label><label>标签<input value={tags} onChange={e => setTags(e.target.value)} /><small>用逗号分隔。</small></label><label>状态<select aria-label="文章状态" value={status} onChange={e => setStatus(e.target.value as typeof status)}>{Object.entries(statusLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label><label>公开范围<select aria-label="公开范围" value={status === "published" ? visibility : "private"} disabled={status !== "published"} onChange={e => setVisibility(e.target.value as typeof visibility)}><option value="private">仅自己可见</option><option value="public">公开</option></select></label></div>
    <p className={styles.explanation}>文章地址由固定编号决定，改标题和别名不会让旧链接失效。草稿和归档文章保存在私密范围。</p>
    {confirm && <p className={styles.confirm}>这次保存会让文章及附件公开。再次选择“确认公开并保存”即可发布。</p>}
    <div className={styles.actions}><button className={styles.primary} type="button" disabled={busy} onClick={() => change()}>{confirm ? "确认公开并保存" : "保存文章信息"}</button><button type="button" disabled={busy} onClick={showHistory}>查看历史版本</button><a className={styles.buttonLink} href={`/api/v1/owner/content/${record.id}/export`}>导出 Markdown 与附件</a></div>
    {history && <div className={styles.history}><h3>这一页的版本</h3><p>恢复会生成新修订，保留当前公开范围。</p>{history.length === 0 ? <p>还没有通过内容库保存的历史版本。</p> : history.map(v => <div key={v.snapshot}><span><strong>修订 {v.record.revision} · {v.record.title}</strong><small>{new Date(v.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} · {v.action}</small></span><button type="button" disabled={busy} onClick={() => change(v.snapshot)}>恢复此正文</button></div>)}</div>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}

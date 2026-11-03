"use client";
import { useRef, useState, type InputHTMLAttributes } from "react";
import type { RecordSummary } from "@daytrace/contracts";
import { managementRequest, type ImportPreview, typeLabels } from "./api";
import styles from "./content-management.module.css";
interface Props { target: RecordSummary | null; onPreview(value: ImportPreview): void; onCancel(): void }
export function UploadPanel({ target, onPreview, onCancel }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<string>(target?.type ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  function choose(chosen: File[]) { setError(""); setFiles(chosen); }
  async function upload() {
    if (!files.length || busy) return;
    setBusy(true); setError("");
    try {
      if (files.reduce((n,f) => n + f.size,0) > 32 * 1024 * 1024) throw new Error("上传总量不能超过 32 MiB，请分批上传。");
      const form = new FormData();
      files.forEach(file => form.append("files", file, file.name));
      form.set("paths", JSON.stringify(files.map(f => f.webkitRelativePath || f.name)));
      if (type) form.set("type", type);
      if (target) { form.set("updateId",target.id); form.set("expectedRevision",String(target.revision)); }
      onPreview(await managementRequest<ImportPreview>("imports", form));
      setFiles([]); if (picker.current) picker.current.value = ""; if (folder.current) folder.current.value = "";
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className={styles.upload} aria-labelledby="upload-heading">
    <div className={styles.sectionHeading}><div><p className="eyebrow">{target ? "A NEW REVISION" : "ADD TO YOUR ARCHIVE"}</p><h2 id="upload-heading">{target ? `为「${target.title}」上传新版` : "把写好的，放进来。"}</h2></div>{target && <button type="button" onClick={onCancel} disabled={busy}>取消更新</button>}</div>
    <p className={styles.explanation}>{target ? "新版先单独预览。确认保存前，当前文章保持原样。" : "选择 Markdown 和附件，也可以上传整份 ZIP。先看一遍，再决定放在哪里。"}</p>
    <div className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) choose(Array.from(e.dataTransfer.files)); }}>
      <span className={styles.fileMark} aria-hidden="true">MD</span><p>{files.length ? `已选择 ${files.length} 个文件` : "拖入文档和附件，或从设备选择"}</p>
      <div className={styles.actions}><button type="button" disabled={busy} onClick={() => picker.current?.click()}>选择文件</button><button type="button" disabled={busy} onClick={() => folder.current?.click()}>选择文件夹</button></div>
      <input ref={picker} className={styles.hidden} type="file" multiple aria-label="选择 Markdown 和附件" accept=".md,.zip,.png,.jpg,.jpeg,.webp,.gif,.pdf,.txt" onChange={e => choose(Array.from(e.currentTarget.files ?? []))} />
      <input ref={folder} className={styles.hidden} type="file" multiple aria-label="选择内容文件夹" {...({ webkitdirectory: "" } as InputHTMLAttributes<HTMLInputElement>)} onChange={e => choose(Array.from(e.currentTarget.files ?? []))} />
      <small>单篇 Markdown 2 MiB · 单附件 20 MiB · 每批总量 32 MiB</small>
    </div>
    {files.length > 0 && <div className={styles.selected}><ul>{files.slice(0,8).map((f,i) => <li key={`${f.name}-${i}`}>{f.webkitRelativePath || f.name}<span>{Math.max(1,Math.round(f.size / 1024))} KB</span></li>)}{files.length > 8 && <li>另有 {files.length - 8} 个文件</li>}</ul></div>}
    <div className={styles.uploadFooter}><label>文章类型<select aria-label="文章类型" value={type} disabled={busy} onChange={e => setType(e.target.value)}><option value="">按文档类型，缺省为技术实践</option>{Object.entries(typeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className={styles.primary} type="button" disabled={busy || !files.length} onClick={upload}>{busy ? "正在整理与校验…" : "整理并预览"}</button></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <p className={styles.note}>先收进草稿里，慢慢整理也没关系。</p>
  </section>;
}

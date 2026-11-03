import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, open, rename, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import matter from "gray-matter";
import type { ContentSnapshot, SourceRecord, SourceFrontmatter } from "../content/content.types";
import { stateRoot, SNAPSHOT_ID, activeContentRoot } from "../content/content.repository";
import { loadContentSnapshot } from "../content/content.snapshot";
import { ContentService } from "../content/content.service";
import { invalid } from "./files";
import { conflict } from "./normalize";

export interface Manifest { id: string; baseRevision: string; ids: string[]; createdAt: string; fingerprint?: string; committed?: string }
export interface VersionInfo { snapshot: string; createdAt: string; action: string; ids: string[]; fingerprint?: string }
export async function putFile(root: string, relative: string, bytes: string | Buffer): Promise<void> {
  const file = join(root, relative); await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, bytes, { mode: 0o600 });
}
export async function copyRecord(record: SourceRecord, root: string, metadata?: SourceFrontmatter): Promise<void> {
  const source = await readFile(join(record.recordDirectory, "index.md"), "utf8");
  const directory = metadata ? `${metadata.visibility}/${metadata.id}` : dirname(record.sourceFile);
  await putFile(root, `${directory}/index.md`, metadata ? matter.stringify(matter(source).content, metadata) : source);
  for (const a of record.metadata.attachments) await putFile(root, `${directory}/${a.path}`, await readFile(join(record.recordDirectory, a.path)));
}
export async function clone(snapshot: ContentSnapshot, root: string, except: readonly string[] = []): Promise<void> {
  await mkdir(join(root, "public"), { recursive: true, mode: 0o700 });
  await mkdir(join(root, "private"), { recursive: true, mode: 0o700 });
  for (const record of snapshot.records) if (!except.includes(record.metadata.id)) await copyRecord(record, root);
}
export class ContentStore {
  readonly root: string;
  constructor(readonly content: ContentService) { this.root = stateRoot(content.contentRoot); }
  path(kind: "imports" | "snapshots", id: string): string {
    if (!SNAPSHOT_ID.test(id)) throw invalid("版本或导入编号无效");
    return join(this.root, kind, id);
  }
  async readManifest(id: string): Promise<Manifest> {
    try { return JSON.parse(await readFile(join(this.path("imports", id), "manifest.json"), "utf8")) as Manifest; }
    catch { throw invalid("导入批次不存在，请重新上传"); }
  }
  async exclusive<T>(work: () => Promise<T>): Promise<T> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    let handle;
    try { handle = await open(join(this.root, "write.lock"), "wx", 0o600); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "EEXIST") throw conflict(); throw e; }
    try { await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })); const disk = await loadContentSnapshot(await activeContentRoot(this.content.contentRoot));
      this.content.installSnapshot(disk);
      return await work(); }
    finally { await handle.close(); await rm(join(this.root, "write.lock"), { force: true }); }
  }
  async versions(): Promise<VersionInfo[]> {
    const directory = join(this.root, "snapshots");
    let names: string[];
    try { names = await readdir(directory); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
    const values: VersionInfo[] = [];
    for (const name of names.filter(n => SNAPSHOT_ID.test(n))) {
      try { values.push(JSON.parse(await readFile(join(directory, name, ".version.json"), "utf8")) as VersionInfo); }
      catch { /* incomplete unreferenced snapshot never enters history */ }
    }
    return values.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }
  async prepare(except: readonly string[] = []): Promise<{ id: string; root: string }> {
    const id = randomUUID(); const root = this.path("snapshots", id);
    await clone(this.content.currentSnapshot(), root, except); return { id, root };
  }
  async saveVersion(id: string, action: string, ids: string[], fingerprint?: string): Promise<void> {
    await putFile(this.path("snapshots", id), ".version.json", JSON.stringify({ snapshot: id, createdAt: new Date().toISOString(), action, ids, ...(fingerprint ? { fingerprint } : {}) }));
  }
  async publish(id: string, action: string, ids: string[], fingerprint?: string): Promise<void> {
    const snapshot = await loadContentSnapshot(this.path("snapshots", id));
    // Public records must not expose private/draft targets through authored links.
    const publicIds = new Set(snapshot.publicRecords.map(r => r.metadata.id));
    for (const r of snapshot.publicRecords) for (const match of r.detail.body.html.matchAll(/href="\/records\/(rec_[0-9a-f-]{36})\//g)) {
      if (!publicIds.has(match[1] ?? "")) throw invalid("公开文章引用了未公开的文章，请先处理关联或一起发布", r.metadata.title);
    }
    if (!(await this.versions()).length) {
      const baseline = await this.prepare(); await this.saveVersion(baseline.id, "首次变更前", this.content.currentSnapshot().records.map(r => r.metadata.id));
    }
    await this.saveVersion(id, action, ids, fingerprint);
    const temporary = join(this.root, `pointer-${randomUUID()}.tmp`);
    const handle = await open(temporary, "wx", 0o600);
    try { await handle.writeFile(JSON.stringify({ snapshot: id })); await handle.sync(); }
    finally { await handle.close(); }
    await rename(temporary, join(this.root, "current.json"));
    this.content.installSnapshot(snapshot);
  }
}

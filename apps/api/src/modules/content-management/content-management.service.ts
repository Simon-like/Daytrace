import { createHash, randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { isRecordId, type RecordStatus, type Visibility } from "@daytrace/contracts";
import { ContentService } from "../content/content.service";
import { activeContentRoot } from "../content/content.repository";
import { loadContentSnapshot } from "../content/content.snapshot";
import { toPublicSummary } from "../content/content.types";
import { ApiError, ContentSnapshotInvalidError, RecordNotFoundError } from "../../common/api-error";
import { archive, invalid, unpack, type InputFile } from "./files";
import { conflict, normalize, type ImportOptions } from "./normalize";
import { clone, ContentStore, copyRecord, putFile, type Manifest } from "./store";

export class ContentManagementService {
  readonly store: ContentStore;
  constructor(readonly content: ContentService) { this.store = new ContentStore(content); }
  list() { return { items: this.content.listOwner().items, contentRevision: this.content.ownerContentRevision }; }
  async import(input: InputFile[], options: ImportOptions) {
    const snapshot = await loadContentSnapshot(await activeContentRoot(this.content.contentRoot));
    this.content.installSnapshot(snapshot);
    const fingerprint = createHash("sha256").update(JSON.stringify(input.map(f => ({ path: f.path, hash: createHash("sha256").update(f.bytes).digest("hex") })).sort((a,b) => a.path.localeCompare(b.path)))).digest("hex");
    const records = normalize(unpack(input), snapshot, options);
    if (!options.updateId && records.every(r => !snapshot.records.some(old => old.metadata.id === r.metadata.id)) &&
        (await this.store.versions()).some(v => v.fingerprint === fingerprint)) throw invalid("相同文件已导入，请从原文章选择“上传新版”，避免重复记录。");
    const id = randomUUID(); const root = this.store.path("imports", id);
    const candidate = join(root, "content");
    try {
      await clone(snapshot, candidate, records.map(r => r.metadata.id));
      for (const r of records) {
        const directory = `private/${r.metadata.id}`;
        await putFile(candidate, `${directory}/index.md`, r.markdown);
        for (const file of r.files) await putFile(candidate, `${directory}/${file.path}`, file.bytes);
      }
      try { await loadContentSnapshot(candidate); }
      catch (error) {
        if (error instanceof ContentSnapshotInvalidError) throw new ApiError(422, "CONTENT_IMPORT_INVALID", "导入校验失败，原内容未改变", error.details.map(detail => {
          const record = records.find(r => detail.file === `private/${r.metadata.id}/index.md`);
          return { ...detail, ...(record ? { file: record.source } : {}) };
        }));
        throw error;
      }
      const manifest: Manifest = { id, fingerprint, baseRevision: snapshot.contentRevision, ids: records.map(r => r.metadata.id), createdAt: new Date().toISOString() };
      await putFile(root, "manifest.json", JSON.stringify(manifest));
      return await this.preview(id);
    } catch (error) { await rm(root, { recursive: true, force: true }); throw error; }
  }
  async preview(id: string) {
    const manifest = await this.store.readManifest(id);
    const snapshot = await loadContentSnapshot(join(this.store.path("imports", id), "content"));
    return { ...manifest, previousRecords: this.content.currentSnapshot().records.filter(r => manifest.ids.includes(r.metadata.id)).map(r => r.detail), records: snapshot.records.filter(r => manifest.ids.includes(r.metadata.id)).map(r => ({
      ...r.detail, body: { ...r.detail.body, html: r.detail.body.html.replaceAll("/api/v1/assets/", `/api/v1/owner/imports/${id}/assets/`) },
    })) };
  }
  async previewAsset(batch: string, assetId: string) {
    const manifest = await this.store.readManifest(batch);
    const snapshot = await loadContentSnapshot(join(this.store.path("imports", batch), "content"));
    for (const record of snapshot.records.filter(r => manifest.ids.includes(r.metadata.id))) {
      const asset = record.metadata.attachments.find(a => a.id === assetId);
      if (asset) return { bytes: await readFile(join(record.recordDirectory, asset.path)), mediaType: asset.mediaType };
    }
    throw new RecordNotFoundError();
  }
  async discard(id: string) {
    await this.store.readManifest(id);
    await rm(this.store.path("imports", id), { recursive: true, force: true });
    return { discarded: true };
  }
  async commit(id: string, input: { baseRevision?: unknown; status?: unknown; visibility?: unknown }) {
    return this.store.exclusive(async () => {
      const manifest = await this.store.readManifest(id);
      if (manifest.committed) return { committed: manifest.committed, ...this.list() };
      this.checkBase(input.baseRevision);
      if (manifest.baseRevision !== this.content.ownerContentRevision) throw conflict();
      const { status, visibility } = this.state(input);
      const source = await loadContentSnapshot(join(this.store.path("imports", id), "content"));
      const next = await this.store.prepare(manifest.ids);
      try {
        for (const record of source.records.filter(r => manifest.ids.includes(r.metadata.id))) {
          await copyRecord(record, next.root, { ...record.metadata, status, visibility });
        }
        await this.store.publish(next.id, "导入文档", manifest.ids, manifest.fingerprint);
      } catch (error) { await rm(next.root, { recursive: true, force: true }); throw error; }
      await putFile(this.store.path("imports", id), "manifest.json", JSON.stringify({ ...manifest, committed: next.id }));
      return { committed: next.id, ...this.list() };
    });
  }
  checkBase(value: unknown): void { if (value !== this.content.ownerContentRevision) throw conflict(); }
  state(input: { status?: unknown; visibility?: unknown }): { status: RecordStatus; visibility: Visibility } {
    if (!["draft", "published", "archived"].includes(String(input.status)) || !["private", "public"].includes(String(input.visibility))) throw invalid("请选择有效的状态与公开范围");
    if (input.status !== "published" && input.visibility !== "private") throw invalid("草稿和归档记录必须保存在私密范围");
    return { status: input.status as RecordStatus, visibility: input.visibility as Visibility };
  }
  async change(id: string, input: Record<string, unknown>) {
    return this.store.exclusive(async () => {
      this.checkBase(input.baseRevision);
      const current = this.content.getOwnerRecord(id);
      let source = current;
      if (input.snapshot !== undefined) {
        const snapshot = await loadContentSnapshot(this.store.path("snapshots", String(input.snapshot)));
        const previous = snapshot.records.find(r => r.metadata.id === id);
        if (!previous) throw new RecordNotFoundError(); source = previous;
      }
      const state = input.snapshot !== undefined ? { status: current.metadata.status, visibility: current.metadata.visibility } : this.state(input);
      const title = input.title === undefined ? source.metadata.title : input.title;
      const slug = input.slug === undefined ? source.metadata.slug : input.slug;
      const tags = input.tags === undefined ? source.metadata.tags : input.tags;
      const metadata = { ...source.metadata, ...state, title: title as string, slug: slug as string, tags: tags as string[],
        oldSlugs: [...new Set([...current.metadata.oldSlugs, ...source.metadata.oldSlugs, ...(current.metadata.slug !== slug ? [current.metadata.slug] : [])])].filter(alias => alias !== slug),
        revision: current.metadata.revision + 1, updatedAt: new Date().toISOString(),
      };
      const next = await this.store.prepare([id]);
      try {
        await copyRecord(source, next.root, metadata);
        await this.store.publish(next.id, input.snapshot ? "恢复历史正文" : "修改文章信息", [id]);
      } catch (error) {
        await rm(next.root, { recursive: true, force: true });
        if (error instanceof ContentSnapshotInvalidError) throw new ApiError(422, "CONTENT_IMPORT_INVALID", "文章信息校验失败", error.details);
        throw error;
      }
      return this.list();
    });
  }
  async history(id: string) {
    if (!isRecordId(id)) throw new RecordNotFoundError();
    this.content.getOwnerRecord(id);
    const versions = (await this.store.versions()).filter(v => v.ids.includes(id));
    const result = [];
    for (const version of versions) {
      const snapshot = await loadContentSnapshot(this.store.path("snapshots", version.snapshot));
      const record = snapshot.records.find(r => r.metadata.id === id);
      if (record) result.push({ ...version, record: toPublicSummary(record) });
    }
    return result;
  }
  async exportRecord(id: string): Promise<Buffer> {
    const record = this.content.getOwnerRecord(id);
    const files: InputFile[] = [{ path: `${id}/index.md`, bytes: await readFile(join(record.recordDirectory, "index.md")) }];
    for (const a of record.metadata.attachments) files.push({ path: `${id}/${a.path}`, bytes: await readFile(join(record.recordDirectory, a.path)) });
    return archive(files);
  }
}

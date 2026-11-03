import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { MARKDOWN_PARSE_REVISION } from "@daytrace/contracts";
import type { RecordDetail } from "@daytrace/contracts";
import { ContentSnapshotInvalidError, ContentSnapshotUnavailableError } from "../../common/api-error";
import type { ContentIssue, ContentSnapshot, SourceRecord } from "./content.types";
import { parseFrontmatter, validAttachmentPath } from "./frontmatter";
import { renderMarkdown } from "./markdown";

function issue(file: string, code: string, message: string, field?: string): ContentIssue {
  return { file, code, message, ...(field === undefined ? {} : { field }) };
}

function comparePublicRecords(left: SourceRecord, right: SourceRecord): number {
  const a = left.metadata;
  const b = right.metadata;
  if (a.occurredOn === null && b.occurredOn !== null) return 1;
  if (a.occurredOn !== null && b.occurredOn === null) return -1;
  if (a.occurredOn !== null && b.occurredOn !== null && a.occurredOn !== b.occurredOn) {
    return b.occurredOn.localeCompare(a.occurredOn);
  }
  return b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
}

async function validateAttachmentFiles(record: SourceRecord, hashes: readonly ReturnType<typeof createHash>[]): Promise<ContentIssue[]> {
  const issues: ContentIssue[] = [];
  let root: string;
  try {
    root = await realpath(record.recordDirectory);
  } catch {
    return [issue(record.sourceFile, "CONTENT_ATTACHMENT_PATH_INVALID", "记录目录无法安全解析")];
  }
  for (const [index, attachment] of record.metadata.attachments.entries()) {
    const field = `attachments[${index}].path`;
    if (!validAttachmentPath(attachment.path)) continue;
    try {
      const candidate = resolve(record.recordDirectory, ...attachment.path.split("/"));
      const actual = await realpath(candidate);
      if (!actual.startsWith(`${root}${sep}`)) {
        issues.push(issue(record.sourceFile, "CONTENT_ATTACHMENT_PATH_INVALID", "附件解析后越出记录目录", field));
        continue;
      }
      const stats = await lstat(candidate);
      if (stats.isSymbolicLink() || !stats.isFile()) {
        issues.push(issue(record.sourceFile, "CONTENT_ATTACHMENT_MISSING", "附件不存在、不是普通文件或为符号链接", field));
        continue;
      }
      const bytes = await readFile(actual);
      for (const hash of hashes) {
        hash.update(attachment.path);
        hash.update("\0");
        hash.update(bytes);
        hash.update("\0");
      }
    } catch {
      issues.push(issue(record.sourceFile, "CONTENT_ATTACHMENT_MISSING", "附件不存在或不可读取", field));
    }
  }
  return issues;
}

async function readSourceRecord(root: string, group: string, directoryName: string): Promise<{
  record: SourceRecord | null;
  sourceBytes: Buffer | null;
  issues: ContentIssue[];
}> {
  const recordDirectory = resolve(root, group, directoryName);
  const sourceFile = `${group}/${directoryName}/index.md`;
  try {
    const stats = await lstat(recordDirectory);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      return { record: null, sourceBytes: null, issues: [issue(sourceFile, "CONTENT_FIELD_INVALID", "记录必须是普通目录")] };
    }
    const sourceBytes = await readFile(join(recordDirectory, "index.md"));
    const parsed = parseFrontmatter(sourceBytes.toString("utf8"), sourceFile);
    if (parsed.metadata === null) return { record: null, sourceBytes, issues: parsed.issues };
    const rendered = renderMarkdown(parsed.body, parsed.metadata.attachments, sourceFile);
    if (rendered.html === null || rendered.issues.length > 0) {
      return { record: null, sourceBytes, issues: rendered.issues };
    }
    const metadata = parsed.metadata;
    const detail: RecordDetail = {
      id: metadata.id,
      type: metadata.type,
      title: metadata.title,
      slug: metadata.slug,
      oldSlugs: metadata.oldSlugs,
      occurredOn: metadata.occurredOn,
      updatedAt: metadata.updatedAt,
      revision: metadata.revision,
      tags: metadata.tags,
      summary: metadata.summary,
      status: metadata.status,
      visibility: metadata.visibility,
      relatedRecords: [],
      body: { html: rendered.html, toc: rendered.toc, parseRevision: rendered.parseRevision },
      attachments: metadata.attachments.map((attachment) => ({
        id: attachment.id,
        mediaType: attachment.mediaType,
        url: `/api/v1/assets/${attachment.id}`,
        ...(attachment.title === undefined ? {} : { title: attachment.title }),
        ...(attachment.width === undefined ? {} : { width: attachment.width }),
        ...(attachment.height === undefined ? {} : { height: attachment.height }),
      })),
    };
    return {
      record: { sourceFile, recordDirectory, metadata, detail },
      sourceBytes,
      issues: [],
    };
  } catch {
    return { record: null, sourceBytes: null, issues: [issue(sourceFile, "CONTENT_FIELD_REQUIRED", "记录缺少可读取的 index.md", "index.md")] };
  }
}

export async function loadContentSnapshot(contentRoot: string): Promise<ContentSnapshot> {
  const root = resolve(contentRoot);
  const records: SourceRecord[] = [];
  const issues: ContentIssue[] = [];
  const hash = createHash("sha256");
  hash.update(`daytrace-content-v1\0${MARKDOWN_PARSE_REVISION}\0`);
  const publicHash = createHash("sha256").update(`daytrace-public-content-v1\0${MARKDOWN_PARSE_REVISION}\0`);
  try {
    for (const group of ["private", "public"] as const) {
      const entries = await readdir(join(root, group), { withFileTypes: true });
      const names = entries.map((entry) => entry.name).filter((name) => !name.startsWith(".")).sort();
      for (const name of names) {
        const loaded = await readSourceRecord(root, group, name);
        issues.push(...loaded.issues);
        if (loaded.record !== null && loaded.sourceBytes !== null) {
          records.push(loaded.record);
          const digests = loaded.record.metadata.visibility === "public" && loaded.record.metadata.status === "published"
            ? [hash, publicHash] : [hash];
          for (const digest of digests) {
            digest.update(loaded.record.sourceFile);
            digest.update("\0");
            digest.update(loaded.sourceBytes);
            digest.update("\0");
          }
          issues.push(...await validateAttachmentFiles(loaded.record, digests));
        }
      }
    }
  } catch {
    throw new ContentSnapshotUnavailableError();
  }

  const ids = new Map<string, string>();
  const slugs = new Map<string, string>();
  const assets = new Map<string, string>();
  for (const record of records) {
    const metadata = record.metadata;
    if (ids.has(metadata.id)) issues.push(issue(record.sourceFile, "CONTENT_DUPLICATE_ID", "稳定记录 ID 重复", "id"));
    else ids.set(metadata.id, record.sourceFile);
    for (const slug of [metadata.slug, ...metadata.oldSlugs]) {
      if (slugs.has(slug)) issues.push(issue(record.sourceFile, "CONTENT_DUPLICATE_SLUG", `slug 命名空间冲突：${slug}`, "slug"));
      else slugs.set(slug, record.sourceFile);
    }
    for (const attachment of metadata.attachments) {
      if (assets.has(attachment.id)) issues.push(issue(record.sourceFile, "CONTENT_DUPLICATE_ASSET_ID", "附件 ID 重复", "attachments"));
      else assets.set(attachment.id, record.sourceFile);
    }
  }
  for (const record of records) {
    for (const relatedId of record.metadata.relatedRecords) {
      if (!ids.has(relatedId)) issues.push(issue(record.sourceFile, "CONTENT_FIELD_INVALID", `关联记录不存在：${relatedId}`, "relatedRecords"));
    }
  }
  if (issues.length > 0) throw new ContentSnapshotInvalidError(issues);
  records.sort((left, right) => left.sourceFile.localeCompare(right.sourceFile));
  const publicRecords = records.filter((record) =>
    record.metadata.status === "published" && record.metadata.visibility === "public",
  ).sort(comparePublicRecords);
  return { contentRevision: `sha256:${hash.digest("hex")}`, publicContentRevision: `sha256:${publicHash.digest("hex")}`, records, publicRecords };
}

export async function readAssetBytes(record: SourceRecord, assetId: string): Promise<{
  bytes: Buffer;
  mediaType: string;
  etag: string;
} | null> {
  const attachment = record.metadata.attachments.find((item) => item.id === assetId);
  if (attachment === undefined) return null;
  try {
    const root = await realpath(record.recordDirectory);
    const candidate = resolve(record.recordDirectory, ...attachment.path.split("/"));
    if (relative(root, candidate).startsWith("..") || basename(candidate) === "") return null;
    const actual = await realpath(candidate);
    if (!actual.startsWith(`${root}${sep}`)) return null;
    const stats = await lstat(candidate);
    if (stats.isSymbolicLink() || !stats.isFile()) return null;
    const bytes = await readFile(actual);
    return {
      bytes,
      mediaType: attachment.mediaType,
      etag: `"sha256-${createHash("sha256").update(bytes).digest("hex")}"`,
    };
  } catch {
    return null;
  }
}

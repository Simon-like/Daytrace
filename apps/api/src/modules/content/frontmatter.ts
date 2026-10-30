import matter from "gray-matter";
import { ASSET_ID_PATTERN, RECORD_ID_PATTERN } from "@daytrace/contracts";
import type { ContentIssue, SourceAttachment, SourceFrontmatter } from "./content.types";

const ALLOWED_FIELDS = new Set([
  "schemaVersion", "id", "type", "title", "slug", "oldSlugs", "occurredOn",
  "updatedAt", "revision", "tags", "summary", "status", "visibility", "attachments",
]);
const REQUIRED_FIELDS = [
  "schemaVersion", "id", "type", "title", "slug", "occurredOn", "updatedAt",
  "revision", "status", "visibility",
];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"]);
const ATTACHMENT_FIELDS = new Set(["id", "path", "mediaType", "title", "width", "height"]);

function issue(file: string, code: string, message: string, field?: string): ContentIssue {
  return { file, code, message, ...(field === undefined ? {} : { field }) };
}

function validText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= maximum &&
    value === value.trim() && value === value.normalize("NFC") &&
    !Array.from(value).some((character) => (character.codePointAt(0) ?? 0) < 32);
}

function validSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= 80 && SLUG_PATTERN.test(value);
}

export function validAttachmentPath(value: unknown): value is string {
  if (typeof value !== "string" || value === "" || value !== value.trim()) return false;
  if (value.includes("\\") || value.includes("\0") || value.startsWith("/")) return false;
  const parts = value.split("/");
  return !parts.some((part) => part === "" || part === "." || part === "..") && !parts[0]?.includes(":");
}

function normalizeOccurredOn(value: unknown): unknown {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : value;
}

function normalizeUpdatedAt(value: unknown): unknown {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : value;
}

function validOccurredOn(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function validUpdatedAt(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

function parseAttachments(value: unknown, file: string, issues: ContentIssue[]): SourceAttachment[] {
  if (!Array.isArray(value) || value.length > 100) {
    issues.push(issue(file, "CONTENT_FIELD_INVALID", "attachments 必须为最多 100 项的数组", "attachments"));
    return [];
  }
  const result: SourceAttachment[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  value.forEach((entry, index) => {
    const base = `attachments[${index}]`;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      issues.push(issue(file, "CONTENT_FIELD_INVALID", "附件必须是对象", base));
      return;
    }
    const item = entry as Record<string, unknown>;
    for (const key of Object.keys(item)) {
      if (!ATTACHMENT_FIELDS.has(key)) issues.push(issue(file, "CONTENT_FIELD_INVALID", `未知附件字段 ${key}`, `${base}.${key}`));
    }
    const id = item.id;
    const path = item.path;
    if (typeof id !== "string" || !ASSET_ID_PATTERN.test(id)) {
      issues.push(issue(file, "CONTENT_FIELD_INVALID", "附件 id 必须为 ast_ 加小写 UUID", `${base}.id`));
    } else if (ids.has(id)) {
      issues.push(issue(file, "CONTENT_FIELD_INVALID", "附件 id 不得重复", `${base}.id`));
    } else ids.add(id);
    if (!validAttachmentPath(path)) {
      issues.push(issue(file, "CONTENT_ATTACHMENT_PATH_INVALID", "附件路径必须是记录目录内的相对路径", `${base}.path`));
    } else if (paths.has(path)) {
      issues.push(issue(file, "CONTENT_FIELD_INVALID", "附件 path 不得重复", `${base}.path`));
    } else paths.add(path);
    if (typeof item.mediaType !== "string" || !MEDIA_TYPES.has(item.mediaType)) {
      issues.push(issue(file, "CONTENT_FIELD_INVALID", "mediaType 不在 v1 允许列表", `${base}.mediaType`));
    }
    if (item.title !== undefined && !validText(item.title, 120)) {
      issues.push(issue(file, "CONTENT_FIELD_INVALID", "附件 title 必须为纯文本", `${base}.title`));
    }
    for (const dimension of ["width", "height"] as const) {
      const dimensionValue = item[dimension];
      if (dimensionValue !== undefined && (typeof dimensionValue !== "number" || !Number.isSafeInteger(dimensionValue) || dimensionValue < 1)) {
        issues.push(issue(file, "CONTENT_FIELD_INVALID", "图片尺寸必须为正整数", `${base}.${dimension}`));
      }
    }
    if (
      typeof id === "string" && ASSET_ID_PATTERN.test(id) && validAttachmentPath(path) &&
      typeof item.mediaType === "string" && MEDIA_TYPES.has(item.mediaType)
    ) {
      result.push({
        id,
        path,
        mediaType: item.mediaType as SourceAttachment["mediaType"],
        ...(item.title === undefined ? {} : { title: item.title as string }),
        ...(item.width === undefined ? {} : { width: item.width as number }),
        ...(item.height === undefined ? {} : { height: item.height as number }),
      });
    }
  });
  return result;
}

export function parseFrontmatter(source: string, file: string): {
  metadata: SourceFrontmatter | null;
  body: string;
  issues: ContentIssue[];
} {
  const normalized = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { metadata: null, body: normalized, issues: [issue(file, "CONTENT_FRONTMATTER_MISSING", "文件必须以 YAML frontmatter 开始")] };
  }
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(normalized);
  } catch {
    return { metadata: null, body: "", issues: [issue(file, "CONTENT_FRONTMATTER_INVALID", "YAML frontmatter 无法解析")] };
  }
  const data = parsed.data as Record<string, unknown>;
  const issues: ContentIssue[] = [];
  for (const key of Object.keys(data)) {
    if (!ALLOWED_FIELDS.has(key)) issues.push(issue(file, "CONTENT_FIELD_INVALID", `未知字段 ${key}`, key));
  }
  for (const key of REQUIRED_FIELDS) {
    if (!(key in data)) {
      issues.push(issue(file, key === "visibility" ? "CONTENT_VISIBILITY_MISSING" : "CONTENT_FIELD_REQUIRED",
        key === "visibility" ? "visibility 缺失；安全默认 private，但快照失败" : `缺少必填字段 ${key}`, key));
    }
  }
  const occurredOn = normalizeOccurredOn(data.occurredOn);
  const updatedAt = normalizeUpdatedAt(data.updatedAt);
  const occurredSource = /^occurredOn:\s*(\d{4}-\d{2}-\d{2})\s*(?:#.*)?$/m.exec(normalized)?.[1];
  if (data.schemaVersion !== 1) issues.push(issue(file, "CONTENT_SCHEMA_UNSUPPORTED", "仅支持 schemaVersion: 1", "schemaVersion"));
  if (typeof data.id !== "string" || !RECORD_ID_PATTERN.test(data.id)) issues.push(issue(file, "CONTENT_FIELD_INVALID", "id 必须为 rec_ 加小写 UUID", "id"));
  if (!["engineering", "recipe", "reflection"].includes(String(data.type))) issues.push(issue(file, "CONTENT_FIELD_INVALID", "type 不在 v1 允许列表", "type"));
  if (!validText(data.title, 120)) issues.push(issue(file, "CONTENT_FIELD_INVALID", "title 必须为 1–120 字 NFC 纯文本", "title"));
  if (!validSlug(data.slug)) issues.push(issue(file, "CONTENT_FIELD_INVALID", "slug 格式无效", "slug"));
  if (!validOccurredOn(occurredOn) || (occurredSource !== undefined && occurredSource !== occurredOn)) {
    issues.push(issue(file, "CONTENT_FIELD_INVALID", "occurredOn 必须为真实存在的 YYYY-MM-DD 或 null", "occurredOn"));
  }
  if (!validUpdatedAt(updatedAt)) issues.push(issue(file, "CONTENT_FIELD_INVALID", "updatedAt 必须为带时区的 RFC 3339 时间", "updatedAt"));
  if (typeof data.revision !== "number" || !Number.isSafeInteger(data.revision) || data.revision < 1) issues.push(issue(file, "CONTENT_FIELD_INVALID", "revision 必须为从 1 开始的整数", "revision"));
  if (!["draft", "published", "archived"].includes(String(data.status))) issues.push(issue(file, "CONTENT_FIELD_INVALID", "status 不在 v1 允许列表", "status"));
  const visibility = data.visibility ?? "private";
  if (visibility !== "public" && visibility !== "private") issues.push(issue(file, "CONTENT_FIELD_INVALID", "visibility 仅支持 public/private", "visibility"));
  const oldSlugs = data.oldSlugs ?? [];
  if (!Array.isArray(oldSlugs) || oldSlugs.length > 16 || !oldSlugs.every(validSlug)) issues.push(issue(file, "CONTENT_FIELD_INVALID", "oldSlugs 必须为合法 slug 数组", "oldSlugs"));
  const tags = data.tags ?? [];
  if (!Array.isArray(tags) || tags.length > 16 || !tags.every((tag) => validText(tag, 32))) {
    issues.push(issue(file, "CONTENT_FIELD_INVALID", "tags 最多 16 个且每项为纯文本", "tags"));
  } else if (new Set(tags.map((tag) => tag.toLocaleLowerCase())).size !== tags.length) {
    issues.push(issue(file, "CONTENT_FIELD_INVALID", "tags 忽略大小写后不得重复", "tags"));
  }
  const summary = data.summary ?? null;
  if (summary !== null && (typeof summary !== "string" || summary.length > 280 || summary !== summary.trim())) {
    issues.push(issue(file, "CONTENT_FIELD_INVALID", "summary 必须为不超过 280 字的文本或 null", "summary"));
  }
  const attachments = parseAttachments(data.attachments ?? [], file, issues);
  if (issues.length > 0) return { metadata: null, body: parsed.content, issues };
  return {
    metadata: {
      schemaVersion: 1,
      id: data.id as string,
      type: data.type as SourceFrontmatter["type"],
      title: data.title as string,
      slug: data.slug as string,
      oldSlugs: oldSlugs as string[],
      occurredOn: occurredOn as string | null,
      updatedAt: updatedAt as string,
      revision: data.revision as number,
      tags: tags as string[],
      summary: summary as string | null,
      status: data.status as SourceFrontmatter["status"],
      visibility: visibility as SourceFrontmatter["visibility"],
      attachments,
    },
    body: parsed.content,
    issues: [],
  };
}

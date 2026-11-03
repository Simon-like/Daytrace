import matter from "gray-matter";
import { randomUUID } from "node:crypto";
import { posix } from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { isRecordId, type RecordType } from "@daytrace/contracts";
import { parseFrontmatter } from "../content/frontmatter";
import type { ContentSnapshot, SourceFrontmatter, SourceAttachment } from "../content/content.types";
import { ApiError } from "../../common/api-error";
import { invalid, mediaType, safePath, type InputFile } from "./files";

export interface NormalizedRecord { source: string; metadata: SourceFrontmatter; markdown: string; files: InputFile[] }
export interface ImportOptions { type?: RecordType; updateId?: string; expectedRevision?: number }
export function conflict(): ApiError { return new ApiError(409, "CONTENT_REVISION_CONFLICT", "内容已变化，请重新载入并检查差异后再操作。"); }
export function normalize(files: InputFile[], current: ContentSnapshot, options: ImportOptions): NormalizedRecord[] {
  const docs = files.filter(f => /\.md$/i.test(f.path));
  if (!docs.length || docs.length > 100) throw invalid("每批需要 1–100 篇 Markdown 文档");
  if (options.updateId && docs.length !== 1) throw invalid("更新已有文章时只选择一篇 Markdown 与附件");
  const parsed = docs.map(file => {
    if (file.bytes.length > 2 * 1024 * 1024) throw invalid("单篇 Markdown 不超过 2 MiB", file.path);
    let source: string;
    try { source = new TextDecoder("utf-8", { fatal: true }).decode(file.bytes).replace(/^\uFEFF/, ""); }
    catch { throw invalid("Markdown 必须使用 UTF-8 编码", file.path); }
    let input: ReturnType<typeof matter>;
    try { input = matter(source); } catch { throw invalid("YAML 文档头无法解析", file.path); }
    const data = input.data;
    if (data.schemaVersion !== undefined && data.id !== undefined) {
      const checked = parseFrontmatter(source, file.path);
      if (!checked.metadata) throw new ApiError(422, "CONTENT_IMPORT_INVALID", "标准内容包的文档头校验失败", checked.issues);
    }
    if (data.attachments !== undefined && (!Array.isArray(data.attachments) || !data.attachments.every((a: unknown) => a !== null && typeof a === "object" && "path" in a && typeof a.path === "string"))) throw invalid("attachments 必须是有效的附件清单", file.path);
    if (data.status !== undefined && !["draft", "published", "archived"].includes(data.status)) throw invalid("文章状态无效", file.path);
    if (data.visibility !== undefined && !["public", "private"].includes(data.visibility)) throw invalid("公开范围无效", file.path);
    if (data.oldSlugs !== undefined && (!Array.isArray(data.oldSlugs) || !data.oldSlugs.every((v: unknown) => typeof v === "string"))) throw invalid("oldSlugs 必须是文本数组", file.path);
    const id = options.updateId ?? data.id ?? `rec_${randomUUID()}`;
    if (!isRecordId(id)) throw invalid("文章 ID 格式无效", file.path);
    const previous = current.records.find(r => r.metadata.id === id);
    if (options.updateId && !previous) throw invalid("需要更新的文章不存在", file.path);
    if (previous && (options.expectedRevision ?? data.revision) !== previous.metadata.revision) throw conflict();
    let body = input.content;
    const firstHeading = /^\s*# ([^\r\n]+)(?:\r?\n|$)/.exec(body);
    const filename = posix.basename(file.path, ".md");
    const title = data.title ?? firstHeading?.[1]?.trim() ?? (filename === "index" ? posix.basename(posix.dirname(file.path)) : filename);
    if (firstHeading) body = body.slice(firstHeading[0].length);
    const defaultSlug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 65).replace(/-$/, "");
    return { file, data, id, previous, body, title, slug: data.slug ?? previous?.metadata.slug ?? `${defaultSlug || "note"}-${id.slice(-8)}` };
  });
  if (new Set(parsed.map(p => p.id)).size !== parsed.length) throw invalid("同一批次出现重复文章 ID");
  const docsByPath = new Map(parsed.map(p => [p.file.path, p]));
  return parsed.map(item => {
    const { file, data, previous } = item;
    const attachments: SourceAttachment[] = [];
    const resources: InputFile[] = [];
    const revisions: { start: number; end: number; value: string }[] = [];
    const sourceFiles = new Map(files.map(f => [f.path, f]));
    const addResource = (original: string): string => {
      let decoded: string;
      try { decoded = decodeURIComponent(original).normalize("NFC"); } catch { throw invalid("附件地址编码无效", file.path); }
      if (/[?#\\]/.test(decoded) || /^[a-z][a-z0-9+.-]*:/i.test(decoded) || decoded.startsWith("/")) throw invalid("图片/附件须为本地相对路径；请连同附件上传", file.path);
      const sourcePath = posix.normalize(posix.join(posix.dirname(file.path), decoded));
      const matching = files.filter(f => posix.basename(f.path) === posix.basename(sourcePath));
      const resource = sourceFiles.get(sourcePath) ?? (matching.length === 1 ? matching[0] : undefined);
      if (!resource || !safePath(sourcePath)) throw invalid(`缺少附件：${original}`, file.path);
      const simplePath = decoded.replace(/^\.\//, "");
      const path = safePath(simplePath) ? simplePath : `assets/${sourcePath}`;
      const existing = attachments.find(a => a.path === path);
      if (existing) return path;
      const declaration = Array.isArray(data.attachments) ? data.attachments.find((a: Record<string, unknown>) => typeof a.path === "string" && a.path.normalize("NFC") === simplePath) : undefined;
      const old = previous?.metadata.attachments.find(a => a.path === path);
      const type = mediaType(resource);
      const id = old?.id ?? declaration?.id ?? `ast_${randomUUID()}`;
      attachments.push({ id, path, mediaType: type,
        ...(declaration?.title ? { title: declaration.title } : {}),
        ...(declaration?.width ? { width: declaration.width } : {}),
        ...(declaration?.height ? { height: declaration.height } : {}),
      });
      resources.push({ path, bytes: resource.bytes });
      return path;
    };
    const tree = unified().use(remarkParse).use(remarkGfm).parse(item.body);
    const imageReferences = new Set<string>();
    visit(tree, "imageReference", node => { imageReferences.add(node.identifier); });
    visit(tree, node => {
      if (node.type !== "image" && node.type !== "link" && node.type !== "definition") return;
      const url = node.url;
      const isImage = node.type === "image" || node.type === "definition" && imageReferences.has(node.identifier);
      if (url.startsWith("#") || /^(https?:|mailto:)/i.test(url) && !isImage || /^\/records\/rec_[0-9a-f-]{36}\/(?:#.*)?$/.test(url) && !isImage) return;
      let value: string;
      const [withoutHash = "", fragment] = url.split("#");
      if (/\.md$/i.test(withoutHash) && !isImage) {
        let decoded: string; try { decoded = decodeURIComponent(withoutHash).normalize("NFC"); } catch { throw invalid("文章链接编码无效", file.path); }
        const targetPath = posix.normalize(posix.join(posix.dirname(file.path), decoded));
        const target = docsByPath.get(targetPath);
        if (!target) throw invalid(`文章链接没有目标，请将目标文章一起上传：${url}`, file.path);
        let anchor = fragment ?? "";
        try { anchor = decodeURIComponent(anchor); } catch { throw invalid("章节链接编码无效", file.path); }
        if (anchor && !/^(dt-|section-)/.test(anchor)) anchor = `dt-${anchor.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"")}`;
        value = `/records/${target.id}/${anchor ? `#${anchor}` : ""}`;
      } else value = addResource(url);
      // Replace the source URL only, retaining author formatting, titles and references.
      const start = node.position?.start.offset; const end = node.position?.end.offset;
      if (start === undefined || end === undefined) throw invalid("无法定位文档引用", file.path);
      const original = item.body.slice(start, end);
      const angle = original.indexOf(`<${url}>`);
      const offset = angle >= 0 ? angle + 1 : original.indexOf(url, node.type === "definition" ? original.indexOf(":") + 1 : original.indexOf("](") + 2);
      if (offset < 0) throw invalid("链接请使用标准 Markdown 相对地址", file.path);
      revisions.push({ start: start + offset, end: start + offset + url.length, value: value.split("/").map(part => encodeURI(part)).join("/") });
    });
    if (Array.isArray(data.attachments)) for (const a of data.attachments) if (a && typeof a.path === "string") addResource(a.path);
    let body = item.body;
    for (const edit of revisions.sort((a,b) => b.start - a.start)) body = body.slice(0, edit.start) + edit.value + body.slice(edit.end);
    const metadata = {
      schemaVersion: 1, ...data, id: item.id, title: item.title, slug: item.slug,
      type: options.type ?? data.type ?? previous?.metadata.type ?? "engineering",
      oldSlugs: [...new Set([...(previous?.metadata.oldSlugs ?? []), ...(data.oldSlugs ?? []),
        ...(previous && previous.metadata.slug !== item.slug ? [previous.metadata.slug] : [])])].filter(alias => alias !== item.slug),
      occurredOn: data.occurredOn ?? previous?.metadata.occurredOn ?? null,
      updatedAt: new Date().toISOString(), revision: (previous?.metadata.revision ?? 0) + 1,
      tags: data.tags ?? previous?.metadata.tags ?? [], summary: data.summary ?? previous?.metadata.summary ?? null,
      relatedRecords: data.relatedRecords ?? previous?.metadata.relatedRecords ?? [],
      status: "draft", visibility: "private", attachments,
    };
    const markdown = matter.stringify(body, metadata);
    const checked = parseFrontmatter(markdown, file.path);
    if (!checked.metadata) throw new ApiError(422, "CONTENT_IMPORT_INVALID", "文档头校验失败", checked.issues);
    return { source: file.path, metadata: checked.metadata, markdown, files: resources };
  });
}

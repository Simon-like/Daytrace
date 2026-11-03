import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import type { Root as MdRoot, Link, Image } from "mdast";
import type { Root as HtmlRoot, Element, RootContent } from "hast";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import typescript from "@shikijs/langs/typescript";
import javascript from "@shikijs/langs/javascript";
import json from "@shikijs/langs/json";
import css from "@shikijs/langs/css";
import html from "@shikijs/langs/html";
import bash from "@shikijs/langs/bash";
import python from "@shikijs/langs/python";
import githubDark from "@shikijs/themes/github-dark";
import katex from "katex";
import { MARKDOWN_PARSE_REVISION, RECORD_ID_PATTERN } from "@daytrace/contracts";
import type { ContentIssue, SourceAttachment } from "./content.types";

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const compiler = unified().use(remarkRehype, {
  footnoteLabel: "注释", footnoteBackLabel: "返回正文", clobberPrefix: "dt-footnote-",
}).use(rehypeSanitize, {
  ...defaultSchema, clobberPrefix: "",
  attributes: {
    ...defaultSchema.attributes,
    code: [["className", /^language-./, "math-inline", "math-display"]],
  },
}).use(rehypeStringify, { allowDangerousHtml: true });
let highlighter: ReturnType<typeof createHighlighterCoreSync> | undefined;
function highlight(source: string, language: string): string {
  highlighter ??= createHighlighterCoreSync({
    themes: [githubDark], langs: [typescript, javascript, json, css, html, bash, python],
    engine: createJavaScriptRegexEngine(),
  });
  const aliases: Record<string, string> = { ts: "typescript", js: "javascript", sh: "bash", py: "python" };
  const lang = aliases[language] ?? language;
  if (!highlighter.getLoadedLanguages().includes(lang) || source.length > 50_000) return escapeHtml(source);
  try {
    return highlighter.codeToHtml(source, { lang, theme: "github-dark" })
      .replace(/^<pre[^>]*><code[^>]*>/, "").replace(/<\/code><\/pre>$/, "");
  } catch { return escapeHtml(source); }
}
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
function text(node: RootContent): string {
  return "value" in node ? String(node.value) : "children" in node ? node.children.map(text).join("") : "";
}
function raw(value: string): RootContent { return { type: "raw", value } as unknown as RootContent; }

export function renderMarkdown(body: string, attachments: readonly SourceAttachment[], file: string): {
  html: string | null; toc: { id: string; text: string; level: number }[];
  parseRevision: typeof MARKDOWN_PARSE_REVISION; issues: ContentIssue[];
} {
  const issues: ContentIssue[] = [];
  const toc: { id: string; text: string; level: number }[] = [];
  const fail = (code: string, message: string, line?: number): void => {
    issues.push({ file, code, message: line === undefined ? message : `正文第 ${line} 行：${message}`, field: "body" });
  };
  const result = (html: string | null) => ({ html, toc: html === null ? [] : toc, parseRevision: MARKDOWN_PARSE_REVISION, issues });
  if (Buffer.byteLength(body) > 2 * 1024 * 1024) {
    fail("CONTENT_BODY_TOO_LARGE", "正文不能超过 2 MiB"); return result(null);
  }
  const tree = parser.parse(body) as MdRoot;
  const imageReferences = new Set<string>();
  visit(tree, "imageReference", node => { imageReferences.add(node.identifier); });
  const headings = new Map<string, number>();
  const usedIds = new Set<string>();
  const anchorMap = new Map<string, string>();
  visit(tree, node => {
    const line = node.position?.start.line;
    if (node.type === "html") fail("CONTENT_RAW_HTML_UNSUPPORTED", "不接收原始 HTML", line);
    if (node.type === "heading") {
      if (node.depth === 1) fail("CONTENT_HEADING_INVALID", "正文不使用 H1", line);
      const label = toString(node);
      const stem = label.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "heading";
      let count = (headings.get(stem) ?? 0) + 1;
      let id = `dt-${stem}${count === 1 ? "" : `-${count}`}`;
      while (usedIds.has(id)) { count++; id = `dt-${stem}-${count}`; }
      headings.set(stem, count); usedIds.add(id);
      anchorMap.set(`section-${toc.length + 1}`, id);
      if (!anchorMap.has(stem)) anchorMap.set(stem, id);
      node.data = { ...node.data, hProperties: { id } };
      toc.push({ id, text: label, level: node.depth });
    }
    if (node.type !== "image" && node.type !== "link" && node.type !== "definition") return;
    const isImage = node.type === "image" || node.type === "definition" && imageReferences.has(node.identifier);
    const target = node as Link | Image;
    const original = target.url;
    if (!isImage && (original.startsWith("#") ||
      /^\/records\/rec_[0-9a-f-]+\/(?:#[^\s]*)?$/.test(original) && RECORD_ID_PATTERN.test(original.split("/")[2] ?? ""))) return;
    if (!isImage && /^(https?:\/\/|mailto:)/i.test(original)) {
      try { if (!["http:", "https:", "mailto:"].includes(new URL(original).protocol)) throw Error(); }
      catch { fail("CONTENT_URL_UNSAFE", "链接 URL 无效", line); }
      return;
    }
    if (original.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(original)) {
      fail("CONTENT_URL_UNSAFE", "链接协议或站点路径不在允许范围", line); return;
    }
    let normalized = "";
    try { normalized = decodeURIComponent(original).replace(/^\.\//, ""); } catch { /* invalid URI reported below */ }
    const asset = attachments.find(a => a.path === normalized);
    if (!asset || /[?#\\]/.test(original) || original !== original.trim()) {
      fail("CONTENT_ATTACHMENT_UNDECLARED", "附件引用未声明或路径无效", line); return;
    }
    target.url = `/api/v1/assets/${asset.id}`;
  });
  if (issues.length) return result(null);
  visit(tree, "link", node => {
    if (node.url.startsWith("#")) {
      let key = node.url.slice(1); try { key = decodeURIComponent(key); } catch { /* preserve */ }
      const anchor = anchorMap.get(key);
      if (anchor) node.url = `#${anchor}`;
    }
  });
  const hast = compiler.runSync(tree) as HtmlRoot;
  let imageNumber = 0;
  // Only this trusted transformer can introduce raw HTML after sanitation.
  const enhance = (children: RootContent[]): void => {
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node?.type !== "element") continue;
      const classes = (node.properties.className ?? []) as string[];
      const code = node.tagName === "pre" ? node.children.find(n => n.type === "element" && n.tagName === "code") as Element | undefined : undefined;
      const mathNode = node.tagName === "code" && classes.includes("math-inline") ? node :
        code && (code.properties.className as string[] | undefined)?.includes("math-display") ? code : undefined;
      if (mathNode) {
        try {
          children[i] = raw(katex.renderToString(text(mathNode), { displayMode: node.tagName === "pre", trust: false,
            maxExpand: 1000, maxSize: 20, throwOnError: false, strict: "warn" }));
        } catch { children[i] = raw(`<code>${escapeHtml(text(mathNode))}</code>`); }
      } else if (code) {
        const lang = ((code.properties.className as string[] | undefined) ?? []).find(c => c.startsWith("language-"))?.slice(9) ?? "";
        const label = escapeHtml(lang.toUpperCase() || "CODE");
        children[i] = raw(`<div class="reader-code-block" data-reader-code><div class="reader-code-toolbar"><span class="reader-code-language">${label}</span><button class="reader-copy-button" type="button" data-code-copy aria-live="polite">复制代码</button></div><pre data-reader-code-scroll tabindex="0" role="region" aria-label="${label} 代码，可横向滚动"><code class="language-${escapeHtml(lang)}">${highlight(text(code), lang)}</code></pre><span class="reader-scroll-hint" data-scroll-hint aria-hidden="true">代码可左右滑动</span></div>`);
      } else if (node.tagName === "img") {
        const src = String(node.properties.src ?? "");
        const asset = attachments.find(a => src === `/api/v1/assets/${a.id}`);
        const alt = escapeHtml(String(node.properties.alt ?? ""));
        const caption = String(node.properties.title ?? ""); imageNumber++;
        children[i] = raw(`<figure class="reader-figure"><button class="reader-image-button" type="button" data-reader-image aria-label="查看图片：${alt}"><img src="${escapeHtml(src)}" alt="${alt}" loading="${imageNumber === 1 ? "eager" : "lazy"}" decoding="async"${asset?.width ? ` width="${asset.width}"` : ""}${asset?.height ? ` height="${asset.height}"` : ""}><span class="reader-image-error" data-image-error role="status"></span></button>${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`);
      } else {
        enhance(node.children as RootContent[]);
        if (node.tagName === "p" && node.children.length === 1 && node.children[0]?.type === "raw") { children[i] = node.children[0] as RootContent; }
        if (node.tagName === "a") node.properties.rel = ["noopener", "noreferrer"];
        if (node.tagName === "table") children[i] = { type: "element", tagName: "div", properties: {
          className: ["reader-table-scroll"], "data-reader-table": "", tabIndex: 0, role: "region", ariaLabel: "数据表格，可横向滚动",
        }, children: [node, { type: "element", tagName: "span", properties: { className: ["reader-scroll-hint"], "data-scroll-hint": "", ariaHidden: "true" }, children: [{ type: "text", value: "表格可左右滑动" }] }] };
        if (/^h[2-6]$/.test(node.tagName)) {
          const position = toc.findIndex(h => h.id === node.properties.id);
          children.splice(i, 0, raw(`<span id="section-${position + 1}" aria-hidden="true"></span>`)); i++;
        }
      }
    }
  };
  enhance(hast.children);
  return result(compiler.stringify(hast));
}

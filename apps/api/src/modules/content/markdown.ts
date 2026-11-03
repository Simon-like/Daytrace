import { Marked, type Token, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";
import { MARKDOWN_PARSE_REVISION, RECORD_ID_PATTERN } from "@daytrace/contracts";
import type { ContentIssue, SourceAttachment } from "./content.types";

function issue(file: string, code: string, message: string, field = "body"): ContentIssue {
  return { file, code, message, field };
}

function plainText(tokens: Token[] | undefined): string {
  return (tokens ?? []).map((token) => {
    if ("text" in token && typeof token.text === "string" && !("tokens" in token)) return token.text;
    if ("tokens" in token) return plainText(token.tokens);
    return "";
  }).join("");
}

function attachmentMap(attachments: readonly SourceAttachment[]): ReadonlyMap<string, string> {
  return new Map(attachments.map((attachment) => [attachment.path, attachment.id]));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export function renderMarkdown(
  body: string,
  attachments: readonly SourceAttachment[],
  file: string,
): {
  html: string | null;
  toc: { id: string; text: string; level: number }[];
  parseRevision: typeof MARKDOWN_PARSE_REVISION;
  issues: ContentIssue[];
} {
  const issues: ContentIssue[] = [];
  const toc: { id: string; text: string; level: number }[] = [];
  const assets = attachmentMap(attachments);
  const engine = new Marked({ gfm: true, async: false, breaks: false });
  let headingNumber = 0;
  const walkTokens = (token: Token): void => {
    if (token.type === "html") {
      issues.push(issue(file, "CONTENT_RAW_HTML_UNSUPPORTED", "v1 不接收原始 HTML"));
    }
    if (token.type === "heading") {
      headingNumber += 1;
      if (token.depth === 1) issues.push(issue(file, "CONTENT_HEADING_INVALID", "正文不使用 H1"));
      const id = `section-${headingNumber}`;
      (token as Tokens.Heading & { id: string }).id = id;
      toc.push({ id, text: plainText(token.tokens), level: token.depth });
    }
    if (token.type === "image" || token.type === "link") {
      const original = token.href;
      const isImage = token.type === "image";
      const mapAsset = (): void => {
        if (original !== original.trim() || /[?#\\]/.test(original)) {
          issues.push(issue(file, "CONTENT_ATTACHMENT_UNDECLARED", "附件引用不能带查询、锚点或反斜杠"));
          return;
        }
        let decoded: string;
        try {
          decoded = decodeURIComponent(original);
        } catch {
          issues.push(issue(file, "CONTENT_ATTACHMENT_UNDECLARED", "附件引用编码无效"));
          return;
        }
        const normalized = decoded.startsWith("./") ? decoded.slice(2) : decoded;
        const assetId = assets.get(normalized);
        if (assetId === undefined) {
          issues.push(issue(file, "CONTENT_ATTACHMENT_UNDECLARED", "正文引用未在 attachments 中显式声明"));
          return;
        }
        token.href = `/api/v1/assets/${assetId}`;
      };
      if (isImage) {
        mapAsset();
      } else if (original.startsWith("#")) {
        // In-page anchors remain unchanged.
      } else if (/^\/records\/rec_[0-9a-f-]+\/$/.test(original) && RECORD_ID_PATTERN.test(original.slice(9, -1))) {
        // Canonical internal record links remain unchanged.
      } else if (/^https?:\/\//i.test(original) || /^mailto:/i.test(original)) {
        try {
          const url = new URL(original);
          if (!["http:", "https:", "mailto:"].includes(url.protocol)) throw new Error("unsafe");
        } catch {
          issues.push(issue(file, "CONTENT_URL_UNSAFE", "链接 URL 无效"));
        }
      } else if (original.startsWith("/") || original.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(original)) {
        issues.push(issue(file, "CONTENT_URL_UNSAFE", "链接协议或站点路径不在允许范围"));
      } else {
        mapAsset();
      }
    }
  };
  engine.use({
    renderer: {
      heading(token) {
        const id = (token as Tokens.Heading & { id?: string }).id ?? "";
        return `<h${token.depth} id="${id}">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
      },
      code(token) {
        const language = token.lang?.trim().split(/\s+/, 1)[0] ?? "";
        const label = language === "" ? "CODE" : language.toUpperCase();
        const className = language === "" ? "" : ` class="language-${escapeHtml(language)}"`;
        return `<div class="reader-code-block" data-reader-code><div class="reader-code-toolbar"><span class="reader-code-language">${escapeHtml(label)}</span><button class="reader-copy-button" type="button" data-code-copy aria-live="polite">复制代码</button></div><pre data-reader-code-scroll tabindex="0" role="region" aria-label="${escapeHtml(label)} 代码，可横向滚动"><code${className}>${escapeHtml(token.text)}</code></pre><span class="reader-scroll-hint" data-scroll-hint aria-hidden="true">代码可左右滑动</span></div>\n`;
      },
      table(token) {
        const cell = (item: Tokens.TableCell, heading: boolean): string => {
          const tag = heading ? "th" : "td";
          const align = item.align === null ? "" : ` align="${item.align}"`;
          return `<${tag}${align}>${this.parser.parseInline(item.tokens)}</${tag}>`;
        };
        const header = token.header.map(item => cell(item, true)).join("");
        const rows = token.rows.map(row => `<tr>${row.map(item => cell(item, false)).join("")}</tr>`).join("\n");
        return `<div class="reader-table-scroll" data-reader-table tabindex="0" role="region" aria-label="数据表格，可横向滚动"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table><span class="reader-scroll-hint" data-scroll-hint aria-hidden="true">表格可左右滑动</span></div>\n`;
      },
      image(token) {
        const alt = escapeHtml(token.text);
        const title = token.title === null ? "" : ` title="${escapeHtml(token.title)}"`;
        const caption = token.title === null ? "" : `<figcaption>${escapeHtml(token.title)}</figcaption>`;
        return `<figure class="reader-figure"><button class="reader-image-button" type="button" data-reader-image aria-label="查看图片${token.text === "" ? "" : `：${alt}`}"><img src="${escapeHtml(token.href)}" alt="${alt}"${title} decoding="async"><span class="reader-image-error" data-image-error role="status"></span></button>${caption}</figure>\n`;
      },
    },
  });
  const tokens = engine.lexer(body);
  engine.walkTokens(tokens, walkTokens);
  if (issues.length > 0) return { html: null, toc: [], parseRevision: MARKDOWN_PARSE_REVISION, issues };
  const rendered = engine.parser(tokens);
  let imageNumber = 0;
  const html = sanitizeHtml(rendered, {
    allowedTags: [
      "p", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "strong", "em",
      "del", "a", "pre", "code", "hr", "br", "table", "thead", "tbody", "tr", "th", "td",
      "input", "img", "div", "span", "button", "figure", "figcaption",
    ],
    allowedAttributes: {
      h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
      a: ["href", "title", "rel"], code: ["class"], input: ["type", "checked", "disabled"],
      th: ["align"], td: ["align"],
      div: ["class", "data-reader-code", "data-reader-table", "tabindex", "role", "aria-label"],
      span: ["class", "data-scroll-hint", "data-image-error", "aria-hidden", "role"],
      button: ["class", "type", "data-code-copy", "data-reader-image", "aria-live", "aria-label"],
      figure: ["class"],
      pre: ["data-reader-code-scroll", "tabindex", "role", "aria-label"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      input: sanitizeHtml.simpleTransform("input", { disabled: "disabled" }),
      img: (_tagName, attributes) => {
        const asset = attachments.find(item => attributes.src === `/api/v1/assets/${item.id}`);
        imageNumber += 1;
        return { tagName: "img", attribs: {
          ...attributes, loading: imageNumber === 1 ? "eager" : "lazy", decoding: "async",
          ...(asset?.width === undefined ? {} : { width: String(asset.width) }),
          ...(asset?.height === undefined ? {} : { height: String(asset.height) }),
        } };
      },
    },
  });
  return { html, toc, parseRevision: MARKDOWN_PARSE_REVISION, issues: [] };
}

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
    },
  });
  const tokens = engine.lexer(body);
  engine.walkTokens(tokens, walkTokens);
  if (issues.length > 0) return { html: null, toc: [], parseRevision: MARKDOWN_PARSE_REVISION, issues };
  const rendered = engine.parser(tokens);
  const html = sanitizeHtml(rendered, {
    allowedTags: [
      "p", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "strong", "em",
      "del", "a", "pre", "code", "hr", "br", "table", "thead", "tbody", "tr", "th", "td",
      "input", "img",
    ],
    allowedAttributes: {
      h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
      a: ["href", "title", "rel"], code: ["class"], input: ["type", "checked", "disabled"],
      th: ["align"], td: ["align"], img: ["src", "alt", "title", "width", "height", "loading"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      input: sanitizeHtml.simpleTransform("input", { disabled: "disabled" }),
      img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
    },
  });
  return { html, toc, parseRevision: MARKDOWN_PARSE_REVISION, issues: [] };
}

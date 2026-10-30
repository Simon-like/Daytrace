import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { ContentValidationError, type ValidationIssue } from "./errors";

export interface ParsedRecord {
  id: string;
  slug: string;
  title: string;
  date: string;
  summary: string;
  visibility: string;
  status: string;
  html: string;
}

function requiredString(
  data: Record<string, unknown>,
  field: string,
  file: string,
  issues: ValidationIssue[],
): string {
  const value = data[field];
  if (typeof value !== "string" || value.trim() === "") {
    issues.push({ file, field, message: "Expected a non-empty string" });
    return "";
  }
  return value;
}

function validDate(value: unknown): value is string | Date {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function renderRecord(source: string, file: string): ParsedRecord {
  const parsed = matter(source);
  const data = parsed.data as Record<string, unknown>;
  const issues: ValidationIssue[] = [];
  const id = requiredString(data, "id", file, issues);
  const slug = requiredString(data, "slug", file, issues);
  const title = requiredString(data, "title", file, issues);
  const summary = requiredString(data, "summary", file, issues);
  const visibility = requiredString(data, "visibility", file, issues);
  const status = requiredString(data, "status", file, issues);

  if (!validDate(data.date)) {
    issues.push({ file, field: "date", message: "Expected an ISO calendar date" });
  }
  if (slug && !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    issues.push({ file, field: "slug", message: "Expected a lowercase URL-safe slug" });
  }
  if (visibility && visibility !== "public" && visibility !== "private") {
    issues.push({ file, field: "visibility", message: "Expected public or private" });
  }
  if (status && status !== "published" && status !== "draft" && status !== "archived") {
    issues.push({ file, field: "status", message: "Unknown publication status" });
  }
  if (issues.length > 0) throw new ContentValidationError(issues);

  const rawHtml = marked.parse(parsed.content, { gfm: true, async: false });
  const html = sanitizeHtml(rawHtml, {
    allowedTags: [
      "p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "strong", "em",
      "del", "a", "pre", "code", "hr", "br", "table", "thead", "tbody", "tr", "th", "td",
      "input",
    ],
    allowedAttributes: {
      a: ["href", "title", "rel"],
      code: ["class"],
      input: ["type", "checked", "disabled"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      input: sanitizeHtml.simpleTransform("input", { disabled: "disabled" }),
    },
  });

  const date = data.date instanceof Date
    ? data.date.toISOString().slice(0, 10)
    : data.date as string;
  return { id, slug, title, date, summary, visibility, status, html };
}

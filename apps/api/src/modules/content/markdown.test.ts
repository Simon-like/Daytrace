import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "./markdown";

const attachment = {
  id: "ast_7d0c0f2d-8f5b-4f0e-a3a6-444444444444",
  path: "images/check.png",
  mediaType: "image/png" as const,
};

test("one token stream produces stable heading IDs, TOC and asset URLs", () => {
  const result = renderMarkdown("## 第一节\n\n正文\n\n### 第二节\n\n![图](images/check.png)", [attachment], "public/a/index.md");
  assert.equal(result.html?.includes('<h2 id="section-1">第一节</h2>'), true);
  assert.equal(result.html?.includes(`/api/v1/assets/${attachment.id}`), true);
  assert.deepEqual(result.toc, [
    { id: "section-1", text: "第一节", level: 2 },
    { id: "section-2", text: "第二节", level: 3 },
  ]);
});

test("raw HTML, H1, dangerous links and undeclared assets fail validation", () => {
  const cases = [
    { body: "<script>alert(1)</script>", code: "CONTENT_RAW_HTML_UNSUPPORTED" },
    { body: "# 不允许的 H1", code: "CONTENT_HEADING_INVALID" },
    { body: "[危险](javascript:alert(1))", code: "CONTENT_URL_UNSAFE" },
    { body: "![缺失](images/missing.png)", code: "CONTENT_ATTACHMENT_UNDECLARED" },
  ];
  for (const item of cases) {
    const result = renderMarkdown(item.body, [attachment], "public/a/index.md");
    assert.equal(result.html, null);
    assert.ok(result.issues.some((issue) => issue.code === item.code));
  }
});

test("HTML-looking code remains readable text", () => {
  const result = renderMarkdown("```html\n<script>example()</script>\n```", [], "public/a/index.md");
  assert.ok(result.html?.includes("&lt;script&gt;"));
  assert.ok(!result.html?.includes("<script>"));
});

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
  assert.equal(result.html?.includes('<h2 id="dt-第一节">第一节</h2>'), true);
  assert.equal(result.html?.includes(`/api/v1/assets/${attachment.id}`), true);
  assert.deepEqual(result.toc, [
    { id: "dt-第一节", text: "第一节", level: 2 },
    { id: "dt-第二节", text: "第二节", level: 3 },
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

test("HTML-looking code remains readable text with server-rendered code semantics", () => {
  const result = renderMarkdown("```html\n<script>example()</script>\n```", [], "public/a/index.md");
  assert.match(result.html ?? "", /&(?:lt;|#x3C;)/i);
  assert.ok(!result.html?.includes("<script>"));
  assert.match(result.html ?? "", /data-reader-code/);
  assert.match(result.html ?? "", /data-code-copy/);
  assert.match(result.html ?? "", />HTML<\/span>/);
  assert.match(result.html ?? "", /tabindex="0" role="region"/);
});

test("GFM structures keep formatting and stay inside local scroll containers", () => {
  const source = "~~旧结论~~\n\n- [x] 已完成\n- [ ] 待验证\n\n| 名称 | **结果** |\n| :--- | ---: |\n| 测试 | `通过` |";
  const result = renderMarkdown(source, [], "public/a/index.md");
  assert.match(result.html ?? "", /<del>旧结论<\/del>/);
  assert.match(result.html ?? "", /<input[^>]*type="checkbox"[^>]*>/);
  assert.match(result.html ?? "", /data-reader-table/);
  assert.match(result.html ?? "", /<th align="left">名称<\/th>/);
  assert.match(result.html ?? "", /<td align="right"><code>通过<\/code><\/td>/);
});

test("declared image dimensions, caption and loading priority are server-rendered", () => {
  const first = {
    id: "ast_11111111-1111-4111-8111-000000001002", path: "images/meal.webp",
    mediaType: "image/webp" as const, width: 960, height: 640,
  };
  const second = { ...first, id: "ast_11111111-1111-4111-8111-000000001003", path: "images/next.webp" };
  const result = renderMarkdown("![示例图](images/meal.webp \"本次成品\")\n\n![下一张](images/next.webp)", [first, second], "public/meal/index.md");
  assert.equal(result.issues.length, 0);
  assert.match(result.html ?? "", /width="960"/);
  assert.match(result.html ?? "", /height="640"/);
  assert.match(result.html ?? "", /<figcaption>本次成品<\/figcaption>/);
  assert.match(result.html ?? "", /loading="eager"/);
  assert.match(result.html ?? "", /loading="lazy"/);
  assert.match(result.html ?? "", /decoding="async"/);
  assert.match(result.html ?? "", /data-reader-image/);
  assert.match(result.html ?? "", /data-image-error/);
});


test("footnotes math and syntax colors are server-rendered with safe prefixed anchors", () => {
  const result = renderMarkdown("## 中文标题\n\n## 中文标题\n\n一条注释[^n] 与 $x^2$。\n\n[^n]: 说明\n\n```ts\nconst x = 1\n```", [], "private/a/index.md");
  assert.equal(result.issues.length, 0);
  assert.equal(result.toc[1]?.id, "dt-中文标题-2");
  assert.match(result.html ?? "", /dt-footnote-/);
  assert.match(result.html ?? "", /katex/);
  assert.match(result.html ?? "", /style="color:/);
  assert.match(result.html ?? "", /id="section-1"/);
});


test("image reference definitions cannot bypass the declared-asset boundary", () => {
  const unsafe = renderMarkdown("![图][x]\n\n[x]: https://external.invalid/tracker.png", [], "private/image/index.md");
  assert.equal(unsafe.html, null);
  const safe = renderMarkdown("![图][x]\n\n[x]: images/check.png", [attachment], "private/image/index.md");
  assert.equal(safe.issues.length, 0);
  assert.match(safe.html ?? "", /api\/v1\/assets\/ast_/);
});

test("naturally numbered headings never collide with duplicate suffixes", () => {
  const result = renderMarkdown("## foo\n\n## foo\n\n## foo-2", [], "public/headings/index.md");
  assert.equal(new Set(result.toc.map(h => h.id)).size, 3);
});

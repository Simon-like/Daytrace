import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { ContentValidationError, RecordNotFoundError } from "./errors";
import { ContentService } from "./content.service";
import { renderRecord } from "./markdown";

const contentRoot = resolve(process.cwd(), "content");

test("renders a public record through the shared runtime contract", async () => {
  const article = await new ContentService(contentRoot).getPublicRecord("public-arch-sample");
  assert.ok(article.html.includes("PUBLIC_SSR_PARAGRAPH_7F3A"));
  assert.equal(article.contractVersion, "1.0.0-arch.1");
});

test("does not use the private tree as a public fallback", async () => {
  await assert.rejects(
    new ContentService(contentRoot).getPublicRecord("private-arch-canary"),
    RecordNotFoundError,
  );
});

test("locates invalid frontmatter to a file and field", async () => {
  await assert.rejects(
    new ContentService(contentRoot).getPublicRecord("invalid-arch-sample"),
    (error: unknown) => {
      assert.ok(error instanceof ContentValidationError);
      assert.deepEqual(error.issues, [{
        file: "content/public/invalid-arch-sample.md",
        field: "date",
        message: "Expected an ISO calendar date",
      }]);
      return true;
    },
  );
});

test("removes active HTML and dangerous URLs", () => {
  const source = "---\nid: x\nslug: x\ntitle: x\ndate: 2026-10-30\nsummary: x\nvisibility: public\nstatus: published\n---\n安全段落仍然可读。\n<script>alert(\"XSS_CANARY\")</script>\n[危险链接](javascript:alert(\"URL_CANARY\"))";
  const record = renderRecord(source, "content/public/synthetic-security.md");
  assert.ok(record.html.includes("安全段落仍然可读"));
  assert.ok(!record.html.includes("<script"));
  assert.ok(!record.html.includes("javascript:"));
});

test("rejects an invalid date instead of returning an empty result", () => {
  const source = "---\nid: x\nslug: x\ntitle: x\ndate: bad\nsummary: x\nvisibility: public\nstatus: published\n---\ntext";
  assert.throws(() => renderRecord(source, "content/public/x.md"), ContentValidationError);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  anchorIdFromHash,
  captureViewport,
  copyCodeText,
  preferredScrollBehavior,
  restoreFocusAndScroll,
  type FocusTarget,
  type ViewportWindow,
} from "../../../apps/site/src/features/reader/reader-interactions";

test("anchor IDs support encoded headings and reject malformed hashes", () => {
  assert.equal(anchorIdFromHash("#section-2"), "section-2");
  assert.equal(anchorIdFromHash("#%E6%9D%90%E6%96%99"), "材料");
  assert.equal(anchorIdFromHash(""), null);
  assert.equal(anchorIdFromHash("#"), null);
  assert.equal(anchorIdFromHash("section-2"), null);
  assert.equal(anchorIdFromHash("#%E0%A4%A"), null);
});

test("anchor motion follows reduced-motion preference", () => {
  assert.equal(preferredScrollBehavior(true), "auto");
  assert.equal(preferredScrollBehavior(false), "smooth");
});

test("code copy preserves exact code text without toolbar content", async () => {
  const code = "const value = 1;\n  console.log(value);";
  let received = "";
  const result = await copyCodeText({ textContent: code }, async (text) => {
    received = text;
  });
  assert.equal(result, "copied");
  assert.equal(received, code);
  assert.equal(received.includes("复制代码"), false);
});

test("code copy retains long lines and trailing newlines", async () => {
  const code = `${"x".repeat(200)}\n`;
  let received = "";
  await copyCodeText({ textContent: code }, async (text) => { received = text; });
  assert.equal(received, code);
});

test("empty code does not call the clipboard", async () => {
  let calls = 0;
  const result = await copyCodeText({ textContent: "" }, async () => { calls += 1; });
  assert.equal(result, "failed");
  assert.equal(calls, 0);
});

test("clipboard permission failure becomes explicit failure feedback", async () => {
  const result = await copyCodeText({ textContent: "const test = true;" }, async () => {
    throw new DOMException("Denied", "NotAllowedError");
  });
  assert.equal(result, "failed");
});

test("image close restores viewport before focus without a second scroll", () => {
  const events: string[] = [];
  const window: ViewportWindow = {
    scrollX: 12,
    scrollY: 640,
    scrollTo(options) {
      events.push(`scroll:${options.left}:${options.top}:${options.behavior}`);
    },
  };
  const target: FocusTarget = {
    focus(options) {
      events.push(`focus:${String(options?.preventScroll)}`);
    },
  };
  const viewport = captureViewport(window);
  restoreFocusAndScroll(target, viewport, window);
  assert.deepEqual(events, ["scroll:12:640:auto", "focus:true"]);
});

test("image close still restores viewport when the trigger disappeared", () => {
  let restored = "";
  restoreFocusAndScroll(null, { left: 0, top: 280 }, {
    scrollX: 0,
    scrollY: 0,
    scrollTo(options) { restored = `${options.left}:${options.top}`; },
  });
  assert.equal(restored, "0:280");
});

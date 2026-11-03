import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReadingFontSize, readReadingFontSize, READING_FONT_SIZE_KEY, readingFontSizeBootScript } from "../../../packages/ui/src/reading-preferences";

test("reading font size accepts only the three supported preferences", () => {
  assert.deepEqual(["standard", "large", "xlarge"].map(parseReadingFontSize), ["standard", "large", "xlarge"]);
  for (const value of [null, "", "huge", "STANDARD", " large ", "__proto__"]) {
    assert.equal(parseReadingFontSize(value), "standard");
  }
});

test("reading preferences fall back to standard for unavailable or invalid storage", () => {
  assert.equal(readReadingFontSize(null), "standard");
  assert.equal(readReadingFontSize({ getItem: () => { throw new Error("denied"); } }), "standard");
  assert.equal(readReadingFontSize({ getItem: key => key === READING_FONT_SIZE_KEY ? "large" : null }), "large");
  assert.equal(readReadingFontSize({ getItem: () => "invalid" }), "standard");
});

test("pre-restore script is self contained and uses the stable storage key", () => {
  assert.ok(readingFontSizeBootScript.includes(READING_FONT_SIZE_KEY));
  assert.ok(readingFontSizeBootScript.includes("document.documentElement.dataset.readingFontSize"));
  assert.ok(!readingFontSizeBootScript.includes("process.env"));
});

import assert from "node:assert/strict";
import { test } from "node:test";
import type { TocItem } from "@daytrace/contracts";
import {
  createReaderToc,
  createRecipeQuickLinks,
} from "../../../apps/site/src/features/reader/reader-model";

const item = (id: string, text: string, level = 2): TocItem => ({ id, text, level });

test("reader TOC keeps three indentation levels relative to the shallowest heading", () => {
  const toc = [
    item("section-1", "背景", 3),
    item("section-2", "细节", 4),
    item("section-3", "验证", 5),
    item("section-4", "仍可直接访问的深层标题", 6),
  ];
  assert.deepEqual(createReaderToc(toc), toc.slice(0, 3));
});

test("reader TOC includes a later higher-level heading", () => {
  const toc = [item("section-1", "引言", 3), item("section-2", "正文", 2), item("section-3", "细节", 4)];
  assert.deepEqual(createReaderToc(toc), toc);
});

test("empty TOC produces neither desktop navigation nor recipe shortcuts", () => {
  assert.deepEqual(createReaderToc([]), []);
  assert.deepEqual(createRecipeQuickLinks([]), []);
});

test("recipe shortcuts use real material, step and note headings", () => {
  const links = createRecipeQuickLinks([
    item("section-1", "材料与用量"),
    item("section-2", "制作步骤"),
    item("section-3", "注意点"),
  ]);
  assert.deepEqual(links, [
    { id: "recipe-材料", label: "材料", target: "section-1" },
    { id: "recipe-工序", label: "工序", target: "section-2" },
    { id: "recipe-注意点", label: "注意点", target: "section-3" },
  ]);
});

test("recipe shortcuts accept common standalone heading variants", () => {
  assert.deepEqual(createRecipeQuickLinks([
    item("ingredients", "食材"),
    item("steps", "工序：本次实践"),
    item("notes", "注意事项"),
  ]).map((link) => link.target), ["ingredients", "steps", "notes"]);
});

test("recipe shortcuts never invent missing sections or match unrelated words", () => {
  assert.deepEqual(createRecipeQuickLinks([
    item("section-1", "材料力学的排查"),
    item("section-2", "工序之外的随想"),
    item("section-3", "本次效果"),
  ]), []);
});

test("recipe shortcuts use only the first matching section per role", () => {
  const links = createRecipeQuickLinks([
    item("section-1", "配料"),
    item("section-2", "材料"),
    item("section-3", "做法"),
    item("section-4", "步骤"),
  ]);
  assert.deepEqual(links.map((link) => link.target), ["section-1", "section-3"]);
});

# Public Sharing and Reading Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 F4 公开订阅、搜索发现、私密安全的中文分享卡与双端正文偏好，让公开记录可订阅、可发现、可一致分享，并让读者在桌面和 H5 恢复舒适的正文字号。

**Architecture:** 所有公开聚合只消费 Nest API 的公开摘要投影，通过 `getAllPublicRecords()` 沿 `nextCursor` 全量读取；桌面 Next.js 输出 RSS、sitemap、robots、规范元数据和本地 PNG 分享卡，H5 复用同一公开投影但 canonical 始终指向桌面。共享 UI 包提供无框架偏好解析、预恢复脚本和原生按钮控制，CSS 变量只调整阅读正文。

**Tech Stack:** Next.js 16.4.3、NestJS 12.3.2、React 19.3.1、TypeScript、pnpm 11.23.0、`next/og`、Noto Sans SC（SIL OFL 1.1）、localStorage、node:test、Playwright。

## Global Constraints

- 只在 `dev` 串行开发；开始为 `git switch dev && git pull origin dev`，每个功能／文档切片验证后独立 commit 并 push；不新建任务分支、不合并 `main`、不部署。
- 执行前认领 `SHARE-001`，写入范围以 `docs/collaboration/board.json` 的任务卡为准；不得覆盖他人未提交现场。
- Node.js 固定为 24.18.0，pnpm 固定为 11.23.0；本机命令使用 `npx --yes pnpm@11.23.0 ...`，安装使用 `pnpm install --frozen-lockfile`。
- 所有 RSS、sitemap、canonical、OG 元数据与分享卡复用公开 API；不得读取主人索引、浏览器私密响应或自行补齐后过滤。
- 分享卡使用本地完整中文字体和许可证，不调用第三方图片运行时；私密、草稿和未知 ID 使用相同通用品牌卡。
- 字号偏好 key 为 `daytrace.readingFontSize.v1`，值为 `standard | large | xlarge`；非法值和存储异常回退标准，仅调整正文，不缩放导航和控件。
- 本地 Chromium、合成内容和托管 CI 不等于真实 iPhone/Safari、社交爬虫、性能预算或生产发布验收；QA-001、RELEASE-001 保持独立。
- 当前状态：F4 已由 `beb4f2d`、`634eeaf`、`80b069b` 实现并完成验证。本计划用于从 LINK-001 完成后的基线复现和评审；在当前 `dev` 上不得重复实施。

---

## File Structure

| 文件 | 责任 |
| --- | --- |
| `packages/content/src/public-api.ts` | 公开 API 适配、游标全量聚合和重复游标契约失败 |
| `apps/site/src/app/rss.xml/route.ts` | RSS 2.0 XML 输出和 XML 文本转义 |
| `apps/site/src/app/sitemap.ts` | 公开静态页与公开记录规范 URL |
| `apps/site/src/app/robots.ts` | robots 规则和动态 sitemap 地址 |
| `apps/site/src/app/layout.tsx` | 桌面 metadataBase、RSS alternate 和字号预恢复 |
| `apps/h5/src/app/layout.tsx` | H5 metadataBase、桌面 RSS alternate 和字号预恢复 |
| `apps/site/src/app/records/[recordRef]/page.tsx` | 桌面公开详情元数据与字号控件 |
| `apps/h5/src/app/records/[recordRef]/page.tsx` | H5 详情元数据，规范地址统一指向桌面 |
| `apps/site/src/app/records/[recordRef]/opengraph-image.tsx` | 本地 1200×630 中文 PNG 与通用卡回退 |
| `apps/site/assets/fonts/` | 完整 Noto Sans SC 400 静态实例和 OFL 许可证 |
| `packages/ui/src/reading-preferences.ts` | 偏好白名单、存储读取和预恢复脚本 |
| `packages/ui/src/reading-font-size-control.tsx` | 原生按钮、ARIA 状态、存储事件和内存回退 |
| `packages/ui/src/reading-preferences.css` | 控件样式与双端正文字号变量 |
| `apps/site/src/app/owner/records/[recordId]/page.tsx` | 主人阅读页复用字号控件，不改变权限 |
| `apps/h5/src/components/mobile-reader.tsx` | 公开与主人 H5 阅读页复用字号控件 |
| `tests/unit/find/public-sharing.test.ts` | 游标、权限投影和 XML 转义单元测试 |
| `tests/unit/reader/reading-preferences.test.ts` | 偏好白名单、异常回退和启动脚本单元测试 |
| `tests/e2e/acceptance/demo.browser.mjs` | 桌面 HTTP、分享 PNG、键盘和持久化验收 |
| `tests/e2e/h5/mobile.browser.mjs` | H5 canonical、跨端恢复和移动布局验收 |

### Task 1: 公开游标聚合、RSS、sitemap 与 robots

**Files:**
- Modify: `packages/content/src/public-api.ts`
- Create: `apps/site/src/app/rss.xml/route.ts`
- Create: `apps/site/src/app/sitemap.ts`
- Create: `apps/site/src/app/robots.ts`
- Create: `tests/unit/find/public-sharing.test.ts`
- Modify: `tests/e2e/acceptance/demo.browser.mjs`

**Interfaces:**
- Consumes: `getPublicRecords(cursor?: string, limit?: number): Promise<RecordListData>`，以及 Nest 公开列表的 `pageInfo.nextCursor`。
- Produces: `getAllPublicRecords(readPage?: (cursor?: string) => Promise<RecordListData>): Promise<readonly RecordSummary[]>`、`escapeXml(value: string): string`、`GET /rss.xml`、`GET /sitemap.xml`、`GET /robots.txt`。

- [ ] **Step 1: 写游标聚合和 XML 转义的失败测试**

创建 `tests/unit/find/public-sharing.test.ts`：

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { getAllPublicRecords, PublicApiError } from "@daytrace/content/public-api";
import type { RecordListData, RecordSummary } from "@daytrace/contracts";
import { escapeXml } from "../../../apps/site/src/app/rss.xml/route";

const record: RecordSummary = {
  id: "rec_11111111-1111-4111-8111-000000000001",
  type: "engineering",
  title: "公开记录",
  slug: "public-record",
  oldSlugs: [],
  occurredOn: "2026-11-01",
  updatedAt: "2026-11-02T00:00:00.000Z",
  revision: 1,
  tags: [],
  summary: null,
  status: "published",
  visibility: "public",
};

function page(items: readonly RecordSummary[], nextCursor: string | null): RecordListData {
  return { items, pageInfo: { hasMore: nextCursor !== null, nextCursor } };
}

test("public aggregation follows every cursor and preserves the public projection", async () => {
  const cursors: Array<string | undefined> = [];
  const records = await getAllPublicRecords(async cursor => {
    cursors.push(cursor);
    return cursor === undefined
      ? page([record], "second")
      : page([{ ...record, id: "rec_11111111-1111-4111-8111-000000000002" }], null);
  });
  assert.deepEqual(cursors, [undefined, "second"]);
  assert.deepEqual(records.map(item => item.id), [record.id, "rec_11111111-1111-4111-8111-000000000002"]);
  assert.ok(records.every(item => item.status === "published" && item.visibility === "public"));
});

test("public aggregation rejects a repeated cursor instead of looping forever", async () => {
  await assert.rejects(
    getAllPublicRecords(async () => page([record], "repeated")),
    (error: unknown) => error instanceof PublicApiError && error.code === "CONTRACT_INVALID",
  );
});

test("RSS text escapes markup without double escaping existing input", () => {
  assert.equal(escapeXml(`技术 & <生活> "随想" '笔记'`), "技术 &amp; &lt;生活&gt; &quot;随想&quot; &apos;笔记&apos;");
});
```

- [ ] **Step 2: 运行测试并确认先失败**

Run:

```bash
npx --yes pnpm@11.23.0 build:packages && npx --yes pnpm@11.23.0 exec tsx --tsconfig apps/api/tsconfig.json --test tests/unit/find/public-sharing.test.ts
```

Expected: FAIL，原因是 `getAllPublicRecords` 或 RSS route 尚不存在；不得通过删除断言让测试转绿。

- [ ] **Step 3: 实现有循环保护的公开全量聚合**

在 `packages/content/src/public-api.ts` 的 `getPublicRecords()` 后添加：

```ts
export async function getAllPublicRecords(
  readPage: (cursor?: string) => Promise<RecordListData> = cursor => getPublicRecords(cursor, 50),
): Promise<readonly RecordSummary[]> {
  const records: RecordSummary[] = [];
  const visited = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await readPage(cursor);
    records.push(...page.items);
    cursor = page.pageInfo.nextCursor ?? undefined;
    if (cursor !== undefined) {
      if (visited.has(cursor)) throw new PublicApiError(502, "CONTRACT_INVALID");
      visited.add(cursor);
    }
  } while (cursor !== undefined);
  return records;
}
```

- [ ] **Step 4: 先实现转义函数并运行单元测试**

创建 `apps/site/src/app/rss.xml/route.ts`，先加入：

```ts
export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
```

Run:

```bash
npx --yes pnpm@11.23.0 exec tsx --tsconfig apps/api/tsconfig.json --test tests/unit/find/public-sharing.test.ts
```

Expected: 3 个测试全部 PASS。

- [ ] **Step 5: 写公开 HTTP 负例与全量聚合浏览器测试**

在 `tests/e2e/acceptance/demo.browser.mjs` 的现有 `try` 内新增独立 `check`：

```js
await check("public feeds, sitemap and robots expose only canonical public records", async () => {
  const rssResponse = await fetch(`${base}/rss.xml`);
  assert.equal(rssResponse.status, 200);
  assert.match(rssResponse.headers.get("content-type") ?? "", /application\/rss\+xml/);
  const rss = await rssResponse.text();
  assert.equal((rss.match(/<item>/g) ?? []).length, 8);
  assert.ok(rss.includes("<rss version=\"2.0\">"));
  assert.ok(!rss.includes(secret));
  assert.ok(!rss.includes("000000000091"));
  assert.ok(!rss.includes("000000000092"));
  assert.ok(!rss.includes("000000000093"));

  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  assert.equal((sitemap.match(/<loc>.*?\/records\/rec_/g) ?? []).length, 8);
  assert.ok(!sitemap.includes("/owner"));
  assert.ok(!sitemap.includes("/h5/"));
  assert.ok(!sitemap.includes("000000000091"));

  const robots = await (await fetch(`${base}/robots.txt`)).text();
  assert.ok(robots.includes("Disallow: /owner/"));
  assert.ok(robots.includes(`${base}/sitemap.xml`));
});
```

- [ ] **Step 6: 运行浏览器测试并确认路由缺失**

Run:

```bash
DEMO_MANAGED_SERVER=1 DEMO_PORT=3180 DEMO_API_PORT=3181 DEMO_EVIDENCE_DIR=.local/SHARE-001/task1-red npx --yes pnpm@11.23.0 test:browser
```

Expected: 新检查 FAIL，RSS／sitemap／robots 至少一个为 404；既有检查不得被改写或跳过。

- [ ] **Step 7: 实现 RSS 2.0 动态路由**

将 `apps/site/src/app/rss.xml/route.ts` 完整实现为：

```ts
import { getAllPublicRecords } from "../../server/api";

export const dynamic = "force-dynamic";

export function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export async function GET(): Promise<Response> {
  const records = await getAllPublicRecords();
  const origin = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000";
  const channelUrl = new URL("/", origin).href;
  const items = records.map(record => {
    const url = new URL(`/records/${record.id}/`, origin).href;
    return [
      "<item>",
      `<title>${escapeXml(record.title)}</title>`,
      `<link>${escapeXml(url)}</link>`,
      `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `<pubDate>${new Date(record.updatedAt).toUTCString()}</pubDate>`,
      `<description>${escapeXml(record.summary ?? "")}</description>`,
      "</item>",
    ].join("");
  }).join("");
  const latest = records.reduce(
    (value, record) => record.updatedAt > value ? record.updatedAt : value,
    records[0]?.updatedAt ?? new Date(0).toISOString(),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>有迹 Daytrace</title><link>${escapeXml(channelUrl)}</link><description>让经历有迹可循。技术实践、生活经验与随想认知的个人档案。</description><language>zh-CN</language><lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>${items}</channel></rss>`;
  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "no-store" },
  });
}
```

- [ ] **Step 8: 实现动态 sitemap 与 robots**

创建 `apps/site/src/app/sitemap.ts`：

```ts
import type { MetadataRoute } from "next";
import { getAllPublicRecords } from "../server/api";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const records = await getAllPublicRecords();
  const origin = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000";
  const latest = records.reduce<string | undefined>(
    (value, record) => value === undefined || record.updatedAt > value ? record.updatedAt : value,
    records[0]?.updatedAt,
  );
  return [
    ...["/", "/archive", "/search", "/about"].map(path => ({
      url: new URL(path, origin).href,
      ...(latest === undefined ? {} : { lastModified: new Date(latest) }),
    })),
    ...records.map(record => ({
      url: new URL(`/records/${record.id}/`, origin).href,
      lastModified: new Date(record.updatedAt),
    })),
  ];
}
```

创建 `apps/site/src/app/robots.ts`：

```ts
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/owner/", "/h5/"] },
    sitemap: new URL("/sitemap.xml", origin).href,
  };
}
```

- [ ] **Step 9: 重跑定向测试并提交公开聚合切片**

Run:

```bash
npx --yes pnpm@11.23.0 exec tsx --tsconfig apps/api/tsconfig.json --test tests/unit/find/public-sharing.test.ts
DEMO_MANAGED_SERVER=1 DEMO_PORT=3180 DEMO_API_PORT=3181 DEMO_EVIDENCE_DIR=.local/SHARE-001/task1-green npx --yes pnpm@11.23.0 test:browser
npx --yes pnpm@11.23.0 lint
npx --yes pnpm@11.23.0 typecheck
```

Expected: 单元 3／3 PASS；新增浏览器检查 PASS；lint、typecheck PASS。

Commit:

```bash
git add packages/content/src/public-api.ts apps/site/src/app/rss.xml/route.ts apps/site/src/app/sitemap.ts apps/site/src/app/robots.ts tests/unit/find/public-sharing.test.ts tests/e2e/acceptance/demo.browser.mjs docs/plans/2026-11-04-public-sharing-reading-preferences.md
git commit -m "feat(sharing): publish public feeds and discovery routes"
git push origin dev
```

### Task 2: 双端规范元数据与私密安全的中文分享卡

**Files:**
- Modify: `apps/site/src/app/layout.tsx`
- Modify: `apps/h5/src/app/layout.tsx`
- Modify: `apps/site/src/app/records/[recordRef]/page.tsx`
- Modify: `apps/h5/src/app/records/[recordRef]/page.tsx`
- Create: `apps/site/src/app/records/[recordRef]/opengraph-image.tsx`
- Create: `apps/site/assets/fonts/NotoSansSC-Regular.ttf`
- Create: `apps/site/assets/fonts/OFL.txt`
- Modify: `tests/e2e/acceptance/demo.browser.mjs`
- Modify: `tests/e2e/h5/mobile.browser.mjs`
- Create: `docs/project/evidence/SHARE-001/font-source.json`

**Interfaces:**
- Consumes: `getPublicRecord(recordId: string): Promise<RecordDetail | null>` 和 Task 1 的 `/rss.xml`。
- Produces: 双端 `generateMetadata({ params }: { params: Promise<{ recordRef: string }> }): Promise<Metadata>`；桌面 `GET /records/[recordRef]/opengraph-image` 返回 1200×630 PNG。

- [ ] **Step 1: 写规范元数据与分享卡的失败测试**

在桌面浏览器脚本中添加：

```js
await check("share metadata and cards expose only public record details", async () => {
  const html = await (await fetch(base + tech)).text();
  assert.ok(html.includes(`property="og:title"`));
  assert.ok(html.includes(`content="${base}${tech}/"`));
  assert.ok(html.includes(`href="${base}${tech}/"`));
  assert.ok(html.includes(`name="twitter:card" content="summary_large_image"`));
  assert.ok(html.includes(`href="${base}/rss.xml"`));

  const publicResponse = await fetch(`${base}${tech}/opengraph-image`);
  assert.equal(publicResponse.status, 200);
  assert.match(publicResponse.headers.get("content-type") ?? "", /^image\/png/);
  const publicPng = Buffer.from(await publicResponse.arrayBuffer());
  assert.equal(publicPng.subarray(1, 4).toString(), "PNG");
  assert.equal(publicPng.readUInt32BE(16), 1200);
  assert.equal(publicPng.readUInt32BE(20), 630);
  assert.ok(publicPng.length > 10000);
  await writeFile(`${evidence}/share-public.png`, publicPng);

  const privatePng = Buffer.from(await (await fetch(`${base}/records/${privateId}/opengraph-image`)).arrayBuffer());
  const unknownPng = Buffer.from(await (await fetch(`${base}/records/rec_11111111-1111-4111-8111-999999999999/opengraph-image`)).arrayBuffer());
  const draftPng = Buffer.from(await (await fetch(`${base}/records/rec_11111111-1111-4111-8111-000000000092/opengraph-image`)).arrayBuffer());
  assert.ok(privatePng.equals(unknownPng));
  assert.ok(privatePng.equals(draftPng));
  assert.ok(!publicPng.equals(privatePng));

  const privateMetadata = await (await fetch(`${base}/records/${privateId}`)).text();
  const unknownMetadata = await (await fetch(`${base}/records/rec_11111111-1111-4111-8111-999999999999`)).text();
  const ogTitle = html => html.match(/<meta property="og:title" content="([^"]*)"/)?.[1];
  assert.ok(!privateMetadata.includes(secret));
  assert.equal(ogTitle(privateMetadata), "有迹 Daytrace");
  assert.equal(ogTitle(privateMetadata), ogTitle(unknownMetadata));
});
```

在 H5 浏览器脚本的公开详情检查中添加：

```js
const detailHtml = await (await fetch(base + tech)).text();
const canonicalId = tech.split("/").at(-1);
assert.ok(detailHtml.includes(`rel="canonical" href="${base}/records/${canonicalId}/"`));
assert.ok(detailHtml.includes(`property="og:url" content="${base}/records/${canonicalId}/"`));
assert.ok(detailHtml.includes(`property="og:image" content="${base}/records/${canonicalId}/opengraph-image"`));
assert.ok(detailHtml.includes(`name="twitter:card" content="summary_large_image"`));
assert.ok(detailHtml.includes(`href="${base}/rss.xml"`));
assert.ok(!detailHtml.includes("写给自己的阶段提醒"));
```

- [ ] **Step 2: 运行双端测试并确认失败**

Run:

```bash
DEMO_MANAGED_SERVER=1 DEMO_PORT=3180 DEMO_API_PORT=3181 DEMO_EVIDENCE_DIR=.local/SHARE-001/task2-red npx --yes pnpm@11.23.0 test:browser
H5_TEST_SITE_PORT=3190 H5_TEST_API_PORT=3191 H5_TEST_H5_PORT=3192 H5_TEST_EVIDENCE_DIR=.local/SHARE-001/task2-h5-red npx --yes pnpm@11.23.0 test:h5
```

Expected: 新增 OG／canonical／PNG 检查 FAIL；不要用静态图片或公开 fixture 直读绕过失败。

- [ ] **Step 3: 添加根 RSS alternate 与双端详情元数据**

在桌面和 H5 根布局的 `metadata` 中加入 `metadataBase` 和 RSS alternate；桌面使用相对地址：

```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000"),
  title: { default: "有迹 Daytrace", template: "%s · 有迹 Daytrace" },
  description: "让经历有迹可循。技术实践、生活经验与随想认知的个人档案。",
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
};
```

H5 的 RSS alternate 显式指向桌面：

```ts
alternates: {
  types: {
    "application/rss+xml": new URL("/rss.xml", process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000").href,
  },
},
```

在桌面公开详情 `generateMetadata()` 中，非法 ID 返回 `{ title: "记录链接" }`，公开 API 返回 null 时返回 `{ title: "记录不可用" }`；公开记录返回：

```ts
const description = record.summary ?? "有迹 Daytrace 的一页公开记录。";
const canonical = `/records/${record.id}/`;
const image = `/records/${record.id}/opengraph-image`;
return {
  title: record.title,
  description,
  alternates: { canonical, types: { "application/rss+xml": "/rss.xml" } },
  openGraph: {
    title: record.title,
    description,
    url: canonical,
    siteName: "有迹 Daytrace",
    locale: "zh_CN",
    type: "article",
    publishedTime: record.occurredOn ?? record.updatedAt,
    modifiedTime: record.updatedAt,
    images: [{ url: image, width: 1200, height: 630, alt: record.title }],
  },
  twitter: { card: "summary_large_image", title: record.title, description, images: [image] },
};
```

H5 的 `generateMetadata()` 在公开记录分支返回完整对象，其中 canonical、分享图和 RSS 都使用桌面绝对地址：

```ts
const origin = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000";
const description = record.summary ?? "有迹 Daytrace 的一页公开记录。";
const canonical = new URL(`/records/${record.id}/`, origin).href;
const image = new URL(`/records/${record.id}/opengraph-image`, origin).href;
return {
  title: record.title,
  description,
  alternates: { canonical, types: { "application/rss+xml": new URL("/rss.xml", origin).href } },
  openGraph: {
    title: record.title,
    description,
    url: canonical,
    siteName: "有迹 Daytrace",
    locale: "zh_CN",
    type: "article",
    publishedTime: record.occurredOn ?? record.updatedAt,
    modifiedTime: record.updatedAt,
    images: [{ url: image, width: 1200, height: 630, alt: record.title }],
  },
  twitter: { card: "summary_large_image", title: record.title, description, images: [image] },
};
```

- [ ] **Step 4: 准备完整中文字体和许可证**

从 Google Fonts 官方仓库镜像下载完整可变字体与 OFL，并实例化完整 400 字重，不按 fixture 文本裁剪：

```bash
mkdir -p .local/share-font apps/site/assets/fonts
curl -fL "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf" -o .local/share-font/NotoSansSC-VF.ttf
curl -fL "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/OFL.txt" -o apps/site/assets/fonts/OFL.txt
python3 - <<'PY'
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
font = TTFont(".local/share-font/NotoSansSC-VF.ttf")
instantiateVariableFont(font, {"wght": 400}, inplace=True)
font.save("apps/site/assets/fonts/NotoSansSC-Regular.ttf")
PY
shasum -a 256 .local/share-font/NotoSansSC-VF.ttf apps/site/assets/fonts/NotoSansSC-Regular.ttf
```

Expected: 可变字体 SHA-256 为 `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`；静态字体为 `d0e8d49c4c5bbb589b10519e743a6026cd24e8ceacc9ca3e676e8d23c3221383`，大小 10595932 bytes，cmap 映射 30890 个。哈希不符时停止，不生成分享卡。

创建 `docs/project/evidence/SHARE-001/font-source.json`，记录官方仓库、下载镜像、许可证、上述两个哈希、静态字重 400、字节数、cmap 数和 `subset_by_fixture_text: false`。

- [ ] **Step 5: 实现本地 PNG 分享卡和统一通用回退**

创建 `apps/site/src/app/records/[recordRef]/opengraph-image.tsx`：

```tsx
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { isRecordId } from "@daytrace/contracts";
import { getPublicRecord } from "../../../server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "有迹 Daytrace 公开记录分享卡";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontData = readFile(path.join(process.cwd(), "assets", "fonts", "NotoSansSC-Regular.ttf"));
const typeLabels = { engineering: "技术实践", recipe: "生活经验", reflection: "随想认知" } as const;

interface ShareImageProps {
  readonly params: Promise<{ recordRef: string }>;
}

export default async function OpengraphImage({ params }: ShareImageProps): Promise<ImageResponse> {
  const { recordRef } = await params;
  const record = isRecordId(recordRef) ? await getPublicRecord(recordRef) : null;
  const title = record?.title ?? "让经历，有迹可循。";
  const eyebrow = record === null
    ? "私人档案 · 公开分享"
    : `${typeLabels[record.type]} · ${record.occurredOn ?? record.updatedAt.slice(0, 10)}`;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#f2eee3", color: "#243128", fontFamily: "Noto Sans SC", padding: "54px 64px", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "18px", background: "#314b3a", display: "flex" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", border: "1px solid #c6c6b7", padding: "42px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24, letterSpacing: 2 }}>
          <div style={{ display: "flex", fontWeight: 600 }}>有迹 · DAYTRACE</div>
          <div style={{ display: "flex", color: "#697466", fontSize: 20 }}>留下过程，也留下线索</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "28px" }}>
          <div style={{ display: "flex", color: "#8b5e3c", fontSize: 24, marginBottom: "24px" }}>{eyebrow}</div>
          <div style={{ display: "flex", fontSize: record === null ? 72 : 60, fontWeight: 600, lineHeight: 1.28, letterSpacing: -1, maxWidth: "960px" }}>{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#697466", fontSize: 21 }}>
          <div style={{ display: "flex" }}>技术实践 · 生活经验 · 随想认知</div>
          <div style={{ display: "flex", color: "#314b3a" }}>daytrace / records</div>
        </div>
      </div>
    </div>,
    { ...size, fonts: [{ name: "Noto Sans SC", data: await fontData, weight: 400, style: "normal" }] },
  );
}
```

- [ ] **Step 6: 重跑双端测试并实际查看分享 PNG**

Run:

```bash
DEMO_MANAGED_SERVER=1 DEMO_PORT=3180 DEMO_API_PORT=3181 DEMO_EVIDENCE_DIR=docs/project/evidence/SHARE-001 npx --yes pnpm@11.23.0 test:browser
H5_TEST_SITE_PORT=3190 H5_TEST_API_PORT=3191 H5_TEST_H5_PORT=3192 H5_TEST_EVIDENCE_DIR=docs/project/evidence/SHARE-001/h5 npx --yes pnpm@11.23.0 test:h5
npx --yes pnpm@11.23.0 lint
npx --yes pnpm@11.23.0 typecheck
```

Expected: 新增双端检查 PASS；`share-public.png` 是 1200×630 PNG。用图像查看工具实际读取该文件，确认中文标题、类型、日期和品牌完整可读，不只检查 magic bytes。

- [ ] **Step 7: 提交分享元数据与本地分享卡**

```bash
git add apps/site/src/app/layout.tsx apps/h5/src/app/layout.tsx 'apps/site/src/app/records/[recordRef]/page.tsx' 'apps/h5/src/app/records/[recordRef]/page.tsx' 'apps/site/src/app/records/[recordRef]/opengraph-image.tsx' apps/site/assets/fonts tests/e2e/acceptance/demo.browser.mjs tests/e2e/h5/mobile.browser.mjs docs/project/evidence/SHARE-001/font-source.json docs/project/evidence/SHARE-001/share-public.png docs/plans/2026-11-04-public-sharing-reading-preferences.md
git commit -m "feat(sharing): render private-safe Chinese social cards"
git push origin dev
```

### Task 3: 双端三档正文字号偏好

**Files:**
- Create: `packages/ui/src/reading-preferences.ts`
- Create: `packages/ui/src/reading-font-size-control.tsx`
- Create: `packages/ui/src/reading-preferences.css`
- Create: `tests/unit/reader/reading-preferences.test.ts`
- Modify: `packages/ui/package.json`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/src/tokens.css`
- Modify: `apps/site/src/app/layout.tsx`
- Modify: `apps/h5/src/app/layout.tsx`
- Modify: `apps/site/src/app/records/[recordRef]/page.tsx`
- Modify: `apps/site/src/app/owner/records/[recordId]/page.tsx`
- Modify: `apps/site/src/features/reader/reader.module.css`
- Modify: `apps/h5/src/components/mobile-reader.tsx`
- Modify: `apps/h5/src/app/globals.css`
- Modify: `tests/e2e/acceptance/demo.browser.mjs`
- Modify: `tests/e2e/h5/mobile.browser.mjs`

**Interfaces:**
- Consumes: 浏览器 `localStorage`、`StorageEvent` 和现有双端 Reader DOM。
- Produces: `ReadingFontSize = "standard" | "large" | "xlarge"`、`READING_FONT_SIZE_KEY`、`parseReadingFontSize(value)`、`readReadingFontSize(storage)`、`readingFontSizeBootScript`、`ReadingFontSizeControl()`。

- [ ] **Step 1: 写偏好白名单、存储异常和预恢复失败测试**

创建 `tests/unit/reader/reading-preferences.test.ts`：

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseReadingFontSize,
  readReadingFontSize,
  READING_FONT_SIZE_KEY,
  readingFontSizeBootScript,
} from "../../../packages/ui/src/reading-preferences";

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
```

- [ ] **Step 2: 运行偏好测试并确认模块缺失**

Run:

```bash
npx --yes pnpm@11.23.0 exec tsx --tsconfig apps/api/tsconfig.json --test tests/unit/reader/reading-preferences.test.ts
```

Expected: FAIL，原因是 `reading-preferences.ts` 尚不存在。

- [ ] **Step 3: 实现无框架偏好模块**

创建 `packages/ui/src/reading-preferences.ts`：

```ts
export const READING_FONT_SIZE_KEY = "daytrace.readingFontSize.v1";

export const READING_FONT_SIZE_OPTIONS = [
  { value: "standard", label: "标准" },
  { value: "large", label: "较大" },
  { value: "xlarge", label: "特大" },
] as const;

export type ReadingFontSize = (typeof READING_FONT_SIZE_OPTIONS)[number]["value"];

export interface ReadingFontSizeStorage {
  readonly getItem: (key: string) => string | null;
}

export function parseReadingFontSize(value: string | null): ReadingFontSize {
  return value === "large" || value === "xlarge" ? value : "standard";
}

export function readReadingFontSize(storage: ReadingFontSizeStorage | null): ReadingFontSize {
  try {
    return parseReadingFontSize(storage?.getItem(READING_FONT_SIZE_KEY) ?? null);
  } catch {
    return "standard";
  }
}

export const readingFontSizeBootScript = `(()=>{let v="standard";try{const s=localStorage.getItem(${JSON.stringify(READING_FONT_SIZE_KEY)});if(s==="large"||s==="xlarge"||s==="standard")v=s;}catch{}document.documentElement.dataset.readingFontSize=v;})();`;
```

- [ ] **Step 4: 运行单元测试并确认通过**

Run:

```bash
npx --yes pnpm@11.23.0 exec tsx --tsconfig apps/api/tsconfig.json --test tests/unit/reader/reading-preferences.test.ts
```

Expected: 3 个测试全部 PASS。

- [ ] **Step 5: 写桌面与 H5 持久化、键盘和布局失败测试**

桌面新增检查：

```js
await check("reader font preferences restore, reject invalid values and stay keyboard accessible", async () => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go(tech);
  const body = page.getByText("这是一份演示复盘。", { exact: false }).first();
  const fontSize = () => body.evaluate(node => getComputedStyle(node.parentElement).fontSize);
  assert.equal(await fontSize(), "17.2px");
  const large = page.getByRole("button", { name: "较大", exact: true });
  await large.click();
  assert.equal(await large.getAttribute("aria-pressed"), "true");
  assert.equal(await fontSize(), "19.2px");
  assert.equal(await page.evaluate(() => localStorage.getItem("daytrace.readingFontSize.v1")), "large");
  await page.reload();
  await page.waitForLoadState("networkidle");
  assert.equal(await fontSize(), "19.2px");
  const xlarge = page.getByRole("button", { name: "特大", exact: true });
  await xlarge.focus();
  await page.keyboard.press("Space");
  assert.equal(await fontSize(), "21.2px");
  assert.equal(await xlarge.getAttribute("aria-pressed"), "true");
  for (const width of [390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  }
  await page.evaluate(() => localStorage.setItem("daytrace.readingFontSize.v1", "not-a-size"));
  await page.reload();
  await page.waitForLoadState("networkidle");
  assert.equal(await fontSize(), "17.2px");
  assert.equal(await page.getByRole("button", { name: "标准", exact: true }).getAttribute("aria-pressed"), "true");
});
```

H5 在现有正文检查中新增：

```js
const bodyFont = () => page.locator(".h5-reader-body").evaluate(node => getComputedStyle(node).fontSize);
assert.equal(await bodyFont(), "17px");
await page.getByRole("button", { name: "较大", exact: true }).click();
assert.equal(await bodyFont(), "19px");
await go(tech.replace("/h5", ""));
assert.equal(await page.getByRole("button", { name: "较大", exact: true }).getAttribute("aria-pressed"), "true");
assert.equal(await page.evaluate(() => localStorage.getItem("daytrace.readingFontSize.v1")), "large");
await go(tech);
await page.reload();
await page.waitForLoadState("networkidle");
assert.equal(await bodyFont(), "19px");
await page.evaluate(() => localStorage.setItem("daytrace.readingFontSize.v1", "invalid"));
await page.reload();
await page.waitForLoadState("networkidle");
assert.equal(await bodyFont(), "17px");
const xlarge = page.getByRole("button", { name: "特大", exact: true });
await xlarge.focus();
await page.keyboard.press("Space");
assert.equal(await bodyFont(), "21px");
for (const width of [390, 430]) {
  await page.setViewportSize({ width, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
}
```

- [ ] **Step 6: 运行双端浏览器测试并确认控件缺失**

Run:

```bash
DEMO_MANAGED_SERVER=1 DEMO_PORT=3180 DEMO_API_PORT=3181 DEMO_EVIDENCE_DIR=.local/SHARE-001/task3-red npx --yes pnpm@11.23.0 test:browser
H5_TEST_SITE_PORT=3190 H5_TEST_API_PORT=3191 H5_TEST_H5_PORT=3192 H5_TEST_EVIDENCE_DIR=.local/SHARE-001/task3-h5-red npx --yes pnpm@11.23.0 test:h5
```

Expected: 新检查因找不到“较大”按钮而 FAIL。

- [ ] **Step 7: 实现共享按钮控件与精确子路径导出**

创建 `packages/ui/src/reading-font-size-control.tsx`：

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  READING_FONT_SIZE_KEY,
  READING_FONT_SIZE_OPTIONS,
  parseReadingFontSize,
  readReadingFontSize,
  type ReadingFontSize,
} from "./reading-preferences";

export function ReadingFontSizeControl() {
  const [current, setCurrent] = useState<ReadingFontSize>("standard");

  useEffect(() => {
    const apply = (value: ReadingFontSize) => {
      document.documentElement.dataset.readingFontSize = value;
      setCurrent(value);
    };
    apply(readReadingFontSize(window.localStorage));
    const onStorage = (event: StorageEvent) => {
      if (event.key === READING_FONT_SIZE_KEY) apply(parseReadingFontSize(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const select = (value: ReadingFontSize) => {
    document.documentElement.dataset.readingFontSize = value;
    setCurrent(value);
    try {
      window.localStorage.setItem(READING_FONT_SIZE_KEY, value);
    } catch {
      // Storage denial retains the in-memory preference.
    }
  };

  return (
    <div className="dt-reading-preferences" role="group" aria-label="正文字号">
      <span className="dt-reading-preferences__label">字号</span>
      <div className="dt-reading-preferences__options">
        {READING_FONT_SIZE_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            className="dt-reading-preferences__option"
            aria-pressed={current === option.value}
            onClick={() => select(option.value)}
          >{option.label}</button>
        ))}
      </div>
    </div>
  );
}
```

在 `packages/ui/package.json` 添加精确导出，避免阅读页经根入口引入无关控件：

```json
"./reading-preferences": "./src/reading-preferences.ts",
"./reading-font-size-control": "./src/reading-font-size-control.tsx"
```

在 `packages/ui/src/index.ts` 同步导出 `ReadingFontSizeControl`、偏好函数和类型；在 `packages/ui/src/tokens.css` 第一行添加：

```css
@import "./reading-preferences.css";
```

- [ ] **Step 8: 实现字号变量和控件响应式样式**

创建 `packages/ui/src/reading-preferences.css`：

```css
.dt-reading-preferences { display: inline-flex; min-width: 0; align-items: center; gap: 8px; color: var(--muted); font-family: var(--sans); font-size: 11px; letter-spacing: 0; }
.dt-reading-preferences__label { flex: none; }
.dt-reading-preferences__options { display: inline-flex; padding: 2px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper-light); }
.dt-reading-preferences__option { min-width: 44px; min-height: 44px; padding: 6px 9px; border: 0; border-radius: 7px; background: transparent; color: var(--muted); font-size: 11px; line-height: 1.4; }
.dt-reading-preferences__option[aria-pressed="true"] { background: var(--archive); color: var(--paper); }
.dt-reading-preferences__option:hover { color: var(--ink); }
.dt-reading-preferences__option[aria-pressed="true"]:hover { color: var(--paper); }
.reader-tools { display: flex; min-width: 0; align-items: center; gap: 12px; }
:root { --reader-font-size: 1.075rem; --h5-reader-font-size: 17px; }
:root[data-reading-font-size="large"] { --reader-font-size: 1.2rem; --h5-reader-font-size: 19px; }
:root[data-reading-font-size="xlarge"] { --reader-font-size: 1.325rem; --h5-reader-font-size: 21px; }
@media (max-width: 767px) {
  .reader-topline { flex-wrap: wrap; gap: 12px; }
  .reader-tools { flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
  .reader-tools > span { display: none; }
}
@media (max-width: 359px) {
  .dt-reading-preferences__label { display: none; }
  .dt-reading-preferences__option { min-width: 42px; padding-inline: 7px; }
}
```

桌面正文选择器使用 `font-size: var(--reader-font-size)`；H5 `.h5-reader-body` 使用 `font-size: var(--h5-reader-font-size)`，其余标题、导航和控件字号保持原值。

- [ ] **Step 9: 接线预恢复和四个阅读入口**

在桌面和 H5 根布局导入：

```tsx
import { readingFontSizeBootScript } from "@daytrace/ui/reading-preferences";
```

在 `<html lang="zh-CN" suppressHydrationWarning>` 内、`<body>` 前加入：

```tsx
<head><script dangerouslySetInnerHTML={{ __html: readingFontSizeBootScript }} /></head>
```

在桌面公开阅读、桌面主人阅读和 H5 `MobileReader` 导入并渲染：

```tsx
import { ReadingFontSizeControl } from "@daytrace/ui/reading-font-size-control";

<ReadingFontSizeControl />
```

桌面把控件放在 `.reader-tools` 内；H5 把控件放在返回链接行之后、私密提示之前。主人页仍由 `ownerApi()` 读取，不增加任何公开数据回退。

- [ ] **Step 10: 重跑双端测试并提交偏好切片**

Run:

```bash
npx --yes pnpm@11.23.0 exec tsx --tsconfig apps/api/tsconfig.json --test tests/unit/reader/reading-preferences.test.ts
DEMO_MANAGED_SERVER=1 DEMO_PORT=3180 DEMO_API_PORT=3181 DEMO_EVIDENCE_DIR=docs/project/evidence/SHARE-001 npx --yes pnpm@11.23.0 test:browser
H5_TEST_SITE_PORT=3190 H5_TEST_API_PORT=3191 H5_TEST_H5_PORT=3192 H5_TEST_EVIDENCE_DIR=docs/project/evidence/SHARE-001/h5 npx --yes pnpm@11.23.0 test:h5
npx --yes pnpm@11.23.0 lint
npx --yes pnpm@11.23.0 typecheck
```

Expected: 偏好单元 3／3 PASS；桌面 17.2／19.2／21.2px、H5 17／19／21px；刷新、跨端、非法值、键盘和 390／430px 布局检查 PASS。

Commit:

```bash
git add packages/ui/src packages/ui/package.json apps/site/src/app/layout.tsx apps/h5/src/app/layout.tsx 'apps/site/src/app/records/[recordRef]/page.tsx' 'apps/site/src/app/owner/records/[recordId]/page.tsx' apps/site/src/features/reader/reader.module.css apps/h5/src/components/mobile-reader.tsx apps/h5/src/app/globals.css tests/unit/reader/reading-preferences.test.ts tests/e2e/acceptance/demo.browser.mjs tests/e2e/h5/mobile.browser.mjs docs/plans/2026-11-04-public-sharing-reading-preferences.md
git commit -m "feat(reader): persist reading font preferences across apps"
git push origin dev
```

### Task 4: 全量回归、托管 CI 与交接

**Files:**
- Create: `docs/project/reports/SHARE-001.md`
- Create: `docs/project/evidence/SHARE-001/browser-results.json`
- Create: `docs/project/evidence/SHARE-001/h5/browser-results.json`
- Create: `docs/project/evidence/SHARE-001/ci-run.json`
- Create: `docs/collaboration/handoffs/SHARE-001-kimi-sharing.md`
- Create: `docs/collaboration/reviews/SHARE-001-self-review.md`
- Modify: `docs/context/当前工作上下文.md`
- Modify: `docs/project/项目进度.md`
- Modify: `docs/collaboration/board.json`

**Interfaces:**
- Consumes: Task 1–3 的提交和测试证据。
- Produces: 可复现的验证清单、真实提交号、托管 CI 运行号、未验证边界和中央任务交接；不产生部署或生产验收结论。

- [ ] **Step 1: 执行完整静态、单元、集成、内容和构建门禁**

Run:

```bash
npx --yes pnpm@11.23.0 lint
npx --yes pnpm@11.23.0 typecheck
npx --yes pnpm@11.23.0 test:unit
npx --yes pnpm@11.23.0 test:integration
npx --yes pnpm@11.23.0 test:content
npx --yes pnpm@11.23.0 build
```

Expected: 所有命令 exit code 0；任一失败都先修复并独立提交，不进入交接。

- [ ] **Step 2: 执行双端全量浏览器回归并保存证据**

Run:

```bash
DEMO_MANAGED_SERVER=1 DEMO_PORT=3180 DEMO_API_PORT=3181 DEMO_EVIDENCE_DIR=docs/project/evidence/SHARE-001 npx --yes pnpm@11.23.0 test:browser
H5_TEST_SITE_PORT=3190 H5_TEST_API_PORT=3191 H5_TEST_H5_PORT=3192 H5_TEST_EVIDENCE_DIR=docs/project/evidence/SHARE-001/h5 npx --yes pnpm@11.23.0 test:h5
```

Expected: 所有 checks 和 layouts 为 passed，consoleErrors 为空；证据明确写入 `formalReleaseReady: false`、合成数据、非真实 iPhone、未部署。

- [ ] **Step 3: 核验最新功能提交的托管 CI**

读取 `git rev-parse HEAD` 得到最新功能提交，通过 GitHub CLI 或公开 API 查询该提交的 Actions 运行，将原始响应保存到 `docs/project/evidence/SHARE-001/ci-run.json`：

```bash
gh run list --commit "$(git rev-parse HEAD)" --json databaseId,headSha,status,conclusion,url
```

Expected: 目标运行 `status` 为 `completed`、`conclusion` 为 `success`，`headSha` 与功能提交完全一致。后续文档提交没有新 CI 结果时，不得把功能提交的运行说成文档提交已验证。

- [ ] **Step 4: 写报告、交接与自审**

`docs/project/reports/SHARE-001.md` 必须逐项记录：三个功能提交、游标与 XML 测试、8 篇公开示例、私密／草稿／未知 ID 负例、PNG 尺寸和视觉检查、双端字号、实际测试数量、Node 版本、CI 提交与运行号，以及未验证的真实 Auth0、iPhone/Safari、社交爬虫、生产 HTTPS、备份恢复、回滚和性能预算。

交接使用 `docs/collaboration/templates/交接模板.md`，自审使用 `docs/collaboration/templates/评审模板.md`；只写实际执行的命令和结果，不把本地 Chromium 改写为真机验收。

- [ ] **Step 5: 更新中央状态并执行文档检查**

通过任务脚本提交和完成 `SHARE-001`：

```bash
python3 scripts/task_claim.py submit SHARE-001 kimi-F4-001-sharing --evidence docs/project/reports/SHARE-001.md
python3 scripts/task_claim.py complete SHARE-001 kimi-F4-001-sharing --evidence docs/collaboration/reviews/SHARE-001-self-review.md
python3 scripts/project_check.py
```

Expected: `SHARE-001` 为 done，QA-001 仍 queued，RELEASE-001 仍 queued，UI-002 仍 blocked；文档检查无错误。

- [ ] **Step 6: 独立提交文档与证据并核对最终分支**

```bash
git add docs/plans/2026-11-04-public-sharing-reading-preferences.md docs/project/reports/SHARE-001.md docs/project/evidence/SHARE-001 docs/collaboration/handoffs/SHARE-001-kimi-sharing.md docs/collaboration/reviews/SHARE-001-self-review.md docs/collaboration/board.json docs/context/当前工作上下文.md docs/project/项目进度.md
git commit -m "docs(sharing): close F4 verification and handoff"
git push origin dev
git status --short --branch
git rev-parse HEAD
git rev-parse origin/dev
```

Expected: 本地 HEAD 与 `origin/dev` 一致；不合并 `main`，不部署，不清理或提交他人未跟踪文件和测试生成现场。

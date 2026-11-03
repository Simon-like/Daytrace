# Daytrace Motion Reference Implementation Plan

> **For agentic workers:** Execute inline in the current session with task-by-task checks. Subagent dispatch is not authorized. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement MOTION-001 in Select, mobile navigation, image lightbox and the remaining local controls without delaying reading or adding an animation runtime.

**Architecture:** Keep Radix and native `<dialog>` semantics. Use shared CSS custom properties, `transform`／`opacity`, `@starting-style` and discrete `display`／`overlay` transitions so closing does not require JavaScript timers. Verify real Chromium interaction and capture timeline evidence under normal and 4× CPU throttling.

**Tech Stack:** Next.js 16.4.3, React 19.3.1, Tailwind CSS 4.3.3, Radix Select 2.4.1, Radix Checkbox 1.4.1, Playwright 1.64.1, Node.js 24.18.0, pnpm 11.23.0.

## Global Constraints

- Follow `docs/design/动效系统基线-v1.0.md`; ordinary motion uses 120–240ms, small transforms and no spring or scroll hijacking.
- Do not add dependencies or modify the lockfile.
- Do not modify API, content fixtures, permissions or production configuration.
- Preserve UI-001 and MOTION-001 source worktrees; this worktree contains their changes only as inherited dependency patches.
- Reduced motion must remove non-essential movement while retaining focus, text, ARIA state and functionality.
- Do not run `git commit` or `git push` without explicit user authorization.

---

### Task 1: Shared tokens and Select reference

**Files:**
- Modify: `apps/site/src/app/globals.css`
- Modify: `apps/site/src/components/ui/select.tsx`
- Modify: `tests/e2e/acceptance/demo.browser.mjs`
- Evidence: `docs/project/evidence/MOTION-002/`

**Interfaces:**
- Consumes: existing Radix `SelectPrimitive.Content` and `data-state="open|closed"`.
- Produces: `--motion-duration-*`, `--motion-ease-*`, `--motion-distance-*` tokens and `.select-content` behavior reused by other local components.

- [ ] **Step 1: Add failing browser assertions**

Extend the Select check to assert open and closed animation names, chevron rotation, 4px transform distance and reduced-motion `animation-name: none`:

```js
const content = page.getByRole("listbox");
await expectPoll(() => content.evaluate(node => getComputedStyle(node).animationName)).toBe("daytrace-select-in");
await category.focus();
await page.keyboard.press("Enter");
await expectPoll(() => content.evaluate(node => getComputedStyle(node).animationName)).toBe("daytrace-select-out");
await page.emulateMedia({ reducedMotion: "reduce" });
assert.equal(await content.evaluate(node => getComputedStyle(node).animationName), "none");
```

Use the existing Playwright `waitForFunction` helper style instead of adding a test framework.

- [ ] **Step 2: Run the focused browser test and confirm the missing behavior**

Run:

```bash
DEMO_MANAGED_SERVER=1 DEMO_PORT=3120 DEMO_API_PORT=3121 DEMO_EVIDENCE_DIR=docs/project/evidence/MOTION-002 pnpm test:browser
```

Expected: the existing Select opens, but the new animation-name and reduced-motion assertions fail.

- [ ] **Step 3: Implement shared tokens and Select motion**

Add root tokens and Tailwind mappings in `globals.css`:

```css
:root {
  --motion-duration-micro: 120ms;
  --motion-duration-control: 160ms;
  --motion-duration-enter: 200ms;
  --motion-duration-exit: 140ms;
  --motion-duration-overlay: 240ms;
  --motion-ease-standard: cubic-bezier(.2, 0, 0, 1);
  --motion-ease-enter: cubic-bezier(.16, 1, .3, 1);
  --motion-ease-exit: cubic-bezier(.4, 0, 1, 1);
}
```

Add `.select-content[data-state=open]`／`[data-state=closed]` keyframes using only `opacity` and `translateY(4px)`; rotate `.select-chevron` through `[data-state=open]`. Keep animation names stable for evidence and disable them in the existing reduced-motion guard.

- [ ] **Step 4: Re-run Select keyboard and reduced-motion checks**

Run the same browser command. Expected: Select opens, reverses, selects with keyboard and becomes static under reduced motion without changing value or focus behavior.

### Task 2: Native dialog motion for mobile navigation and lightbox

**Files:**
- Modify: `apps/site/src/app/globals.css`
- Modify: `apps/site/src/components/navigation.tsx`
- Modify: `apps/site/src/features/reader/image-lightbox.tsx`
- Modify: `apps/site/src/features/reader/reader.module.css`
- Modify: `tests/e2e/acceptance/demo.browser.mjs`

**Interfaces:**
- Consumes: existing `showModal()`, `close()`, `onClose`, `onCancel`, focus return and viewport restoration.
- Produces: timer-free CSS enter／exit transitions using `display` and `overlay` with `allow-discrete`.

- [ ] **Step 1: Add rapid-operation and exit-state browser tests**

For each dialog, open, close with Escape, reopen before the exit interval ends, then assert exactly one open modal, restored trigger focus and unlocked document scrolling:

```js
await page.getByRole("button", { name: "打开导航" }).click();
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "打开导航" }).click();
assert.equal(await page.getByRole("dialog").count(), 1);
await page.keyboard.press("Escape");
await page.waitForFunction(() => document.body.style.overflow !== "hidden");
assert.equal(await page.getByRole("button", { name: "打开导航" }).evaluate(node => node === document.activeElement), true);
```

Add equivalent image-lightbox assertions using the existing recipe image trigger.

- [ ] **Step 2: Run tests and confirm the current abrupt behavior**

Run the focused browser suite. Expected: functional focus checks pass, while computed transition／starting-style assertions and reduced-motion checks fail before CSS changes.

- [ ] **Step 3: Implement discrete native-dialog transitions**

Use this pattern for mobile navigation and the lightbox; no close timer or state queue:

```css
.mobile-menu {
  opacity: 0;
  transform: translateX(100%);
  transition: opacity var(--motion-duration-exit) var(--motion-ease-exit),
    transform var(--motion-duration-exit) var(--motion-ease-exit),
    display var(--motion-duration-exit) allow-discrete,
    overlay var(--motion-duration-exit) allow-discrete;
}
.mobile-menu[open] {
  opacity: 1;
  transform: translateX(0);
  transition-duration: var(--motion-duration-overlay);
  transition-timing-function: var(--motion-ease-enter);
}
@starting-style {
  .mobile-menu[open] { opacity: 0; transform: translateX(100%); }
}
```

Use opacity plus `scale(.98)` for the lightbox panel and opacity for both backdrops. Remove `backdrop-filter` animation and retain native Escape／focus logic.

- [ ] **Step 4: Re-run mobile and lightbox tests**

Expected: repeated operations leave no residual overlay or scroll lock; reduced motion produces immediate open／close with identical focus and reading-position restoration.

### Task 3: Promote motion tokens to remaining controls

**Files:**
- Modify: `apps/site/src/components/ui/button.tsx`
- Modify: `apps/site/src/components/ui/input.tsx`
- Modify: `apps/site/src/components/ui/checkbox.tsx`
- Modify: `apps/site/src/features/records/record-filters.tsx`
- Modify: `apps/site/src/features/search/search-panel.tsx`
- Modify: `apps/site/src/features/search/search-results.tsx`
- Modify: `apps/site/src/features/reader/table-of-contents.tsx`
- Modify: `tests/e2e/acceptance/demo.browser.mjs`

**Interfaces:**
- Consumes: tokens from Task 1 and current local UI components.
- Produces: consistent micro-feedback; no per-item list animation and no route／article entrance.

- [ ] **Step 1: Add reduced-motion and non-regression assertions**

Assert that Buttons, Input, Checkbox, links, result containers and TOC use the shared duration values and become `transition-duration: 0s` under reduced motion. Assert that result items have `animation-name: none` and article paragraphs are visible before enhancement.

- [ ] **Step 2: Replace ad-hoc durations and add restrained state feedback**

Use Tailwind token mappings or local classes for `duration-micro`, `duration-control` and `ease-standard`. Give the expanded tag fieldset a single 160–200ms opacity entrance and search result container a single 160ms opacity transition; do not animate individual records or container height.

- [ ] **Step 3: Run component browser and unit tests**

Run:

```bash
pnpm test:unit
DEMO_MANAGED_SERVER=1 DEMO_PORT=3120 DEMO_API_PORT=3121 DEMO_EVIDENCE_DIR=docs/project/evidence/MOTION-002 pnpm test:browser
```

Expected: all existing behavior plus the new motion assertions pass.

### Task 4: Performance evidence and delivery

**Files:**
- Create: `tests/e2e/acceptance/motion-performance.mjs`
- Create: `docs/project/evidence/MOTION-002/motion-results.json`
- Create: `docs/project/evidence/MOTION-002/*.json`
- Create: `docs/project/reports/MOTION-002.md`
- Create: central handoff and self-review files listed by the collaboration protocol.

**Interfaces:**
- Consumes: running local demo and Chrome DevTools Protocol through Playwright.
- Produces: reproducible normal／4× CPU timeline records and a report separating measured evidence from untested devices.

- [ ] **Step 1: Record normal and throttled dialog interactions**

Use `browser.newBrowserCDPSession()` or a page CDP session with `Emulation.setCPUThrottlingRate({ rate: 4 })`, `Tracing.start` and `Tracing.end`. Record Select, mobile navigation and lightbox open／close plus rapid reversal; save raw trace events and a summary containing `RunTask` events over 50ms, layout／paint counts and console errors.

- [ ] **Step 2: Measure script and layout stability**

Reuse the existing necessary-script gzip method and collect `PerformanceObserver` `layout-shift` entries during motion. Do not convert a lab run into field Core Web Vitals or real-iPhone evidence.

- [ ] **Step 3: Run final quality gates**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
python3 scripts/project_check.py
git diff --check
```

Expected: all executed gates pass; any pre-existing script-budget failure remains explicitly open rather than being relabeled as passed.

- [ ] **Step 4: Record MOTION-002 handoff and self-review**

Document component motion cards, exact test counts, trace paths, screenshot paths, dependency-free implementation, remaining performance budget and the fact that no real iPhone or production acceptance was run. Submit and complete the central task only with existing evidence files.

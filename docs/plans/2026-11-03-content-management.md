# Markdown Content Management Implementation Plan

> **For agentic workers:** Execute task-by-task in this chat. Repository dev/main and central claim rules take precedence over external worktree or delegation workflows.

**Goal:** Let the owner import ordinary Markdown and attachments, preview drafts, publish, update, roll back and export while keeping portable source and stable article links.

**Architecture:** Nest remains the only content authority. Extend the existing renderer to a synchronous unified pipeline with trusted server-only enrichment. Store immutable full content snapshots and import drafts outside the scanner folders, atomically switch a persistent pointer, and let both readers consume the same HTML. Management is registered only when AuthModule is available and uses OwnerGuard + OriginCsrfGuard.

**Tech Stack:** Existing Node 24.18.0 / pnpm 11.23.0 / Next / Nest / TypeScript, unified, remark, rehype, Shiki, KaTeX and bounded ZIP handling.

## Global Constraints

- Work on dev; serial changes to shared routes/contracts/dependencies. Preserve pre-existing dirty files.
- Ordinary Markdown/YAML only; raw HTML and executable MDX remain rejected.
- Default new import to draft/private, current public content stays readable until explicit publish.
- Real credentials/content never go in fixtures, Git or browser evidence. No deployment.
- Status lives only in central board; plan checkboxes express verification steps, not duplicate owner/status state.

### Task 1: Server rendering and direct routes

Files: `apps/api/src/modules/content/markdown*.ts`, `content.controller.ts`, `content.service.ts`, `packages/contracts/src/index.ts`, `packages/content/src/public-api.ts`, both reader route pages and styles, dependency manifest/lock.

Interfaces: preserve `renderMarkdown(body, attachments, file)` return HTML/toc/parseRevision/issues, add source positions; retain section-N compatibility while introducing prefixed semantic anchors. Public alias resolution returns visible RecordSummary or 404 via `GET records/resolve/:slug`.

- [x] Add regression cases for footnote, math, syntax color, duplicate/Chinese headings, unsafe HTML/URL and old reader hooks; run `pnpm test:unit`.
- [x] Implement unified tree validation, rewrite links/assets and trusted post-sanitize enrichment; use `createHighlighterCoreSync` so snapshot loading remains deterministic. Unknown code language renders escaped plaintext.
- [x] Add direct alias index API and replace list scanning; test private alias stays 404 and old slug redirects.
- [x] Run typecheck/unit and build API; commit and push renderer feature.

### Task 2: Persistent content maintenance API

Files: new `apps/api/src/modules/content-management/{files,normalize,store,service,controller,module}.ts` and tests, snapshot loading integration, auth registration and proxy.

Interfaces: authenticated `/owner/content` JSON list; multipart `/owner/imports` produces batch id, summaries, preview HTML and source issues; POST `/owner/imports/:id/commit` consumes baseRevision and explicit status/visibility; GET record export/history, POST metadata/rollback. All writes use existing origin/CSRF guard. Snapshot pointer references an immutable tree; restart validates before serving it.

- [x] Test new import cannot be read publicly, invalid/missing resources cannot mutate current snapshot, optimistic revision conflicts produce 409, atomic batch publish switches current state and survives restart.
- [x] Implement bounded file/ZIP intake rejecting traversal, symlinks, unsupported MIME and inconsistent file signatures; normalize MD/YAML, first H1/title, resources, same-batch links, default private drafts.
- [x] Implement staged snapshots, single writer plus filesystem lock, persisted current pointer, immutable history, update identity/revision checks, safe rollback preserving current visibility, standard ZIP export.
- [x] Verify HTTP unauthenticated/CSRF writes fail, owner preview assets work for draft and disappear after revocation, export roundtrip passes. Commit and push API feature.

### Task 3: Owner content UI and operational handoff

Files: `apps/site/src/features/content-management/*`, `/owner/content/page.tsx`, owner navigation, API proxy; dev/demo runtime handling; browser tests, contracts and user guide docs.

Interfaces: File picker/drag/drop/directory/ZIP inputs feed the import API; review shows private draft state and row diagnostics; preview uses existing reader HTML hooks. Management list has search/type/status/visibility filters and per-record update, metadata, publish/private/archive, revisions/rollback and export.

- [x] Build owner page using existing olive/paper tokens, serif headings and handwritten note; mobile form controls stack, no new design system or client Markdown parser.
- [x] Keep preview and writes private/no-store, explain expired session, show validation/conflict messages with corrective actions, reset file input after retry, disable repeated submit.
- [x] Run real HTTP integration, `pnpm typecheck`, `pnpm lint`, `pnpm build`, browser upload/preview/publish/update/rollback and mobile viewport checks with synthetic data. Record Safari/production items as unverified.
- [x] Update content guide/config/contract and handoff, run project_check and diff checks, commit and push dev. Final report names usable entry and actual limits.

## 收口

当前聊天按任务串行执行；没有新建分支或联系其他聊天。功能、修复、UI 和文档分开提交 dev。实际验证和限制见 CONTENT-003 报告；真实身份、真机、性能预算、Mermaid 与多实例同步未计为本轮通过能力。

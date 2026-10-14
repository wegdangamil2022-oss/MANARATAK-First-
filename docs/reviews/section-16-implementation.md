# Section 16 — Enterprise CMS & Site Experience

**Current source completion (14 October 2026):** [Section 16 completion](SECTION_16_COMPLETION_2026-10-14.md) records the five follow-up repairs on current main and 148 passing lightweight tests. The branch/baseline and executed checks below remain historical evidence; runtime remains deferred.

**Status: CODE_CLOSED — RUNTIME_DEFERRED**
**Branch:** `codex/section-16-cms`
**Reviewed starting commit:** `9ee538cd7479357877d6c80b599487a5b9ee2f1a`
**Verified source commit:** `b91ea7603697b3af58f99caae7608f3bd32b570c`
**Base:** `main@ea221887d6348493bd34d728971754d14fdb973a`
**Plan:** MANARATAK_ADMIN_REVIEW_CODEX, section 16 and 16.FG; 9 October 2026 source closure policy.

31 source tasks are closed (CMS-ADM-001–029 and FGA-16-001–002). CMS-ADM-030 and the real integration portions remain deferred until after section 28. This replaces the earlier accumulated PARTIAL reports; it does not claim production or runtime readiness. Main was not modified and section 17 was not started.

## Review outcome and completed repairs

The incoming branch already contained granular API permissions, review fingerprints, publication snapshots, EAP checks, scheduler recovery, typed owner integration and schema governance. Its reports still recorded unresolved source work and no executed TypeScript/Vitest checks. We reviewed those controls and repaired the remaining source/UI/delivery gaps before closing the code.

- Fixed schema-create TypeScript validation and authenticated last-editor expectations. The CMS navigation and route now admit `admin:cms:view` readers without incorrectly requiring the legacy broad manage grant; editor/reviewer/publisher/operator actions retain separate controls.
- Primary-locale root title/summary saves record the actual editor. Approval uses the effective editorial fingerprint and rejects changed roots. Prepared historic last-editor backfill uses recorded editorial events rather than always assuming the original author.
- Governed slug changes can continue as drafts while the previous publication stays live; ordinary editing cannot bypass the slug workflow. Publication/redirect conflicts fail before mutation, owned aliases follow republishing, archived owners suppress their aliases, and redirect updates record the actor/version.
- Added locale-specific, cursor-paged revision summaries and lazy history UI; detail reads no longer enumerate every revision payload. Restore requires expectedVersion and author permission.
- Added a schema-driven block editor, including declared nested asset paths through AssetPicker. Block edits preserve the approved public snapshot; elevated, versioned archive retires the snapshot atomically. Schema creation cannot request immediate publication.
- Completed Arabic/English CMS interface copy independently of the content locale, independent panel refresh/error handling, stale response guards, permission-aware controls, announcement windows, redirect provenance and owner-derived language readiness/hash.
- Review/calendar counts use the selected locale on the current page. P24 retains global review authority; page-local UI does not claim global totals or create another owner workflow.
- Public navigation resolves current published targets from immutable approved authoring snapshots. Renamed routes refresh; archived targets and orphan descendants disappear; owner outages cannot silently produce stale links. Country targets resolve real published destination profiles. Every supported foreign owner query compiles against typed Prisma contracts.
- Replaced stale CMS static HTML fallback with canonical-owner HTTP HTML. Published content, archive 404, real redirects, canonical/hreflang/robots metadata, minimal safe block text and XML sitemap come from current owner projections with no-store. A stable build-generated `/cms-app-entry.js` preserves the existing interactive frontend; its CSS and entry hashes are taken from the actual build. Client CMS metadata uses only published locale slugs and removes its tags on leaving the detail view.
- Worker publication audits retain the SYSTEM actor and carry actual durable job reference/attempt/idempotency key plus schedule/lease correlation.
- Prepared bounded-search compound/trigram index migration and documented post-28 EXPLAIN/rollout requirements. No database command was applied.

## Task closure map

`CODE_CLOSED` below means reviewed source with the local verification recorded in [validation](section-16-validation.json), not a real database/provider execution result.

| Task | Status | Final source control / evidence |
| --- | --- | --- |
| CMS-ADM-001 | CODE_CLOSED | Independent view/author/review/publish/ops grants; API denies, shared admission test and reader SSR test |
| CMS-ADM-002 | CODE_CLOSED | Effective root/localized/domain-link fingerprint; approved-root mutation regression |
| CMS-ADM-003 | CODE_CLOSED | Atomic canonical publication/SEO; governed slug draft continuation, conflicts, redirect provenance |
| CMS-ADM-004 | CODE_CLOSED | Immutable approved navigation/notice snapshots remain live through draft edits |
| CMS-ADM-005 | CODE_CLOSED | Reviewer differs from effective last editor/requestor; real-editor root tracking/backfill source |
| CMS-ADM-006 | CODE_CLOSED | Required versions, CAS and serializable mutation paths; mocked collision/deny tests |
| CMS-ADM-007 | CODE_CLOSED | Full revision graph restore, EAP preflight, fail-closed incompatible historic root, bounded history |
| CMS-ADM-008 | CODE_CLOSED | EAP publication/grant checks repeated at canonical publication and scheduled boundary |
| CMS-ADM-009 | CODE_CLOSED | Governed references and typed canonical domain-owner lifecycle reads |
| CMS-ADM-010 | CODE_CLOSED | Strict owner site/locale/slug/type; no hidden locale fallback |
| CMS-ADM-011 | CODE_CLOSED | Mutation cache invalidation; public canonical reads recheck owners, fresh HTTP HTML and sitemap no-store |
| CMS-ADM-012 | CODE_CLOSED | Failed schedule queue, bounded retries, operator-only reasoned recovery and UI |
| CMS-ADM-013 | CODE_CLOSED | Lease/version expiry checks inside the serializable publish boundary |
| CMS-ADM-014 | CODE_CLOSED | Cancel/restore/slug changes cancel pending or processing schedules |
| CMS-ADM-015 | CODE_CLOSED | Current published CMS/domain navigation target resolution; archive/orphan/outage regressions |
| CMS-ADM-016 | CODE_CLOSED | Governed schema versions/approval and immutable block projection, editable payloads and CAS archive |
| CMS-ADM-017 | CODE_CLOSED | Declared nested asset handles with EAP lifecycle checks; schema-aware asset UI |
| CMS-ADM-018 | CODE_CLOSED | Root owner/site excluded from generic PATCH and update allowlist |
| CMS-ADM-019 | CODE_CLOSED | PUBLIC-only audience, valid publication window, usable starts/expires form, missing update ID rejected |
| CMS-ADM-020 | CODE_CLOSED | Minimal public destination/status projection and safe HTTP redirect boundary |
| CMS-ADM-021 | CODE_CLOSED | Related lookup filters published locale/site before order/limit |
| CMS-ADM-022 | CODE_CLOSED | Role-aware navigation/banner/block authoring, publish and archive UI |
| CMS-ADM-023 | CODE_CLOSED | Owner HTTP HTML/301/308/404, canonical actual alternates, client metadata and live XML sitemap; real local nginx mock contract |
| CMS-ADM-024 | CODE_CLOSED | Bounded search; source-only scoped ordering and pg_trgm index plan; realistic SQL performance remains deferred |
| CMS-ADM-025 | CODE_CLOSED | Selected-locale/current-page counts clearly local; P24 global owner preserved |
| CMS-ADM-026 | CODE_CLOSED | Lazy paged revision summaries, strict cursor/API preconditions and bounded detail history |
| CMS-ADM-027 | CODE_CLOSED | Independent panel failure/refresh/loading states and locale stale-response protection |
| CMS-ADM-028 | CODE_CLOSED | Complete CMS AR/EN UI, interface language separate from content locale, SSR checks |
| CMS-ADM-029 | CODE_CLOSED | SYSTEM scheduled audit with durable job/attempt/idempotency and schedule/lease context test |
| CMS-ADM-030 | RUNTIME_DEFERRED | Real migrations, roles, EAP/CDN, workers, SQL/index performance and browser E2E after section 28 |
| FGA-16-001 | CODE_CLOSED | Scoped redirect search/status/total/paging, edit/disable reason/version, actor provenance and audits |
| FGA-16-002 | CODE_CLOSED | Read-only owner readiness/version/hash/required fields for each locale; bilingual publish not forced |

## Executed verification

Supported Node 22.23.3. Raw command logs are in [evidence/section-16](evidence/section-16); command outcomes and source commits are in [section-16-validation.json](section-16-validation.json).

- Full monorepo `npm run typecheck`: PASS.
- Targeted Vitest: **26 files / 118 tests / 0 failures**, with real local HTTP API fixtures and mocked repositories, owners, assets and workers. Tests execute controls but do not simulate a real PostgreSQL transaction isolation engine.
- Admin, web and API builds: PASS. Web artifact includes the stable CMS entry and actual hashed CSS/module. Existing admin font/bundle and API certificate import.meta build warnings remain recorded; no certificate/runtime claim follows from that build.
- Targeted ESLint: PASS, zero findings. Source-quality gate: PASS, zero package/file cycles and accessibility findings.
- Prisma generation/schema validation: PASS, dummy local URL only, no database connection.
- Phase16/CMS/W4 source verifiers: **20/20, 20/20 and 12/12**, static assertions only.
- Official nginx 1.28.0, compiled as a temporary local verification binary: **7/7**. Actual repository config with only host/port/static-root fixture substitutions verifies syntax, owner freshness/query isolation, archive 404/no static fallback, HTTP redirect, live sitemap, outage status and stable JS MIME/no-store/missing-entry 404. This is not a staging deployment or CDN test.
- `git diff --check`: PASS.

The final nginx-only MIME adjustment is verified by the final local nginx run; application TypeScript/tests/builds cover the unchanged application source from `14c57d4590386200c403e7f6280827f0212b9c33`.

## Deployment and runtime boundaries

See [closure gates and post-28 matrix](section-16-closure-gates.md). No migration, db push, seed/reset, live provider, real worker, browser E2E, CDN purge or deployment ran. The checked-in nginx route must be used or equivalently configured by the eventual ingress; a static-only Vite host cannot implement server HTTP status/owner freshness on its own. Configure an HTTPS `PUBLIC_WEB_URL`/`VITE_PUBLIC_WEB_URL` and matching same-origin API route before rollout.

Navigation fails closed for domain entities without a real frontend detail route (for example PROGRAM has no dedicated public route); domain-link identity validation remains available. Block HTML renders safe title/body/summary text; richer schema-specific presentation is optional future UI work, and raw asset handles are never turned into fabricated URLs. Historical schemas or revision graphs that lack current compatibility require governed repair, not automatic unsafe restoration.

Main remains at the recorded base; no section 16 merge or section 17 work was performed.

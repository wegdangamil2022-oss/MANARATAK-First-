> Current follow-up (2026-10-14): [Section 26 completion](SECTION_26_COMPLETION_2026-10-14.md). 32 contract tests, two UI tests and Node 22 compilation passed; documented owner metric limits remain. Historical checkpoint below.

# Section 26 — Admin Executive Dashboard

Branch: `fix/codex-section-26-executive-dashboard`. Base: `main@4af2c2cf`, including sections 24/25 (`aec45841` / `423e699c`) merged via `195eb166` and documented at `52ad7c63`.

Disposition: **SOURCE_IMPLEMENTED — INITIAL_FAILURES_CORRECTED_WITHOUT_RERUN — RUNTIME_DEFERRED_AFTER_SECTION_28**. This is not an all-green validation or production certificate. The user authorized pushing sections 24/25 to main and starting section 26; this section remains on its independent branch.

The Dashboard is now a read-only consumer of a typed source/permission/metric registry, runtime validators, a bounded incremental loader, scoped AR/EN copy and rendering components. No business mutation, new dashboard persistence or independent health reducer exists.

| Plan | Source implementation / explicit boundary |
| --- | --- |
| DSH-ADM-001 | Protected `/admin/monitoring/overview` only; public diagnostics remain disabled. |
| 002 | Reuses section-25 `parseHealthOverview` and its owner release gate. Liveness, dependency readiness, diagnostic gate and configuration counts are displayed independently; diagnostic success is not production approval. |
| 003 | UP/DEGRADED/DOWN/UNKNOWN are preserved without mapping DEGRADED to DOWN/UP. Status text is localized and accessible. |
| 004 | Request state distinguishes available, restricted, unavailable, browser network error, timed out and stale. 401/403/503/browser failure cannot fabricate runtime DOWN. |
| 005 | Every source requires all owner grants before a request or link appears. Permission changes abort old reads and immediately fence displayed values before effects run. The dashboard route still needs platform permission; owner grants alone do not grant control-plane entry. |
| 006 | Human identity count uses the actual envelope and `type=Human`; `/identities?type=Human` now initializes and preserves the receiving owner filter. It counts all human lifecycle states, not active users/students. No identity editor in Dashboard. |
| 007 | Scholarship review uses status READY_TO_REVIEW total; imported and ready-to-publish are independent counters. |
| 008 | All-course review and imported-course review/link/verification overview are separate. No blind unique sum of overlapping sets. |
| 009 | Attention is a set of independent possibly overlapping signals; configuration blockers are only in health. There is no claimed unique-workload grand total. |
| 010 | Exact and qualified-partial selectors reject missing operands/overflow. UI never silently adds partial counts into an exact headline. |
| 011 | Import batches/records and each status counter are safe integers; missing/invalid is null, actual zero is zero. No number coercion or absent-status fallback. |
| 012 | Three concurrent source requests, five-second per-source budget, no sequential domain stages; healthy cards update before other sources finish. Permission-scoped in-memory evidence and TTL prevent unnecessary focus rereads; explicit refresh uses no-store to obtain new owner truth. Each registered counter source is read once per refresh, even when displayed in attention and owner groups. No elevated aggregate or new count store. |
| 013 | Single-flight lock, abort and generation/unmount fencing. Manual refresh is disabled during initial/refresh work. Last-good data survives failed reads as explicitly stale; denial erases it. |
| 014 | CMS IN_REVIEW and READY_TO_PUBLISH remain distinct fields and queue predicates. Counts are content roots, not locale variants. |
| 015 | Each lifecycle total is its own independent reading; a failed published filter leaves the total/review fields usable. Summary readers preserve valid fields as partial and mark invalid fields unknown. No ad-hoc duplicate whole-domain retry. |
| 016 | Per-source capturedAt and receivedAt with BEST_EFFORT_OWNER_READS. Cross-owner reads do not claim a single transaction/finance-grade snapshot. |
| 017 | Finance needs finance permission; denial differs from HTTP/server failure. Projection discards attention/account/value details and retains only safe pending counts plus validated reconciliation status. Stale reconciliation does not display a current healthy verdict. |
| 018 | Safe service catalog counts added. Certificate issuance failures, service-request backlog, notification dead letters, student-support alerts and analytics explicitly NOT_MEASURED until approved owner aggregate contracts; no private application/student source is loaded. |
| 019 | Owner-specific runtime projection validates nonnegative safe integers, identity/import envelopes, finance enums, activity protocol and reused health v2. No NaN/fraction/negative/coerced-string counts. Unknown/forbidden/not-measured distinct from zero. |
| 020 | Analytics contract documents consent/retention, owner/store, attribution, event-vs-user unit, timezone, bot filtering and quality prerequisites. No fabricated funnel values or provider call. |
| 021 | Scoped governed AR/EN dictionary, consistent partial/restricted/stale/unknown copy, inherited direction, Intl numerals, explicit UTC dates and bidi isolation. Preserve source evidence codes without pretending source text is translated. |
| 022 | Independent per-source progress/state/capture time, retained stale data on refresh, source-only retry buttons, live-region completion. Read completion does not mean all sources succeeded. |
| 023 | Semantic output/status/alert, accessible scope and value names, focus-visible controls and responsive grid. Static AR/EN rendering assertions exist; browser/axe/keyboard/mobile proof is deferred. |
| 024 | Health/activity TTL 30 seconds, finance/imports 60 seconds, catalogs/identities 5 minutes. Expired/future evidence is stale. Visibility/focus refresh only due/failed sources; hidden tabs abort work and do not poll. A 10-second visible-tab UI clock expires badges without issuing network polling. Stale health displays unknown current status/gate. |
| 025 | Advertised review/ready/verification/link predicates use registered section-24 URL enums. Queue rows have their own loaded/partial scope, explicitly stated on links. General owner links are explicitly unfiltered handoffs. No invented owner status parameters. |
| 026 | Every metric includes endpoint, request predicate, unit, capture/receipt times and overlap/snapshot scope. Major/profile rows, all-state catalog counts, CMS roots, imported-only courses and career jobs are distinct. Finance transfer workflow includes SETTLED per its current owner definition; it is not relabeled as only unsettled transfers. |
| 027 | Dedicated 28 lightweight fixture tests: role isolation, counter parity, invalid/zero/partial data, failure/timeout/race/bounded concurrency, freshness, health consumer, safe activity and static AR/EN/accessible rendering. Initial run 26 passed/2 failed because test runner used root classic JSX rather than Admin automatic JSX. Corrected runner config, no rerun. A paths-scoped Node-22 PR workflow is prepared; no PR/CI rerun initiated here. |
| 028 | Source descriptors, contracts/selectors, loader, copy and cards extracted from page. Owners retain all persistence and mutation authority. |
| DSH-FG-029 | New query-only `/admin/audit/dashboard-activity`, behind existing Audit guard and explicit server platform/audit/owner checks. At most three concurrent target-type queries, ten candidates per supported type, per-target policy recheck, stable timestamp/ID merge, newest ten DTOs. Actor IDs/names, target IDs, contacts, paths, metadata and amounts are omitted; identity/system/unknown is a generic actor-kind alias, not claimed role/name. Unsupported target classes are excluded. Partial/denied/unavailable are distinct from empty allowed scope. |

## Owner metric definitions and reconciliation

Catalog totals request `page=1&pageSize=1`; the number is the owner's exact `total` for the supplied filter, not the one returned row. Published, review, ready and test-needs-review status predicates are separate. Majors explicitly use `catalog=false` and report major/profile-row semantics. Queue handoffs use identical lifecycle/reason predicates but have a separate loaded-row window; their retained count need not equal a dashboard global filter total.

Human identities use `data.total` under type Human. Scholarship quality uses only explicit summary fields. Course imported metrics use only explicit overview fields, not all-course totals. Import status fields are independent, without summing unknown or overlapping statuses. Financial counts are permissioned owner workflow signals, not a monetary report or unique content task count. Financial transfer count includes REQUESTED/VALIDATED/RATE_LOCKED/FEES_CALCULATED/PENDING_APPROVAL/APPROVED/PROCESSING/SETTLED as returned by the existing owner.

Activity coverage is the allowlist of ROLE, ROLE_ASSIGNMENT, POLICY, IDENTITY, SCHOLARSHIP, UNIVERSITY, MAJOR, COURSE, INTERNATIONAL_TEST, CmsContent and FINANCE. It is a bounded newest-events view of permitted recognized classes, not complete global audit history; other event classes remain unmeasured. Owner-query or row-policy omissions are visibly partial. No request can inject its own permission/target filter or widen this coverage.

## Validation and limits

One source invocation: `node scripts/verify-dashboard-source-closure.mjs`: **26 passed, 2 failed / 28**, 2.25 seconds. Both failures were the new static-render fixtures: root tsconfig used classic JSX and `React` was undefined in automatic-JSX Admin components. Runner now sets `TSX_TSCONFIG_PATH=apps/admin/tsconfig.json`. No test rerun, renamed section-25 test, or full-repository suite. Evidence: `docs/reviews/evidence/section-26-initial-20261014/source-tests.txt`.

One API/Admin TypeScript invocation returned **exit 2**, reporting only `CmsAdminPage.tsx:1510 TS6133` for a redundant reviewParams hook introduced by section 24. Removed that extra hook from Status while preserving the actual CMS list handoff. Pushed the correction independently to main as `4af2c2cf` and fast-forwarded section 26 after stashing/restoring its local work. Compiler not rerun. Later generic actor-alias, finance staleness and DI consumer metadata changes are also un-rechecked; do not assert final compiler success.

The authEvaluatorService direct AuditRouter consumer is registered additively in the existing DI reachability manifest. The separate recurring-CI repair branch is not overwritten or broadly merged. Its previous CareerAdminPage fixes remain in main ancestry. Full architecture/global CI certification remains outside this targeted run.

React review used `vercel:react-best-practices`: bounded independent reads, permission scope, cleaned-up events/controllers, functional state updates, incremental rendering, semantic/accessibility state and inert owner filters were reviewed. Runtime browser/SSR correction verification remains unexecuted under the one-run instruction.

Node v24.19.0 locally, not supported Node-22 runtime acceptance. No DB connection/migration/mutation, provider request, server/browser/E2E, worker activation, deployment or production approval. All operational acceptance remains after section 28. Historical 24/25 validation reports remain unchanged, including their unrerun failures; pushing their source to main did not certify production.

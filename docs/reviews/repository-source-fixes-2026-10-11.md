# Repository source and certificate bundle repairs — 11 October 2026

**Status:** SOURCE_FIXES_VERIFIED — RUNTIME_DEFERRED

Branch: `fix/repository-source-gates`. Base: `ed8d01d7e0c88dfd2b9eaebc833e6a6e084f959a`.
Application/source fixes: `638d287db6d74a8ff8d5f3462be45153d558b530`.
Verified source including documentation index: `763596dc3331af65d4d36e92876c0c4093a8db75`.

The review found failing repository-wide CI and Node contracts after section 16.
This repair addresses the six reported causes and the additional source registry,
baseline, documentation index and stale verifier blockers revealed by the complete
closure run. No production deployment or database mutation was performed.

## Resulting behavior

- Certificate rendering resolves fonts/logo from the installed infrastructure
  package in both workspace execution and the CommonJS API bundle. PDF/font
  dependencies remain external so their own data files retain package-relative
  paths. API release archives now include the certificate assets and package
  manifest. A production-format bundle regression renders actual bilingual and
  approved-design PDFs with embedded fonts, rather than only testing TS source.
- CMS migrations have owner/scope/ADR-028 markers and explicit backup-based
  recovery classifications. The published site snapshot model is declared in
  both persistence ownership and database baseline manifests. Historical immutable
  migration exceptions were preserved; no migration was applied.
- DI evidence is regenerated from all 364 reachable registrations, including
  student reminders and catch-up continuation. AI Studio environment documentation
  is regenerated from tracked definitions without reading secret values.
- Arabic semantic validation parses decoded TS literals and ignores well-formed
  interpolation identifiers, while still rejecting English prose/malformed
  placeholders and preserving strict representative Arabic checks.
- Student persona tests use authenticated, versioned owner events and current
  transaction fixtures. They also exposed a real late-assignment lifecycle bug:
  suspended/archived owner snapshots were emitted as AUTHORIZATION lifecycle
  events and rejected by the domain contract. Derived lifecycle events now use
  IDENTITY provenance, the actual identity reference/status and a causation ID.
  Source validation and maker/owner boundaries remain enforced.
- The local CMS nginx contract is registered as a SOURCE gate. CI provisions its
  local nginx fixture; seven localhost assertions use a mock API and no database.
  W11/W14 predicates now recognize canonical uncached reads, the complete
  certificate lifecycle and formatted signatures/calls. Negative W11 regressions
  still reject missing owner admission or missing archival handlers.
- The documentation index declares `reviews/`, allowing the existing strict W7
  navigation gate to pass without weakening it.

## Executed verification

Supported Node 22.23.3. [Structured validation](repository-source-fixes-validation.json)
and [stored command excerpts](evidence/repository-source-fixes) record outcomes.

| Check | Result |
| --- | --- |
| Full monorepo TypeScript | PASS |
| All workspace builds | PASS |
| General Vitest | 3,737 passed, 0 failed, 45 skipped; 528 test-result files |
| Node unit/source contracts | 315 passed, 0 failed (previously 11 failing) |
| Authoritative closure manifest | 27 SOURCE gates passed, 2 RUNTIME gates explicitly skipped; 54 registered verifiers |
| Translation source/Arabic gate | PASS, zero Arabic findings |
| Persistence/DI/recovery/baseline/early CI contracts | PASS |
| Source quality | PASS, zero package/file cycles and accessibility findings |
| ESLint | Zero errors; 3,705 pre-existing warnings remain |
| Prisma schema validation/client generation | PASS, no database connection |
| API-format certificate bundle | Actual PDFs render successfully with fonts and official logo |
| Immutable release artifacts | Built and verified at the application/source commit; archive contains four fonts, logo and package manifest |
| AI Studio local HTTP isolation | PASS, no backend/database/worker imports |
| Vercel TypeScript context | PASS, zero diagnostics |
| Branch/commit conventions and diff whitespace | PASS |

Release artifacts were verified locally and retained outside the tracked fixture
artifacts. They were not promoted or deployed. Existing admin font-path/large-bundle
build warnings remain recorded; the certificate CommonJS import.meta warnings are
removed by the repaired loading/package contract.

This is local source verification. GitHub Actions results for the repair PR must
be read independently. Real database concurrency/migration recovery, live EAP/CDN,
workers and browser E2E remain deferred under the post-28 policy. Main was not
modified by this repair branch.

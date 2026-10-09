# Section 04 — Settings verification and implementation

Status: IN PROGRESS / NOT CLOSED. Reference: original `MANARATAK_ADMIN_REVIEW_CODEX.md`, section 04, fully read including 04.FG. Original attachment preserved; no parallel replacement plan. Work branch: `codex/section-01-iam-rbac`; initial source `2fc7feafc1b5393e59ad4b07a2db041d169db9dc`. Fetched latest main on 2026-10-09: `bac768e7fcd76e5702697760669449b39b0e2cca`, equal to the historical reference at this check; this equality was verified, not assumed. The original uses eight named patches in 04.21 and two FGA IDs, not invented numbered P0/P1 task IDs.

## Batch 1 — 04.21 Patch A/B/C/E, 04.8/10/11/12/13 (partial patch coverage)

Confirmed defects before changes:

- `ScopeIdentifier` accepted GLOBAL plus a scope ID; API rejected it, Domain did not. Application/internal writers could therefore create unreachable overrides.
- The assignment repository rehydrated its canonical GLOBAL uniqueness sentinel as an actual scope ID. Besides being incorrect Domain meaning, this would break reads once the invariant was tightened. Normalize exactly the existing storage sentinel; malformed global rows fail closed, no guessed repair or backfill.
- `SettingDefinition` allowed feature flags without a Boolean default and invalid direct defaults; `NumberValue` accepted Infinity. A known flag could resolve to null. Validate flags/defaults at Domain and HTTP boundary, with finite-number validation at Domain as well as Application.
- Resolver returned untyped null/mask with no winning scope/version. Masks could be mistaken for usable consumer values. Added a read-only typed consumer port and effective diagnostic result, preserving the existing value-only envelope for compatibility while returning null, never a mask, for non-resolved secret requirements.

Implementation:

- `IResolvedSettingsReader` exposes `readSetting(key, context)` without repository access or secret material. Existing `ConfigurationResolutionService` implements it; `ResolveConfigurationUseCase` depends on the interface. Existing DI still wires the same Settings repositories and service. No new value authority or cache.
- Result statuses: RESOLVED, NOT_DEFINED, NO_VALUE, SECRET_UNAVAILABLE, DEPRECATED. Winning source, scope ID, definition/type, version, default marker and an ordered diagnostic chain are explicit. Preserves IDENTITY > existing TENANT > DOMAIN > GLOBAL > DEFAULT and actual false values. Applicable overrides are type-validated; database failures do not silently become successful defaults.
- GET `/settings/inspect/:key` is read-only, remains under existing `admin:settings:manage` control-plane protection, validates bounded key/context and forbids extra fields such as allowSecrets. Diagnostic/legacy reads are `Cache-Control: no-store`; infrastructure errors return a generic 503 without SQL/private connection details.
- Admin inspector displays effective value, selected source/version and chain; changing context invalidates earlier output and stale async results are ignored. UI truncates long values. Feature-flag creation starts with explicit false and offers no empty default. Secret metadata is labeled as a requirement with unverified binding, not a working external reference.
- Global storage remains unchanged: scope ID column sentinel `GLOBAL`, while the Domain scope ID is undefined. No schema change/migration or real DB/provider/config write.

The inspector reads applicable assignments separately and is diagnostic, not an atomic configuration snapshot or cross-key preflight. It does not claim runtime consumer wiring, provider binding or multi-instance propagation. Strict reconstruction of legacy invalid flag/default/global rows fails closed; any repair requires separately reviewed policy, no automatic default fabrication.

## Current original patch disposition and next dependencies

| Original patch/ID | Classification | Current result / dependency |
| --- | --- | --- |
| 04.21 Patch A | PARTIALLY_IMPLEMENTED | Actual DI authority is Settings; new guard prevents wiring the orphan Foundation as a second authority. No orphan deletion or invented ARB approval. Formal reconciliation documentation is below. |
| 04.21 Patch B | PARTIALLY_IMPLEMENTED | Typed reader and effective metadata implemented. No owner runtime consumer currently invokes the Settings reader; approved dynamic key, owner policy and default/error behavior required before wiring one. No automatic conversion of env config. |
| 04.21 Patch C | PARTIALLY_IMPLEMENTED | GLOBAL invariant, finite defaults and deterministic flags implemented/tested. Definition deprecation, governed metadata updates, non-type constraints and sensitive change reasons remain open; mutation concurrency must be preserved. |
| 04.21 Patch D | CONFIRMED_FUNCTIONAL_GAP | Clear Override absent; requires persisted lifecycle/history model, resolver compatibility and concurrency tests before UI. Canonical DOMAIN/IDENTITY selectors and authoritative TENANT meaning remain unresolved; existing historical resolution retained. |
| 04.21 Patch E | PARTIALLY_IMPLEMENTED | Truthful secret requirement labeling and effective flag inspector implemented. Actual binding/capability proof and governed emergency disable remain open; no progressive rollout platform. |
| 04.21 Patch F | CONFIRMED_FUNCTIONAL_GAP | Current list APIs fetch all definitions/assignments/history; assignment findBy filters in memory and per-key definition reads remain. Need bounded server projections and lazy history before switching UI contracts. |
| 04.21 Patch G | PARTIALLY_IMPLEMENTED | Existing atomic coordinator persists audit/generic mutation event, repositories independently persist owner events with local random correlation. This dual-event contract remains to reconcile; existing atomic audit regression preserved. |
| 04.21 Patch H | CONFIRMED_FUNCTIONAL_GAP | currentVersionId has no ownership FK; repository protects missing pointer/history. Schema-only ownership constraint design and approved isolated DB acceptance still needed. No DB mutation performed. |
| FGA-04-001 | PROPOSED_ENHANCEMENT | Multi-key preview/atomic change set not implemented. Depends on bounded reads, revision contracts and audited owner mutation grouping; no cosmetic bulk action claiming atomicity. |
| FGA-04-002 | PROPOSED_ENHANCEMENT | Cross-key dependency policy not implemented. Needs approved concrete dynamic keys/owner invariants, not invented SMTP/finance/bootstrap policies. |

## Authority reconciliation findings

`settings/**` is the only composed definition/value authority: `container.ts` wires its Prisma repositories, resolution service, ManageSettingsUseCase and ResolveConfigurationUseCase; API/Admin use those services. `configuration/**` and its ManageConfigurationsUseCase remain unwired source. Treat this as legacy/unwired intent pending an explicit architectural disposition; do not wire a second Admin/API or delete it just for organization. The source guard makes the current boundary reviewable; it does not constitute a new ADR.

Bootstrap database URLs, provider credentials, signing keys, Redis connections and runtime security still come from ConfigurationRegistry/environment, not dynamic Settings. The presence of that infrastructure authority is intentional separation, not proof all env configuration must move to the DB. No production behavior was newly gated by an invented setting in this batch.

The original 04.10 attributes a TENANT deferred/rename decision to ADR-027. The actual checked-in ADR-027 excludes Organizations/Employers and does not mention TENANT/Settings; that attribution is not supported by this file. Therefore this batch preserves existing historical precedence and does not claim an authoritative Tenant Platform or create one. Registry/selectors and new-write governance must be decided from a real scope contract.

## Verification and evidence

Local: TypeScript PASS; 67 targeted tests across 11 files PASS (14.92s), including Domain boundaries, full precedence/default/secret statuses, global sentinel persistence mapping, Application non-persistence on rejection, safe inspector API, existing rollback/version ownership/atomic audit and DI composition. Two authority/permission Node guards PASS; selected lint 0 errors/11 warnings; source quality PASS; unchanged audit inventory PASS (319 handlers/318 endpoints).

Existing settings tests had stale transaction/advisory mocks and assertions omitting the already-required actor context. Corrected mocks to model the current transaction surface and assertions to verify trusted actor context, without weakening repository collision/immutable-pointer checks. Initial failed output retained. No real-DB assertion is made from these mocks.

Chromium UI with intercepted API PASS: effective false/source output, context changes invalidate output, secret has no value/mask, explicit false flag default and absence of empty option, no page exceptions. Test-only CSP bypass and disabled dev HMR; no actual browser/API/DB/provider E2E claim.

The pre-existing combined academic/settings verifier was updated for the new typed contract and actual actor API, preserving real checks. It reports 78/79: all Settings checks PASS, repository-wide architecture regression FAIL. The global guard reports four findings: the previously recorded name-based relation violations in ScholarshipCatalogDetailPage:346, ScholarshipListPage:474 and public CoursesSearchPage:110, plus the earlier section-03 disposable installer missing operational-tool classification (`scripts/ci/install-eap-reference-guards.mjs`). These are retained as explicit cross-section obligations, not fixed or waived in this Settings batch. The installer itself already enforces exact disposable CI credentials/flags; classification absence is not target authorization. This is not a global source-closure claim.

Matching CI pending. Files/logs under `docs/remediation/evidence/section-04`. Original task/patch statuses are not CLOSED merely because the first batch passes. DB/runtime readiness, real owner consumers, governance/lifecycle, inheritance, scalability and release acceptance remain open.

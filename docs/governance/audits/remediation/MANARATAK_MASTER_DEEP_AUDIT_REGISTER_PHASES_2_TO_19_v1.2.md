# MANARATAK 2.0 — Master Deep Audit & Remediation Register
## Phases 2 → 19 | Source Audit First, Remediation Later

**Document:** MANARATAK Master Deep Audit Register  
**Version:** v1.2 — W0 Source Remediation Applied; Full Regression Gate Pending  
**Audit start:** 2026-08-24  
**Repository:** `wegdangamil2022-oss/MANARATAK_FINAL`  
**Branch:** `main`  
**Current audited baseline:** `e57aad8c52a3ee6d686671870e0bf0392ba7417f`  
**Baseline commit message:** `Complete Phase 19 enterprise finance platform`  
**Working source copy:** uploaded `MANARATAK_FINAL-main.zip`, previously verified against the current repository tree  
**Database during audit:** `NOT CONNECTED / NOT EXECUTED`  
**Audit mode:** deep static/source + architecture/governance consistency inspection  
**Code modifications during audit:** **NONE**

---

# 0. Governing audit rules

## 0.1 Authority hierarchy

This audit starts at **Phase 2**. Phase 1 is not treated as an implementation phase to repair; it is the governing **Architecture Constitution**.

Precedence used by this audit:

```text
1. Phase 1 — Architecture Constitution
2. Roadmap v6.0 — official phase numbering / sequencing / dependencies
3. Approved ADRs
4. Active Domain Architecture Specifications / contracts
5. Governance/navigation indexes
6. Historical/archive reports
```

The repository itself states the SSOT principle and the same authority hierarchy in:

- `docs/governance/blueprint/MANARATAK-2.0-Master-Blueprint.md`
- `docs/architecture/Enterprise-Architecture-Governance-Index.md`

## 0.2 Audit before repair

No remediation is applied while Phases 2–19 are being audited.

Audit sequence:

```text
Phase 2–4  → deep audit → append findings here
Phase 5–7  → deep audit → append findings here
Phase 8–10 → deep audit → append findings here
Phase 11–13 → deep audit → append findings here
Phase 14–16 → deep audit → append findings here
Phase 17–19 → deep audit → append findings here
```

Only after the full Phase 2–19 audit is complete will this register be globally reordered by:

```text
Severity
+ Root cause
+ Dependency order
+ Blast radius
+ Runtime safety
```

Phase number alone will **not** determine repair order.

## 0.3 Google Studio / runtime boundary

The latest living runtime reference located in the project File Library is:

`MANARATAK_Google_Studio_Master_Runtime_Runbook_Phase2_to_13_and_Beyond_v2.2.md`

Its operational rule is preserved here:

```text
Latest GitHub main
→ source build/tests
→ environment/security validation
→ Development/Remediation DB identity
→ backup + schema snapshot + recovery proof
→ migration status
→ runtime infrastructure health
→ dependency-ordered runtime proof
```

Therefore this source audit must **not** misclassify missing live PostgreSQL evidence as a source defect.

Anything that cannot be proven without the real runtime/DB is tagged:

`PENDING_GOOGLE_STUDIO`

Before any DB mutation, Google Studio must establish at minimum:

- Development/Remediation DB identity, never Production by accident.
- full backup and independent schema snapshot;
- migration status;
- baseline counters;
- restore/recovery proof;
- `IDs regenerated = 0`;
- `relations lost = 0`;
- no silent remapping/overwrite;
- no bulk import before the approved pilot/gates.

---

# 1. Finding classification

| Severity | Meaning |
|---|---|
| **CRITICAL / P0** | Source blocker that prevents safe production/runtime use or can create severe integrity/security failure. |
| **HIGH / P1** | Significant architecture, security, data-integrity, contract, or operational defect that should be repaired before runtime closure. |
| **MEDIUM / P2** | Confirmed inconsistency or missing enforcement that materially weakens quality/governance but is not an immediate hard blocker. |
| **LOW / P3** | Confirmed reproducibility/cleanup issue with limited immediate impact. |
| **PENDING_GOOGLE_STUDIO** | Not a source defect by itself; requires real DB/runtime evidence. |

Finding states during the audit:

- `CONFIRMED_OPEN`
- `RUNTIME_PROOF_REQUIRED`
- `HISTORICAL_RESOLVED`
- `RECHECK_AFTER_UPSTREAM_FIX`
- `CLOSED_AFTER_REMEDIATION` — used only after execution begins later.

---

# 2. Audit progress

| Batch | Status | Findings |
|---|---|---:|
| **Phase 2–4** | **DEEP AUDIT COMPLETE — findings recorded; no fixes applied** | **18 confirmed open** |
| **Phase 5–7** | **DEEP AUDIT COMPLETE — findings recorded; no fixes applied** | **17 confirmed open** |
| **Phase 8–10** | **DEEP AUDIT COMPLETE — findings recorded; no fixes applied** | **18 confirmed open** |
| **Phase 11–13** | **DEEP AUDIT COMPLETE — findings recorded; no fixes applied** | **25 confirmed open** |
| **Phase 14–16** | **DEEP AUDIT COMPLETE — findings recorded; no fixes applied** | **31 confirmed open** |
| **Phase 17–19** | **DEEP AUDIT COMPLETE — findings recorded; no fixes applied** | **44 confirmed open** |
| Global reprioritization | **COMPLETE — dependency-aware W0→W15 order frozen** | **153 ordered** |
| Remediation execution | **IN PROGRESS — W0 source remediation complete; dependency-backed regression gate pending** | **W0 source complete / W1 not started** |

### Current confirmed-open count after Phase 2–19 discovery

| Severity | Count |
|---|---:|
| CRITICAL | **12** |
| HIGH | **100** |
| MEDIUM | **40** |
| LOW | **1** |
| **Total** | **153** |

> Audit discovery for Phase 2–19 is complete. The authoritative dependency-aware repair order is now frozen in Sections 38–45. The discovery sections above are retained as evidence history; execution must follow W0→W15, not discovery order.

---

# 3. Phase 2–4 deep audit — confirmed findings

## CRITICAL / P0

### P4-SEC-001 — normal production/staging API bootstrap is deterministically blocked by the only wired rate limiter

**Owner:** Phase 4 — Security / API Composition  
**Type:** SECURITY / RUNTIME-SOURCE / COMPOSITION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL**

**Problem**

The default API composition creates `DefaultRateLimiter`, but that implementation explicitly declares itself non-production-ready. `SecurityValidator` correctly rejects it in production/staging. The normal `server.ts` bootstrap calls `createApiApp()` without injecting any alternative production-ready limiter.

This means the normal server entrypoint cannot satisfy its own production/staging security gate.

**Source evidence**

- `packages/infrastructure/src/security/DefaultRateLimiter.ts:8-11`
  - `isProductionReady = false`
  - `kind = 'process-local'`
  - `capabilityStatus = 'DEVELOPMENT_ONLY'`
- `apps/api/src/app.ts:137-141`
  - falls back to `new DefaultRateLimiter()` and then calls `SecurityValidator.assertProductionSecurity(...)`.
- `apps/api/src/presentation/security/SecurityValidator.ts:44-53`
  - production/staging rejects a missing/non-real limiter.
- `apps/api/src/server.ts:4-15`
  - normal bootstrap calls `createApiApp()` with no rate-limiter override.
- `apps/api/tests/presentation/security/ProductionSecurityGuardrails.spec.ts:123-125`
  - test explicitly proves production app creation fails when only the process-local default limiter is available.
- repository-wide source search found no other production `IRateLimiter` implementation marked `isProductionReady=true` outside tests.

**Impact**

- production/staging bootstrap blocker;
- deployment may fail before listening on the HTTP port;
- the project has a correct fail-closed guard but no production-capable composition path satisfying it.

**Root cause**

Security guardrail implementation was completed without completing/wiring the corresponding production rate-limit adapter.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Introduce or wire one real distributed/production-ready rate limiter behind `IRateLimiter` and make `server.ts` resolve it from composition/configuration. Keep `DefaultRateLimiter` strictly development-only. Add production composition tests.

**Runtime dependency**

After source repair, real adapter behavior and shared-state semantics still require `PENDING_GOOGLE_STUDIO` runtime proof.

---

## HIGH / P1

### GOV-ROADMAP-001 — the authoritative Roadmap v6.0 is internally stale and contradicts the current repository state

**Owner:** Cross-cutting governance  
**Type:** GOVERNANCE / SSOT / STATUS TRUTH  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The file named and declared as Roadmap v6.0 is the authoritative source for phase numbering and status, but its own metadata/status sections are inconsistent and stale.

**Evidence**

`docs/governance/roadmap/MANARATAK-2.0-Roadmap-v6.0.md`:

- line 1: filename/header says `v6.0`;
- line 6: metadata says `Version: 5.0`;
- line 15: revision history says v6.0 supersedes v5.0;
- lines 29–32: implementation status says only early phases are completed and next wave is Phase 10–12;
- lines 82–85 / 93–95: later phases are shown In Progress/Planned/Future;
- line 121+: Roadmap v6.0 declares itself the **ONLY authoritative source** for phase numbering/status references;
- current repository `main` is already at commit `e57aad8...` (`Complete Phase 19 enterprise finance platform`).

**Impact**

Any new contributor/assistant/automation that obeys the SSOT may make decisions from obsolete project state even though source implementation has moved much further.

**Preliminary remediation direction**

After the full audit, update only current status/version metadata and supersession notes without changing the approved 24-phase architecture unless a formal ARB supersession is intended.

---

### P2-API-001 — Phase 2 binding API contracts mandate `/v2`, while the approved interface standard and live source implement `/api/v1`

**Owner:** Phase 2 — Solution Architecture / API  
**Type:** API CONTRACT / GOVERNANCE / COMPATIBILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

Phase 2 API specifications repeatedly define `/v2` as the active mandatory path, but the active enterprise API standard and implementation use `/api/v1`.

**Evidence**

- `docs/phases/phase-02-solution-architecture/phase-02-12-api-architecture-design.md:136-139,274-275,351,472,506+`
  - examples and mandatory versioning use `/v2/...`.
- `docs/phases/phase-02-solution-architecture/phase-02-13-rest-api-contracts.md`
  - formal REST contract repeatedly uses `/v2/...`.
- `docs/architecture/standards/std-api-001-interface-standards.md:11`
  - approved interface standard uses URI-based `/api/v1/`.
- `apps/api/src/app.ts:279-400`
  - constructs `v1Router`, registers version `v1`, and mounts under `/api`.

**Impact**

- contract drift;
- generated clients/integration docs may target nonexistent paths;
- future implementers may reintroduce a competing API version tree.

**Preliminary remediation direction**

Reconcile Phase 2 specifications to the authoritative API registry/interface standard and mark historical `/v2` examples superseded if `/api/v1` remains canonical.

---

### P2-ARCH-001 — Phase 2 simultaneously mandates current microservice mechanics and approves Modular Monolith execution

**Owner:** Phase 2 — Solution Architecture  
**Type:** ARCHITECTURE / DEPLOYMENT MODEL / GOVERNANCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

Several active Phase 2 documents use imperative language for physically isolated microservices, mTLS on inter-service calls, and downstream microservice routing, while the Phase 2 final approval and current architecture use a Modular Monolith / modular monorepo with future extraction.

**Evidence**

- `phase-02-03-domain-model-design.md:220` — maps aggregates to physically isolated microservice boundaries.
- `phase-02-12-api-architecture-design.md:31,108,429,454` — internal microservices, mTLS, downstream microservice tracing and isolation.
- `phase-02-15-identity-security-foundation.md:253` — mTLS enforced for all inter-service/internal microservice communication.
- `phase-02-27-solution-review.md:63` — supporting capabilities described as decoupled microservices.
- `phase-02-28-final-solution-approval.md:77` — actual approved execution is Modular Monolith / modular monorepo with future microservice extraction.
- Phase 1 Constitution and current Roadmap also center the Modular Monolith execution model.

**Impact**

The documentation can cause premature distributed-system implementation, unnecessary mTLS/gateway/service boundaries, or contradictory review criteria against a single-process modular runtime.

**Preliminary remediation direction**

Preserve future extraction requirements, but distinguish clearly between **logical bounded contexts/future service boundaries** and **current physical deployment topology**.

---

### P2-DATA-001 — Phase 2 sealed ARB report preserves an obsolete “no physical FK / string-only reference” doctrine that conflicts with the current canonical relational model

**Owner:** Phase 2 — ARB / Data Architecture  
**Type:** DATA ARCHITECTURE / CANONICAL INTEGRITY / GOVERNANCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The sealed Phase 2 ARB report says Reference Data should remain physically isolated with no cross-database FKs and only logical flat string keys. The current platform is a canonical relational model in one Prisma persistence architecture with first-class reference FKs across domains.

**Evidence**

- `docs/phases/phase-02-solution-architecture/phase-2-arb-compliance-report.md:50-59`
  - says `Phase 4 Lookups`, forbids physical FK constraints, and endorses string-based reference keys.
- The same report at `85-94` separately mandates explicit relational FKs for another context, making the data doctrine itself difficult to interpret consistently.
- current `packages/infrastructure/prisma/schema.prisma` contains canonical reference FKs across active models (e.g. university geography and other reference-linked domains).

**Impact**

A future remediation could wrongly remove canonical FKs or reintroduce dual/string-only SSoT because it follows a still-sealed Phase 2 report.

**Preliminary remediation direction**

Mark the cross-database/string-only doctrine as superseded by the current canonical relational/ADR model while preserving provider-neutral reference ownership rules.

---

### P3-QUALITY-001 — mandatory acyclic-import and JSX accessibility enforcement described by Phase 3 is absent from the active lint configuration

**Owner:** Phase 3 — Development Foundation  
**Type:** QUALITY / ARCHITECTURE ENFORCEMENT / ACCESSIBILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

Phase 3 says automated static tooling enforces workspace boundaries, blocks cycles, and performs JSX accessibility auditing. The active ESLint config does not contain cycle or accessibility plugins/rules and only has a narrow `no-restricted-imports` pattern.

**Evidence**

- `phase-03-01-enterprise-monorepo-setup.md:40-41,168-172`
  - cycles are strictly prohibited and boundaries are said to be automatically enforced.
- `phase-03-02-development-environment.md:168-174`
  - explicitly requires import restrictions, acyclic checks, and accessibility auditing.
- `eslint.config.js:1-54`
  - plugins are only `@typescript-eslint` and `react-hooks`;
  - no `eslint-plugin-import` / cycle rule;
  - no `eslint-plugin-jsx-a11y` or equivalent accessibility gate;
  - architecture restriction currently covers only a limited import pattern.

**Impact**

The repository can claim compliance while circular dependencies or accessibility regressions are not automatically blocked by the declared lint gate.

**Preliminary remediation direction**

Either implement the mandated checks in a reliable toolchain or explicitly revise the Phase 3 contract to point to the actual architecture scanner(s) if equivalent enforcement exists elsewhere. The final gate must be executable in CI.

---

### P3-CONFIG-001 — direct environment access exists inside Application and Infrastructure despite an explicit frozen configuration-boundary certification

**Owner:** Phase 3/4 — Configuration Foundation  
**Type:** CLEAN ARCHITECTURE / CONFIGURATION / TESTABILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

Phase 4.2 explicitly certifies that Domain, Application, Infrastructure, and Shared do **not** use `process.env`/`import.meta.env`, yet current source contains direct accesses in Application and many Infrastructure adapters.

**Evidence**

- `docs/phases/phase-04-architecture-governance/baselines/phase-04-02-refined-report.md:9-15`
  - claims all internal environment access goes strictly through apps/configuration boundary.
- current Application direct access:
  - `packages/application/src/certificates/use-cases/CertificateUseCases.ts:155,360-361`.
- current Infrastructure direct access includes:
  - `finance-platform/ProviderNeutralFinanceGateways.ts`
  - `import-foundation/LocalImportRawSnapshotStore.ts`
  - `asset-platform/LocalAssetStorageGateway.ts`
  - `logging/PinoLoggerProvider.ts`
  - `security/SecurityService.ts`
  - `majors/PrismaMajorRepository.ts`
  - `majors/Phase10CatalogRepository.ts`
  - `ai-platform/EnvironmentAIAsyncPayloadProtector.ts`
  - `ai-platform/ProviderAdapters.ts`
  - `universities/PrismaUniversityRepository.ts`
  - fallback inside `packages/infrastructure/src/index.ts`.

**Impact**

- configuration sources are no longer centralized;
- tests and runtime composition can observe environment implicitly;
- source behavior can differ from injected configuration;
- the certified boundary is no longer true.

**Preliminary remediation direction**

Consolidate runtime configuration at composition boundaries and inject typed configuration/secret readers into inner layers. Any deliberate infrastructure-level environment adapter should be explicit and separately governed rather than scattered direct reads.

---

### P3-AUTH-001 — concrete JWT cryptography is implemented in the Application layer despite the frozen authentication boundary requiring it in Infrastructure

**Owner:** Phase 3/4 — Authentication Foundation  
**Type:** CLEAN ARCHITECTURE / AUTH / CRYPTO IMPLEMENTATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

`packages/application/src/auth/JwtTokenProvider.ts` is a concrete HS256 implementation using Node `crypto`, `Buffer`, clocks and UUIDs. The frozen Phase 4.6 report explicitly says JWT implementations are isolated in Infrastructure and Application depends only on `ITokenProvider`.

**Evidence**

- `docs/phases/.../phase-04-06-refined-report.md:9-13`
  - JWT implementation strictly Infrastructure; Application uses only `ITokenProvider`.
- `packages/application/src/auth/JwtTokenProvider.ts:1-89`
  - concrete signing/verification logic in Application.
- `apps/api/src/infrastructure/di/container.ts:189,8433`
  - normal API DI imports and instantiates this Application-layer concrete provider.

**Impact**

- frozen dependency boundary is violated;
- cryptographic details are coupled to the use-case layer;
- provider replacement/testing and security governance are harder;
- later auth changes may diverge from the infrastructure security boundary.

**Preliminary remediation direction**

Move concrete token implementation behind an Infrastructure adapter implementing the shared `ITokenProvider` contract; keep Application dependent only on the port. Re-run auth contract/security tests after migration.

---

### P4-GOV-002 — Phase 4 “certified implementation baseline” contains multiple mutually incompatible current-state claims

**Owner:** Phase 4 — Architecture Governance  
**Type:** GOVERNANCE / BASELINE TRUTH / TRACEABILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

Phase 4 contains a useful top-level reality notice, but many underlying reports and the final certification still assert implementations that are absent, deferred, replaced, or no longer match the repository.

**Confirmed examples**

1. `phase-04-14-report.md:5,11-20,32` claims `@manaratak/testing` and `packages/testing/*` exist and built successfully; current repository contains no `packages/testing` directory.
2. `phase-04-15-report.md:5,11-15,20-21` claims Git validation scripts and Husky hooks exist; they are absent now.
3. `phase-04-12-report.md:19-20,29-31` claims concrete `packages/infrastructure/src/storage/LocalStorageProvider.ts` and `StorageService.ts`; those files are absent. The infrastructure barrel instead exposes compatibility no-op classes while the newer EAP storage implementation lives elsewhere.
4. `phase-04-17-report.md:3-7` correctly says production containerization is `DEFERRED`, yet the same report at `23-25,51-57,61-64` still says multi-stage/runtime purity/production readiness are verified and approval status is `IMPLEMENTED`.
5. `phase-04-21-report.md:3` says historical production-readiness claims are superseded, while `11-31`, `53-63`, and final certification still present all foundations as fully implemented/certified.

**Impact**

Phase 4 is supposed to be the implementation/governance baseline. Contradictory certifications make it unsafe as an automated or human closure source.

**Preliminary remediation direction**

Do not re-create obsolete components simply to match history. After the full audit, reconcile each Phase 4 report into one of:

- `ACTIVE_IMPLEMENTED`
- `SUPERSEDED_BY_<current capability>`
- `SOURCE_IMPLEMENTED_RUNTIME_PROOF_PENDING`
- `DEFERRED`
- `REMOVED_WITH_APPROVED_REPLACEMENT`

and link each status to the actual current path/ADR.

---

## MEDIUM / P2

### P2-ROADMAP-001 — Phase 2 uses obsolete phase numbering (`Phase 4 Lookups`) against Roadmap v6.0

**Owner:** Phase 2 / Roadmap consistency  
**Type:** GOVERNANCE / PHASE NUMBERING  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Evidence**

- `phase-2-arb-compliance-report.md:50` calls Reference Data `Phase 4 Lookups`.
- current Roadmap v6.0 defines Phase 4 as Architecture Governance and Phase 7 as Global Reference Data.
- the Phase 1 Constitution says Roadmap v6.0 is SSOT for numbering.

**Impact**

Cross-phase references can send future work to the wrong ownership boundary.

**Preliminary remediation direction**

Normalize active cross-phase references to Roadmap v6.0 without renumbering historical document section identifiers that are explicitly archival.

---

### P2-GOV-001 — sealed Phase 2 ARB report still says Transactional Outbox source implementation is absent although current source contains it

**Owner:** Phase 2 — ARB  
**Type:** GOVERNANCE / STATUS TRUTH  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Evidence**

- `phase-2-arb-compliance-report.md:33,41` says no outbox table, persistence adapter, dispatcher, or verified same-transaction writes exist in source.
- current source includes:
  - `TransactionalOutboxRecord` in Prisma schema;
  - migration `20260813000000_add_transactional_outbox`;
  - `PrismaTransactionalOutboxStore`;
  - `PrismaAtomicPersistenceUnitOfWork`;
  - `AtomicAuditedOutboxMutationExecutor`;
  - `TransactionalOutboxDispatcher`;
  - active API DI registrations.

**Correct current interpretation**

`SOURCE_IMPLEMENTED / LIVE_DB_TRANSACTION_AND_RECOVERY_PROOF_PENDING_GOOGLE_STUDIO`.

**Preliminary remediation direction**

Update source-status wording, but do **not** claim runtime closure until Google Studio proves migration/application/transaction/dispatcher behavior against the real DB.

---

### P3-BUILD-001 — Phase 3 mandates affected-only cached orchestration, but root build/lint/test/typecheck run workspace-wide and do not use the configured Turbo orchestrator

**Owner:** Phase 3 — Monorepo / CI foundation  
**Type:** BUILD / CI / PERFORMANCE / GOVERNANCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Evidence**

- `phase-03-01-enterprise-monorepo-setup.md:185-189`
  - mandates topological orchestration, affected-only builds/tests/lint, and heavy caching.
- current root `package.json`:
  - `build = npm run build --workspaces --if-present`
  - `lint = eslint .`
  - `test = vitest run ...`
  - `typecheck = tsc -b`
- none of those root gates invoke Turbo/affected selection.
- `turbo.json` exists, but is not the active execution path for the primary root gates.

**Impact**

The repository does not currently satisfy the declared affected-only/cached CI strategy; large-workspace validation cost grows with every phase.

**Preliminary remediation direction**

Choose one truthful strategy: wire a current orchestrator into root/CI gates with correct dependency graph and cache semantics, or revise the Phase 3 requirement if workspace-wide deterministic gates are intentionally preferred.

---

### P3-INFRA-001 — infrastructure barrel publicly exports 53 empty/constructor-only compatibility classes under implementation-like names

**Owner:** Phase 3/4 — Infrastructure Foundation  
**Type:** CODE QUALITY / API SURFACE / LEGACY COMPATIBILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

A static scan of `packages/infrastructure/src/index.ts` found **53** exported classes with no implementation or only an empty constructor.

Examples include:

- `PrismaServiceCatalogRepository`
- `PrismaCareerPathRepository`
- `PrismaAlumniRepository`
- `PrismaConfigurationRepository`
- `JwtTokenService`
- `BcryptPasswordHashingService`
- `MemoryFileRepository`
- `S3FileRepository`
- `PostgresFileRepository`
- `LocalStorageProvider`
- `StorageService`
- `DefaultMonitoringProvider`
- numerous `InMemory*` gateways/repositories.

**Impact**

Even if many are legacy compatibility exports rather than active DI, they enlarge the public API with names that imply functional adapters and can be accidentally wired later.

**Preliminary remediation direction**

During remediation, inventory each export as `ACTIVE`, `COMPATIBILITY_ONLY`, or `DEAD`; replace compatibility shims with explicit deprecated types/adapters where needed, and remove misleading no-op implementation classes only after dependency verification.

---

### P4-TEST-001 — Phase 4 certifies a dedicated testing package that no longer exists

**Owner:** Phase 4 — Testing Foundation  
**Type:** GOVERNANCE / TEST FOUNDATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Evidence**

- `phase-04-14-report.md:5,11-20,32`
  - certifies `@manaratak/testing`, its files, and successful build.
- current repository top-level packages do not include `packages/testing`.

**Impact**

The formal baseline points contributors to a nonexistent test foundation and claims a gate that cannot be reproduced as documented.

**Preliminary remediation direction**

Determine whether the testing package was intentionally superseded by the current root/Vitest/shared-test architecture. Mark the report accordingly rather than blindly recreating it.

---

### P4-GIT-001 — Phase 4 certifies commit/branch enforcement hooks that are absent in the current repository

**Owner:** Phase 4 — Git Foundation  
**Type:** GOVERNANCE / SDLC / QUALITY GATE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Evidence**

- `phase-04-15-report.md:5,11-15,20-21`
  - claims `scripts/git/validate-commit-msg.sh`, `validate-branch-name.sh`, `.husky/pre-commit`, and `.husky/commit-msg` exist and enforce rules.
- current repository:
  - `.husky` contains only `.husky/_/husky.sh`;
  - no `scripts/git/*` validation scripts;
  - root `package.json` has no `prepare` script installing hooks.

**Impact**

Conventional commit/branch governance is documented as enforced but is not enforced by the claimed mechanism.

**Preliminary remediation direction**

Either restore a maintained hook/CI enforcement path or mark the historical hook design superseded and point governance to the actual current mechanism.

---

### P4-GOV-001 — Phase 4.21 still declares Transactional Outbox source implementation missing after the source has implemented it

**Owner:** Phase 4 — Final Foundation Baseline  
**Type:** GOVERNANCE / STATUS TRUTH  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Evidence**

- `phase-04-21-report.md:117-126`, especially line 119, says the current source baseline has not implemented outbox persistence, dispatcher or atomic integration.
- current source contains the Prisma model/migration/store/UoW/executor/dispatcher and DI wiring.

**Correct classification**

Source gap is historical; live DB application/atomicity/recovery proof remains `PENDING_GOOGLE_STUDIO`.

---

### P4-STORAGE-001 — historical File Storage report names concrete implementations that are absent/replaced, while no-op compatibility classes remain exported under those names

**Owner:** Phase 4 — File Storage / EAP transition  
**Type:** GOVERNANCE / LEGACY SURFACE / CAPABILITY TRACEABILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Evidence**

- `phase-04-12-report.md:19-20,29-31` says:
  - `packages/infrastructure/src/storage/LocalStorageProvider.ts`
  - `packages/infrastructure/src/storage/StorageService.ts`
  are implemented.
- those paths are absent now.
- `packages/infrastructure/src/index.ts:159-160` exports empty compatibility classes with those exact implementation-like names.
- newer real asset storage exists under EAP (`asset-platform/LocalAssetStorageGateway.ts`).

**Impact**

Capability ownership and current implementation path are ambiguous.

**Preliminary remediation direction**

Mark legacy File Storage implementation as superseded by EAP where appropriate and eliminate/rename misleading no-op compatibility exports after dependency checks.

---

## LOW / P3

### P3-ENV-001 — documented “blocking” Node engine enforcement is not actually strict at package-manager level

**Owner:** Phase 3 — Development Environment  
**Type:** REPRODUCIBILITY / TOOLCHAIN  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **LOW**

**Evidence**

- root `package.json` declares Node `>=20.0.0`, npm `>=10.0.0`.
- `.nvmrc` contains a range (`>=20.0.0`) rather than a pinned runtime version.
- no `.npmrc` exists with `engine-strict=true`.

**Impact**

npm normally treats incompatible engines as warnings rather than a hard local install block; local toolchains can drift across Node 20+ releases.

**Preliminary remediation direction**

Pin/support a deliberate Node version policy and enforce it in bootstrap/CI if strict deterministic local blocking remains a requirement.

---

# 4. Phase 2–4 runtime/DB evidence register — not source defects yet

The following items cannot be honestly closed in this static audit. They remain runtime evidence tasks and **must not be turned into speculative source fixes unless a source blocker is independently proven**.

| Runtime ID | Owner | Status | Evidence required in Google Studio | DB mutation required? |
|---|---|---|---|---|
| RT-FOUND-001 | Foundation / DB | `PENDING_GOOGLE_STUDIO` | Confirm actual Development/Remediation DB identity, migration status, schema snapshot, baseline counters | No for inspection; later migrations only after gate |
| RT-FOUND-002 | Recovery | `PENDING_GOOGLE_STUDIO` | Full backup + restore/recovery proof before any mutation | Backup/recovery only |
| RT-AUTH-001 | Auth | `PENDING_GOOGLE_STUDIO` | Session/Credential durability, expiry/revoke, persisted RBAC, real 401/403 on PostgreSQL | Controlled test writes after gate |
| RT-OUTBOX-001 | Event/Audit | `PENDING_GOOGLE_STUDIO` | Migration applied; business mutation + Audit + Outbox same transaction; dispatcher retry/idempotency/recovery | Yes, controlled after gate |
| RT-HEALTH-001 | Runtime | `PENDING_GOOGLE_STUDIO` | DB/Redis health/readiness under actual configured environment | No/low-risk |
| RT-SEC-001 | Security | `PENDING_GOOGLE_STUDIO` | After P4-SEC-001 source repair, prove production-capable limiter semantics and multi-instance/shared-state behavior | No DB mutation expected |
| RT-CI-001 | Runtime Closure | `PENDING_GOOGLE_STUDIO` | install/generate/typecheck/lint/build/focused tests/E2E in final execution environment | No DB mutation for source gates |
| RT-NET-001 | Operations | `PENDING_GOOGLE_STUDIO` | startup/idle/normal traffic observations and external-traffic attribution | No |

**Hard rule:** `PENDING_GOOGLE_STUDIO` does not mean `FAILED`. It means the repository alone cannot prove the runtime invariant.

---

# 5. Historical findings re-verified during this batch

These older findings were checked so they are **not** duplicated as current open defects.

### HIST-RES-001 — old placeholder web E2E finding is source-resolved

**Status:** `HISTORICAL_RESOLVED`

The older remediation register reported `apps/web/e2e/health.spec.ts` as an `expect(true)` placeholder. The current file now contains real non-destructive checks including public page/API liveness/readiness/public read and unauthorized admin behavior.

Runtime execution of the E2E suite still belongs to `RT-CI-001`, but the old source placeholder defect is no longer current.

### HIST-RES-002 — old “Transactional Outbox source missing” finding is source-resolved

**Status:** `HISTORICAL_RESOLVED / RUNTIME_PROOF_REQUIRED`

The current repository now contains the source-level Outbox model, migration, persistence, atomic UoW/executor, dispatcher, and DI composition. Therefore it must not be re-added as an open **source implementation** gap.

Only live migration/transaction/recovery evidence remains under `RT-OUTBOX-001`.

---

# 6. Phase 2–4 positive controls observed

The audit also recorded controls that should be preserved during remediation:

- Phase 1 Constitution clearly identifies itself as the constitutional authority and delegates phase numbering to Roadmap v6.0.
- Governance Index explicitly defines SSOT, conflict precedence, and non-duplication rules.
- package-level dependency direction is currently clean at the broad package boundary: no direct `@manaratak/infrastructure` imports were found from `core`, `domain`, or `application` packages.
- current API routing has a consistent active `/api/v1` composition in source.
- current Production Security Validator fails closed for non-production-ready rate limiting/CSRF rather than silently accepting a weak implementation.
- current Transactional Outbox source primitives exist and are wired into DI.
- Phase 4.17 already includes an important reality notice that application containerization is deferred; this truthfulness should be propagated to the remaining contradictory certification lines.
- Markdown relative-link scan across Phase 2, Phase 3 and Phase 4 documentation found **0 broken relative Markdown links** in the audited snapshot.

---

# 7. Batch verdict — Phase 2–4

```text
PHASE_2_TO_4_DEEP_AUDIT = COMPLETE
SOURCE_MODIFICATIONS = 0
DATABASE_CONNECTED = NO
MIGRATIONS_APPLIED = 0
GOOGLE_STUDIO_RUNTIME_EXECUTED = NO
CONFIRMED_OPEN_FINDINGS = 18
CRITICAL = 1
HIGH = 8
MEDIUM = 8
LOW = 1
RUNTIME_DEFERRED_ITEMS = 8
```

**Important:** no remediation priority has been finalized yet. The entries remain recorded primarily in phase/source order. Final repair order will be calculated only after Phases 5–19 are audited and root-cause/dependency collisions are known.

---

# 8. Phase 5–7 deep audit — confirmed findings

This batch was audited against the same repository baseline:

`e57aad8c52a3ee6d686671870e0bf0392ba7417f`

No source files, migrations, database state, or ZIP contents were modified while recording these findings.

## CRITICAL / P0

### P5-AUTH-001 — active conditional RBAC policy evaluation grants every policy unconditionally

**Owner:** Phase 5 — Authorization Foundation  
**Type:** SECURITY / AUTHORIZATION / POLICY ENFORCEMENT  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL**

**Problem**

The policy evaluator wired into the active authorization composition does not evaluate the policy rule or evaluation context. It returns an unconditional grant for every policy.

**Source evidence**

- `packages/infrastructure/src/authorization/DefaultPolicyEvaluator.ts`
  - `evaluate(_policy, _context)` immediately returns `AccessDecision.granted('Policy rule satisfied')`.
- `apps/api/src/infrastructure/di/container.ts`
  - active DI registration uses `policyEvaluator: asClass(DefaultPolicyEvaluator).singleton()`.
- `packages/domain/src/authorization/services/AuthorizationEvaluatorService.ts`
  - permission evaluation delegates attached policy checks to the wired `IPolicyEvaluator` and grants when those policy checks pass.
- Phase 5 authorization architecture describes policies as conditional rules, including contextual constraints such as time/IP conditions.

**Impact**

A role that has a permission plus a restrictive attached policy can be granted even when the policy condition should deny access. This can bypass conditional RBAC restrictions on routes using the real authorization evaluator.

**Root cause**

The production composition wires a placeholder/default evaluator whose behavior is equivalent to `allow` rather than a fail-closed rule evaluator.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Implement policy-rule evaluation behind `IPolicyEvaluator`, fail closed on unknown/malformed rule types, and add both allow and deny integration tests through the actual permission middleware.

**Runtime dependency**

Persisted-policy behavior still requires `RT-P5-AUTH-002` in Google Studio after source repair.

---

### P6-DI-001 — core Phase 6 source-acquisition adapters are incompatible with the app's Awilix PROXY-mode `asClass` registrations

**Owner:** Phase 6 — Import Foundation  
**Type:** COMPOSITION / DEPENDENCY INJECTION / RUNTIME-SOURCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL**

**Problem**

The API container is created with `InjectionMode.PROXY`, but multiple Phase 6 adapters are registered with `asClass(...)` while their constructors expect positional/default dependencies rather than a cradle dependency object.

**Source evidence**

- `apps/api/src/infrastructure/di/container.ts`
  - container uses `InjectionMode.PROXY`;
  - registers `NodeSafeSourceHttpTransport`, `LocalImportRawSnapshotStore`, and `SourceAcquisitionLimiter` with `asClass(...).singleton()`.
- `packages/infrastructure/src/import-foundation/network/NodeSafeSourceHttpTransport.ts`
  - constructor expects positional `policy` and `executor`.
- `packages/infrastructure/src/import-foundation/LocalImportRawSnapshotStore.ts`
  - constructor expects a string `rootDirectory`, defaulting to `path.resolve(...)`.
- `packages/infrastructure/src/import-foundation/SourceAcquisitionLimiter.ts`
  - constructor expects callable `now` and `sleep` functions.

Under PROXY injection, the cradle object is supplied to constructors registered with `asClass`, so these positional fields can receive the cradle proxy rather than the expected policy/string/function objects.

**Impact**

The active source-acquisition pipeline can fail before network acquisition, rate limiting, or raw snapshot persistence works at all. This is independent of PostgreSQL availability.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Use explicit `asFunction(({ ...deps }) => new Adapter(...deps))` factories, or refactor these classes to accept a documented dependency object compatible with PROXY injection. Add a real container-resolution/composition test.

---

### P6-QUEUE-002 — expired RUNNING import jobs cannot be reclaimed after worker crash

**Owner:** Phase 6 — Durable Import Queue  
**Type:** RELIABILITY / QUEUE / LEASE RECOVERY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL**

**Problem**

A claimed import job is transitioned to `RUNNING`. If the worker dies and its lease expires, `claimNextJob()` still searches only `QUEUED` and `FAILED_RETRYABLE` jobs. Therefore the expired `RUNNING` job is never eligible for a new claim.

**Source evidence**

- `packages/infrastructure/src/import-foundation/PrismaImportQueueGateway.ts`
  - `claimNextJob()` filters `batchStatus` to `[QUEUED, FAILED_RETRYABLE]` even when `claimUntil < now`;
  - a successful claim sets `batchStatus: RUNNING`;
  - no automatic expired-`RUNNING` requeue/recovery path is present in this gateway.
- The in-memory queue has the same structural status restriction.
- Phase 6 queue/worker contracts require worker-crash recovery and resume semantics.

A second lease-safety weakness is present: claim completion/failure paths validate worker ownership/status but do not consistently require that the lease is still unexpired before finalizing the job.

**Impact**

A worker crash can strand import work indefinitely in `RUNNING`, defeating durable queue recovery and requiring manual intervention.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Add an atomic expired-lease reclaim/requeue transition for `RUNNING`, enforce lease validity on completion/failure, and add concurrent worker/crash/expiry tests.

**Runtime dependency**

Real concurrent claim/crash/restart proof remains under `RT-P6-QUEUE-001` after source repair.

---

## HIGH / P1

### P5-SEC-002 — multiple Phase 5 control-plane mutation routers are mounted outside the protected admin authorization boundary

**Owner:** Phase 5 — API Composition / Security  
**Type:** SECURITY / ROUTE BOUNDARY / AUTHORIZATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The application mounts several Phase 5 runtime/control-plane routers directly under `/api/v1/...`, while the strict admin authentication/permission/audit boundary is applied to `/admin/...` routes.

**Source evidence**

`apps/api/src/app.ts` mounts, among others:

- `/authorization`
- `/settings`
- `/files`
- `/notifications`
- `/cache`
- `/background-jobs`
- `/workflows`
- `/api-services`
- `/shared-components`
- `/enterprise-events`

The underlying routers include mutation operations such as create/register/activate/archive/delete/start/complete/fail/publish/transition. Only specific `/admin/authorization` and `/admin/settings` surfaces are explicitly wrapped in permission guards.

**Impact**

Many current capabilities are fail-closed/deferred, which reduces immediate exploitability, but the routing boundary is structurally unsafe: enabling a real adapter later could expose a mutation surface without any routing change. The Enterprise Event Foundation is already active in memory.

**Preliminary remediation direction**

Classify every mutation as public, authenticated-self-service, service-to-service, or admin control-plane; move/protect it accordingly and require centralized mutation audit/authorization at the boundary.

---

### P5-SET-003 — `ConfigurationResolutionService` is registered incompatibly with PROXY injection and can silently resolve configuration as null

**Owner:** Phase 5 — Settings / Configuration  
**Type:** COMPOSITION / DEPENDENCY INJECTION / SETTINGS  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

`ConfigurationResolutionService` expects two positional optional repositories in its constructor, but the PROXY-mode container registers it with `asClass(ConfigurationResolutionService)`.

**Source evidence**

- `apps/api/src/infrastructure/di/container.ts`
  - `InjectionMode.PROXY`;
  - `configurationResolutionService: asClass(ConfigurationResolutionService).singleton()`.
- `packages/domain/src/settings/services/ConfigurationResolutionService.ts`
  - constructor expects `definitionRepo?` and `assignmentRepo?` as positional arguments;
  - `resolve()` returns `null` immediately if either repository is missing.

**Impact**

The active composition can silently behave as if no configuration exists despite registered persistence repositories, breaking global/tenant/domain/identity resolution semantics without an explicit startup failure.

**Preliminary remediation direction**

Register the service with an explicit factory supplying the two repositories, or change the constructor to an explicit cradle/dependency object. Add app-container tests for all scope levels.

---

### P5-EVT-004 — the active Enterprise Event Foundation is process-local and non-durable

**Owner:** Phase 5 — Enterprise Events  
**Type:** RELIABILITY / EVENTING / DURABILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The active Enterprise Event repository and publishing gateway are in-memory implementations, yet they are wired as live capabilities rather than being explicitly classified as unavailable/development-only.

**Source evidence**

- `apps/api/src/infrastructure/di/container.ts`
  - `enterpriseEventRepo: asClass(InMemoryEnterpriseEventRepository).singleton()`;
  - `eventPublishingGateway: asClass(InMemoryEventPublishingGateway).singleton()`.
- The implementations retain event/listener state only in process memory.
- Later composition, including course-completion event publication, uses the Phase 5 enterprise-event use case.

**Impact**

Event state can be lost on restart and is not safe for multi-instance delivery. This is distinct from the newer Transactional Outbox implementation, which exists elsewhere in the source.

**Preliminary remediation direction**

Either migrate active enterprise-event publication onto the durable outbox/event infrastructure, or fail closed/classify the in-memory implementation as development-only until a durable adapter is wired.

---

### P6-QUEUE-003 — durable queue/worker machinery is not integrated into the live import execution path

**Owner:** Phase 6 — Import Foundation  
**Type:** INTEGRATION / QUEUE / WORKER  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The repository contains queue gateway, lease, checkpoint, worker protocol, replay and DLQ primitives, but the live staging/import flow does not enqueue work through that durable path.

**Source evidence**

- repository search finds `enqueueImportJob(...)` in queue gateway implementations/tests but not in the active import staging application path;
- `ImportWorkerProtocol` is defined/tested but is not the live orchestration path;
- `ImportAdminUseCases.stageNormalizedRows()` performs synchronous staging and directly transitions batch processing/completion;
- admin queue-control endpoints exist separately from that staging path.

**Impact**

The existence of queue code can create a false durability guarantee: active import execution can bypass the very retry/lease/checkpoint machinery intended to make imports recoverable.

**Preliminary remediation direction**

Define one authoritative import execution lifecycle and route production-size work through enqueue → claim → process → checkpoint → finalize/DLQ, with bounded synchronous paths only where explicitly allowed.

---

### P6-DUR-004 — raw import snapshots are persisted to node-local filesystem paths in the active acquisition composition

**Owner:** Phase 6 — Raw Import Artifact Persistence  
**Type:** DURABILITY / STORAGE / MULTI-INSTANCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The active raw-snapshot adapter writes artifacts under a local directory and stores the local filesystem path as `rawArtifactReference`.

**Source evidence**

- `packages/infrastructure/src/import-foundation/LocalImportRawSnapshotStore.ts`
  - default storage root is `path.resolve(process.env.IMPORT_RAW_SNAPSHOT_DIR ?? 'var/import-raw')`;
  - binary and JSON metadata files are written to the local filesystem;
  - `rawArtifactReference` is the local `finalPath`.
- `apps/api/src/infrastructure/di/container.ts`
  - this adapter is the one wired into the active source-acquisition use case.

**Impact**

In an ephemeral or multi-instance runtime, snapshots can disappear with the instance, another worker may not be able to resolve the path, and replay/provenance can become machine-specific.

**Preliminary remediation direction**

Introduce an environment-appropriate durable artifact store behind the existing interface and keep local storage explicitly development-only.

**Runtime dependency**

Multi-instance persistence/retention/access proof remains under `RT-P6-RAW-001`.

---

### P7-DATA-001 — active Reference Data admin writes bypass the canonical validation service

**Owner:** Phase 7 — Reference Data  
**Type:** DATA INTEGRITY / VALIDATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

A domain validation service exists with stronger canonical constraints, but the active admin upsert path does not invoke it. Router validation is materially weaker.

**Source evidence**

- `packages/domain/src/reference-data/services/ReferenceDataValidationService.ts` enforces, among other rules:
  - uppercase ISO2/ISO3 country codes;
  - uppercase 3-letter currency code;
  - three-digit numeric currency code;
  - currency minor unit 0–4;
  - BCP47-like lowercase language format;
  - city latitude/longitude bounds.
- active `ReferenceDataUseCases` upserts do not inject/call this validation service.
- `ReferenceDataAdminRouter` schemas only enforce lengths/minimums for many of these fields and allow unrestricted numeric city coordinates.

**Impact**

Authenticated admin writes can persist malformed canonical codes or impossible coordinates into core reference data.

**Preliminary remediation direction**

Make the canonical domain validator mandatory in every mutation/import promotion path and translate validation reports into structured 4xx responses before persistence.

---

### P7-DATA-002 — `ReferenceCity` lacks a canonical uniqueness constraint and its upsert is race/ambiguity-prone

**Owner:** Phase 7 — Reference Data / Cities  
**Type:** DATA INTEGRITY / CONCURRENCY / IDENTITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

`ReferenceCity` has indexes but no unique canonical key. Repository upsert implements `findFirst(...)` followed by update-or-create.

**Source evidence**

- `packages/infrastructure/prisma/schema.prisma` `ReferenceCity` model:
  - indexes on country/name, region, active state, timezone and administrative region;
  - no unique constraint for city identity.
- `PrismaReferenceDataRepository.upsertCity()`:
  - `findFirst` by country + name + optional region;
  - then separate update/create;
  - if `region` is omitted, same-name cities in the same country can be ambiguous;
  - update data does not write `region`, so a text-region correction cannot be made through the same upsert.

**Impact**

Concurrent or ambiguous writes can create duplicates or update the wrong city, compromising a foundational reference entity used by later domains.

**Preliminary remediation direction**

Define an explicit canonical city identity model before adding a unique constraint; perform duplicate/data-quality inspection in Google Studio first, then migration/backfill only after backup/recovery gates.

**Runtime dependency**

Existing duplicate/integrity inspection is tracked by `RT-P7-INTEGRITY-001`.

---

### P7-PERF-003 — Reference Resolver performs unbounded full-table loads for individual lookups

**Owner:** Phase 7 — Reference Resolver  
**Type:** PERFORMANCE / DATA ACCESS / SCALABILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

Each resolver method loads an entire reference collection and then searches it in application memory.

**Source evidence**

`ReferenceResolverService` calls:

- `listCountries({ activeOnly: false })`
- `listRegions({})`
- `listCities({ activeOnly: false })`
- `listLanguages({ activeOnly: false })`
- `listCurrencies({ activeOnly: false })`

and then resolves ID/code/provider mapping/alias via array search/filter.

`PrismaReferenceDataRepository.pagination()` returns no `take` when page/pageSize are omitted, so those resolver calls are unbounded.

**Impact**

Bulk imports that resolve references per record can produce N × full-table reads/allocations, with particularly poor behavior for city/region data.

**Preliminary remediation direction**

Add repository-level indexed lookup methods for canonical ID/code/provider mapping/alias and scoped city/region lookup; benchmark the repaired implementation in Google Studio.

---

## MEDIUM / P2

### P6-SEC-005 — allowed source path prefixes use raw string-prefix matching and permit sibling-prefix escape

**Owner:** Phase 6 — Source Network Security  
**Type:** SECURITY / SSRF SCOPE / PATH VALIDATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

`SourceNetworkSecurityPolicy.validateScope()` authorizes a path when `url.pathname.startsWith(prefix)`.

**Impact**

If `/api` is authorized, paths such as `/api-evil` or `/apievil` also satisfy the prefix check even though they are not necessarily descendants of `/api`.

**Positive control**

The surrounding SSRF controls are materially stronger and should be preserved: HTTPS-only, URL credentials blocked, origin/subdomain policy, DNS resolution, public-address validation, IP pinning, and redirect revalidation.

**Preliminary remediation direction**

Normalize configured prefixes and require exact path equality or a `/` segment boundary after the prefix.

---

### P6-RES-006 — caller-supplied response-size and timeout values are not bounded by hard maximums

**Owner:** Phase 6 — Source Acquisition  
**Type:** RESOURCE CONTROL / NETWORK  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

`NodeSafeSourceHttpTransport.get()` clamps redirects to a maximum of 5, but accepts `request.maxResponseBytes` and `request.timeoutMs` directly when supplied.

**Impact**

An internal/admin caller can bypass intended default memory/time limits with very large values, weakening resource-exhaustion defenses.

**Preliminary remediation direction**

Validate positivity and clamp both values to centrally defined hard maximums.

---

### P6-REPLAY-007 — Prisma fresh replay leaves persisted checkpoint/control state behind

**Owner:** Phase 6 — Durable Import Queue  
**Type:** RELIABILITY / REPLAY / STATE RESET  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

The in-memory gateway clears checkpoint/progress state for `fromCheckpoint:false`, but the Prisma gateway only resets processed/failed counters and status.

**Source evidence**

`PrismaImportQueueGateway.replayJob()` does not delete old `CHECKPOINT` import records and does not fully reset claim/error/availability control state. `getJobStatus()` can therefore still expose an old checkpoint after a requested fresh replay.

**Impact**

Fresh replay can carry stale observable/resume state and produce incorrect worker behavior once the durable worker path is fully integrated.

**Preliminary remediation direction**

Define atomic replay semantics and reset/delete all state that is incompatible with a fresh replay; add parity tests for in-memory and Prisma adapters.

---

### P7-API-004 — Reference Data routers collapse non-validation failures into HTTP 400

**Owner:** Phase 7 — Reference Data API  
**Type:** API CONTRACT / ERROR CLASSIFICATION / OBSERVABILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

Both public and admin Reference Data routers install local error middleware that returns HTTP 400 for every non-Zod error.

**Source evidence**

- `ReferenceDataAdminRouter.ts`: Zod → 400; all other errors → 400.
- `ReferenceDataPublicRouter.ts`: same broad 400 fallback.

**Impact**

Not-found conditions and infrastructure/database failures can be reported as client validation errors, producing incorrect API semantics and masking operational failures from the global exception classifier/observability path.

**Preliminary remediation direction**

Only handle known validation/domain errors locally; forward unknown/infrastructure errors to the global error middleware and map not-found to 404.

---

### P7-API-005 — `activeOnly=false` is not reliably expressible through the admin query parser

**Owner:** Phase 7 — Reference Data Admin API  
**Type:** API INPUT / QUERY SEMANTICS  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

The admin router uses `z.coerce.boolean()` for query-string `activeOnly`. JavaScript boolean coercion treats the non-empty string `'false'` as truthy.

**Impact**

A normal request such as `?activeOnly=false` can be interpreted as `true`, preventing administrators from reliably requesting inactive/all records through that endpoint.

**Preliminary remediation direction**

Use an explicit string-to-boolean parser accepting only well-defined values such as `true|false|1|0`.

---

### P7-I18N-006 — official Reference Data admin write surfaces cannot persist `nameAr` although the contracts and persistence model support it

**Owner:** Phase 7 — Reference Data / i18n  
**Type:** CONTRACT GAP / ADMIN UI / LOCALIZATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

Reference Data DTOs and Prisma records contain `nameAr`, and repository upserts can persist it, but the active admin write schemas omit that field for countries, currencies, languages, cities and regions. The admin forms likewise expose only the English name in the audited source.

Because Zod object parsing strips unknown keys by default, supplying `nameAr` to those API bodies does not provide a supported write path.

**Impact**

The official admin surface cannot maintain the bilingual canonical data model and requires side-channel seeds/scripts for Arabic display names.

**Preliminary remediation direction**

Expose validated bilingual fields consistently in admin API + UI and preserve existing localization projection behavior.

---

# 9. Phase 5–7 runtime/DB evidence register — not source defects yet

These items remain intentionally deferred to the Google Studio runtime phase. They must not be counted as failed source implementation merely because the repository has no live database.

| Runtime ID | Owner | Status | Evidence required in Google Studio | DB mutation required? |
|---|---|---|---|---|
| RT-P5-AUTH-002 | Phase 5 Authorization | `PENDING_GOOGLE_STUDIO` | After P5-AUTH-001 repair, prove persisted conditional RBAC allow/deny rules, unknown-rule fail-close, and real 401/403 behavior | Controlled test writes after backup gate |
| RT-P5-SET-001 | Phase 5 Settings | `PENDING_GOOGLE_STUDIO` | Prove global → tenant/domain → identity configuration resolution against real persistence after DI repair | Controlled test writes |
| RT-P5-EVT-001 | Phase 5 Events | `PENDING_GOOGLE_STUDIO` | If Enterprise Event Foundation remains active, prove durable restart/multi-instance semantics or prove full migration to durable outbox path | Depends on final architecture |
| RT-P6-QUEUE-001 | Phase 6 Queue | `PENDING_GOOGLE_STUDIO` | Migration state, concurrent claims, lease expiry, worker crash/restart, checkpoint resume, DLQ/replay/idempotency | Yes, controlled after backup gate |
| RT-P6-RAW-001 | Phase 6 Raw Artifacts | `PENDING_GOOGLE_STUDIO` | Prove artifact retention and access across runtime instances/restarts using the final storage adapter | Low-risk storage writes |
| RT-P7-INTEGRITY-001 | Phase 7 Reference Data | `PENDING_GOOGLE_STUDIO` | Inspect existing city duplicates, region-country consistency and ISO/code quality before constraints/backfill | Inspection first; mutation only after approved plan |
| RT-P7-ATOMIC-001 | Phase 7 Reference Data | `PENDING_GOOGLE_STUDIO` | Prove reference mutation + audit + outbox are committed/rolled back atomically in PostgreSQL | Yes, controlled |
| RT-P7-PERF-001 | Phase 7 Resolver | `PENDING_GOOGLE_STUDIO` | After source optimization, measure DB query count/latency under representative bulk-import reference resolution | Test reads / controlled fixtures |

Existing Phase 2–4 runtime items remain active and are not duplicated here.

---

# 10. Historical findings re-verified during Phase 5–7

The following older concerns were checked and are not being re-added as current open source defects:

- **Transactional Outbox source missing:** source-resolved; real transaction/recovery proof remains runtime-only.
- **Phase 6 silent Prisma fallback:** current persistence path propagates database errors and explicit in-memory/development classifications exist; the old source concern is not current.
- **Phase 6 owns downstream semantic merge/promotion:** the current source contains the Universal Import Handoff boundary; downstream domain semantic merge/promotion is no longer treated as a Phase 6 responsibility.
- **All Phase 5 deferred/dummy capabilities are production bugs:** rejected as an overbroad finding. Explicitly unavailable/deferred capabilities are not defects merely because they are incomplete. Only capabilities that are actively composed with unsafe semantics are recorded above.

---

# 11. Phase 5–7 positive controls observed

Controls that should be preserved during future remediation:

- `/admin` routing has strict authentication and mutation-audit middleware; permission guards resolve the persisted RBAC evaluator and fail closed when that evaluator is unavailable.
- core identity/audit/authorization persistence has Prisma-backed adapters rather than silent in-memory fallback.
- many not-yet-implemented Phase 5 capabilities deliberately use explicit unavailable/fail-closed capability objects.
- Phase 6 SSRF defenses already include HTTPS-only, credential blocking, origin/subdomain scoping, DNS resolution, public-IP enforcement, IP pinning and redirect revalidation; only the path-boundary weakness is recorded.
- large inline import payloads are bounded and larger flows are directed toward artifact-based handling.
- dead-letter reasons are sanitized.
- country/currency/language canonical codes have Prisma uniqueness at the schema level.
- current Phase 7 city writes verify active country and administrative-region country compatibility before persistence.
- the Phase 7 atomic audited-outbox mutation executor is wired in source; live PostgreSQL atomicity remains a runtime proof item, not a missing-source claim.
- no upward package-dependency violation was identified as a new Phase 5–7 finding in this batch.

---

# 12. Batch verdict — Phase 5–7

```text
PHASE_5_TO_7_DEEP_AUDIT = COMPLETE
SOURCE_MODIFICATIONS = 0
DATABASE_CONNECTED = NO
MIGRATIONS_APPLIED = 0
GOOGLE_STUDIO_RUNTIME_EXECUTED = NO
NEW_CONFIRMED_OPEN_FINDINGS = 17
CUMULATIVE_CONFIRMED_OPEN_FINDINGS = 34
CRITICAL_NEW = 3
HIGH_NEW = 8
MEDIUM_NEW = 6
LOW_NEW = 0
RUNTIME_DEFERRED_ITEMS_NEW = 8
```

The findings remain recorded in audit/source order. **No remediation priority has been finalized.** Root causes that overlap Phase 8–19 may later absorb or reprioritize downstream symptoms during the final whole-project remediation sort.

---

# 13. Next audit batch

```text
NEXT = PHASE 8 → PHASE 10
MODE = DEEP AUDIT ONLY
APPEND_TO_THIS_SAME_REGISTER = YES
SOURCE_CHANGES = FORBIDDEN DURING AUDIT
DB/RUNTIME_ONLY_ITEMS = TAG PENDING_GOOGLE_STUDIO
```

The next batch must continue to distinguish source defects from runtime-only evidence and must cross-check dependencies back into Phases 2–7 before recording duplicate symptoms as new root causes.


---

# 14. Phase 8–10 deep audit — confirmed findings

**Audited baseline:** `e57aad8c52a3ee6d686671870e0bf0392ba7417f`  
**Audit mode:** deep source/static + domain-contract + architecture/governance consistency  
**Source changes:** `0`  
**Database/runtime execution:** `0`  

The batch was reviewed against the active Phase 8 Academic Taxonomy, Phase 9 International Tests, and Phase 10 Major source contracts, while preserving the Google Studio runtime boundary. Runtime-only facts are recorded separately in Section 15 and are not counted as source defects.

## CRITICAL / P0

### P9-PUB-001 — `optionalFields` can override canonical persisted lifecycle/security fields on read and expose a non-published test through the public slug endpoint

**Owner:** Phase 9 — International Tests  
**Type:** DATA INTEGRITY / PUBLICATION / API SECURITY BOUNDARY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL**

**Problem**

The International Test repository persists arbitrary `optionalFields`/rest data, then spreads `optionalFields` **after** canonical Prisma columns while mapping a database record back to `InternationalTestDto`.

As a result, JSON keys such as `status`, `isPubliclyVisible`, `isSourceVerified`, `canonicalName`, or other canonical properties can shadow the real persisted columns in the returned DTO.

The active admin create/update routes accept `req.body` directly without a body-level Zod schema for the test root. A request can therefore contain a legitimate root lifecycle value and a conflicting value inside `optionalFields`.

The public detail path calls `findBySlug()` and decides publication eligibility using the mapped DTO status. A database row whose canonical status is not `PUBLISHED` can therefore be represented to the public use case as `PUBLISHED` if its optional JSON contains that key.

**Source evidence**

- `packages/infrastructure/src/international-tests/PrismaInternationalTestRepository.ts:162-188`
  - arbitrary `optionalFields` + `...rest` are persisted into the JSON compatibility field.
- `packages/infrastructure/src/international-tests/PrismaInternationalTestRepository.ts:195-237`
  - update repeats the same unrestricted merge.
- `packages/infrastructure/src/international-tests/PrismaInternationalTestRepository.ts:934-954`
  - `optionalFields` is spread after canonical `...rest`, allowing it to override canonical DTO values.
- `apps/api/src/presentation/api/router/InternationalTestAdminRouter.ts:63-69,84-90`
  - root create/upsert/update forwards `req.body` without a root body schema.
- `packages/application/src/tests-platform/use-cases/InternationalTestUseCases.ts:323-328`
  - public detail trusts `test.status` from the mapped DTO to decide whether a test is published.

**Impact**

This breaks the publication boundary and can make source-of-truth database state disagree with public API behavior. It also weakens source-verification/readiness semantics because canonical booleans can be shadowed at read time.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Apply the reserved-key sanitization model already used by the Phase 10 Major repository: canonical columns must always win, reserved keys must be removed from compatibility JSON on write and read, and the public detail query should additionally enforce `status=PUBLISHED` at the repository/database predicate boundary.

---

## HIGH / P1

### P8-ARCH-001 — Phase 8 reimplements DAG/cycle traversal locally instead of consuming the required Phase 7 Generic Hierarchy foundation

**Owner:** Phase 8 — Academic Taxonomy  
**Type:** ARCHITECTURE / FOUNDATION DUPLICATION / DAG INTEGRITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The Phase 8 architecture explicitly requires Academic Taxonomy to consume Phase 7.13 Generic Hierarchy & DAG mechanics and `ICycleDetectionValidator`, and explicitly forbids a custom DAG implementation.

The current source contains no `ICycleDetectionValidator` or `GenericHierarchy` implementation in `packages/` or `apps/`. Phase 8 instead owns a local `hasPath()` breadth-first traversal and loads the entire taxonomy graph before each edge write.

**Source evidence**

- `docs/phases/phase-08-academic-taxonomy/phase-08-03-implementation-guide.md:22,117`
  - custom DAG algorithms are forbidden; `ICycleDetectionValidator` must be consumed.
- `packages/domain/src/academic-taxonomy/validation.ts:43-66`
  - local `hasPath()` graph traversal.
- `packages/application/src/academic-taxonomy/use-cases/AdminAcademicTaxonomyUseCases.ts:72-83`
  - full node/edge collections are loaded and passed to the local validator.
- source-wide search under `packages/` and `apps/` returns no implementation reference for `ICycleDetectionValidator` / `GenericHierarchy`.

**Impact**

The source diverges from the declared architectural dependency and creates duplicate graph logic. It also prevents reuse of a shared, centrally governed cycle/closure implementation by later domains.

**Preliminary remediation direction**

During final reprioritization, determine whether the root repair belongs to the Phase 7 foundation or a Phase 8 adapter. Phase 8 should consume one canonical DAG/cycle capability rather than preserve a second algorithm.

---

### P8-DAG-002 — edge cycle validation and edge persistence are not atomic, allowing concurrent writes to defeat the cycle check

**Owner:** Phase 8 — Academic Taxonomy  
**Type:** DATA INTEGRITY / CONCURRENCY / DAG  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

`addEdge()` performs a read-check-write sequence:

```text
listNodes()
→ listEdges()
→ validateEdge()
→ repository.addEdge()
```

There is no transaction/serialization boundary tying the graph snapshot used by cycle validation to the subsequent insert. Two concurrent edge requests can validate against the same old graph and then jointly create a cycle that neither request observed.

Prisma enforces only duplicate parent/child uniqueness; it does not enforce acyclicity.

**Source evidence**

- `AdminAcademicTaxonomyUseCases.ts:72-83`
- `schema.prisma:3187-3200`
  - `AcademicTaxonomyEdge` has FK + unique pair constraints, but no database-enforced DAG/cycle guard.

**Impact**

Canonical academic hierarchy integrity can be corrupted under concurrent administration/import execution even though each individual request passed source validation.

**Preliminary remediation direction**

Move cycle validation + persistence into the shared transactional DAG capability with an isolation/locking strategy appropriate to the chosen PostgreSQL implementation. Runtime concurrency proof remains a Google Studio gate.

---

### P8-MAP-003 — cross-standard mapping validation does not enforce active endpoint nodes, standard consistency, or different source/target standards

**Owner:** Phase 8 — Academic Taxonomy  
**Type:** DATA INTEGRITY / CANONICAL MAPPING / LIFECYCLE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The Phase 8 architecture requires both mapping endpoints to resolve to valid **active** nodes and requires source and target standards to differ.

The current `validateMapping()` checks only non-empty IDs, non-self node IDs, enum membership, strength/confidence, and duplicate tuples. The active Admin use case loads existing mappings for the source but does not fetch either endpoint node.

It therefore does not prove:

- source node exists and is active before application validation;
- target node exists and is active;
- the source node's stored standard matches `sourceStandard`;
- the target node's stored standard matches `targetStandard`;
- `sourceStandard !== targetStandard`.

FKs catch nonexistent IDs at persistence, but they do not enforce lifecycle or standard semantics.

**Source evidence**

- `phase-08-01-enterprise-architecture-specification.md:204-205`
- `packages/domain/src/academic-taxonomy/validation.ts:447-575`
- `AdminAcademicTaxonomyUseCases.ts:114-125`

**Impact**

Semantically invalid crosswalks can be stored as canonical mappings, including mappings involving inactive nodes or same-standard relationships that violate the declared domain rule.

**Preliminary remediation direction**

Resolve both canonical nodes before mapping persistence, validate active lifecycle and actual stored standard ownership, enforce different standards, and preserve the DB unique tuple as a final defense rather than the primary semantic validator.

---

### P8-DEG-004 — partial DegreeLevel updates reset omitted `displayRank` and `status`

**Owner:** Phase 8 — DegreeLevel  
**Type:** DATA CORRUPTION / UPDATE SEMANTICS / LIFECYCLE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The active API makes `displayRank` and `status` optional. `DegreeLevelUseCases.update()` passes those optional values directly to `upsertDegreeLevel()`.

The repository's update branch then writes:

- `displayRank: data.displayRank ?? 0`
- `status: data.status ?? 'ACTIVE'`

Therefore a request intended only to change names can silently reset a non-zero display rank to `0` and can reactivate a non-active canonical DegreeLevel.

**Source evidence**

- `apps/api/src/presentation/api/router/AcademicTaxonomyAdminRouter.ts:216-220`
- `packages/application/src/degree-level/DegreeLevelUseCases.ts:30-41`
- `packages/infrastructure/src/degree-level/DegreeLevelRepository.ts:28-38`

**Impact**

A harmless label edit can mutate canonical ordering and lifecycle state, affecting Phase 9/10 consumers that rely on active DegreeLevel identity.

**Preliminary remediation direction**

Preserve existing values when optional update fields are omitted; separate create defaults from update semantics.

---

### P9-REF-002 — normalized country/language relationships discard canonical Phase 7 identity and persist only legacy codes

**Owner:** Phase 9 — International Tests / Reference Relationships  
**Type:** CANONICAL IDENTITY / DATA MODEL / CROSS-PHASE CONTRACT  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The active Phase 9 reference contract states that writes use `canonicalReferenceId` resolved through Phase 7 and that `referenceCode` is legacy/read compatibility only.

The Prisma country/language relationship models contain no canonical Reference Data FK/ID. The repository converts the input to:

```text
countryIso2Code = referenceCode || canonicalReferenceId
languageIsoCode = referenceCode || canonicalReferenceId
```

and persists only that string.

Thus a UUID-like canonical reference ID can be written into an ISO-code column when no code is supplied, and even a correctly resolved write loses the canonical reference identity after persistence.

**Source evidence**

- `docs/phases/phase-09-tests-platform/international-test-reference-contract-v1.md:7,14,18`
- `schema.prisma:2156-2190`
- `PrismaInternationalTestRepository.ts:746-791`

**Impact**

The normalized model cannot prove or retain canonical Phase 7 identity, lifecycle, or referential integrity for country/language relationships. This also makes reliable backfill and rename/deprecation handling harder.

**Preliminary remediation direction**

Introduce canonical Reference Data identity in the normalized relationship model while retaining codes only as compatibility/projection fields, then backfill under the Google Studio migration gate.

---

### P9-REL-003 — normal Admin create/update validates canonical relationships but does not persist them into normalized relationship tables

**Owner:** Phase 9 — International Tests  
**Type:** DATA PERSISTENCE / CONTRACT / SHADOW JSON  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

`UpsertInternationalTestDto` officially includes country, language, academic-taxonomy and DegreeLevel relationship arrays. `InternationalTestAdminUseCases` validates canonical country/language/DegreeLevel relationships before create/update.

However the root repository `create()`/`update()` does not destructure or write those relations. They fall into `...rest` and are persisted only inside `optionalFields` JSON.

The normalized `upsert*Relationship()` methods are used by the import-promotion path, not by normal Admin root create/update.

**Source evidence**

- `packages/domain/src/tests-platform/contracts.ts:73-98`
- `InternationalTestUseCases.ts:59-100,277-299`
- `PrismaInternationalTestRepository.ts:162-188,195-237`
- normalized relation writers begin at `PrismaInternationalTestRepository.ts:746`.

**Impact**

The API can report a successful canonical validation/write while the authoritative normalized relation tables remain empty and the relationship exists only as compatibility JSON.

**Preliminary remediation direction**

Make root aggregate writes explicitly persist normalized relations inside the same atomic mutation boundary, or remove relation arrays from root write contracts and require dedicated relation commands. Do not maintain two silent write paths.

---

### P9-IMP-004 — import promotion does not fail closed for explicit canonical relationship arrays

**Owner:** Phase 9 — International Test Import Promotion  
**Type:** IMPORT INTEGRITY / REFERENCE RESOLUTION / FAIL-CLOSED  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The import promotion path resolves availability country IDs and `relatedLanguages`, but explicit `countryRelationships` and `languageRelationships` arrays are persisted without resolving their canonical IDs through Phase 7.

For those arrays the code accepts `canonicalReferenceId || referenceCode` directly. Academic taxonomy relationship IDs and DegreeLevel IDs are likewise forwarded to persistence without the Admin use case's canonical active-reference checks.

**Source evidence**

- `InternationalTestImportPromotionUseCase.ts:402-491`
- `international-test-reference-contract-v1.md:18`
  - required resolver missing/inactive writes must fail closed.

**Impact**

The generic import path can bypass the canonical validation policy that the Admin path attempts to enforce, causing inconsistent integrity depending on entry route.

**Preliminary remediation direction**

Centralize canonical relationship resolution/validation in one Phase 9 domain/application service used by Admin and import promotion. Reject unresolved/inactive references before persistence.

---

### P9-PUB-005 — publication readiness does not enforce the Phase 9 mandatory official-registration URL and score-scale definition

**Owner:** Phase 9 — International Tests Publication  
**Type:** PUBLICATION READINESS / DOMAIN CONTRACT  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The active Phase 9 implementation guide lists the official registration URL and score-scale definition as mandatory publication/import validation fields.

The current validation service marks only canonical name, provider name and category as required. A missing score scale is a warning only. The publication policy adds localized names, provider ID and source verification, but does not promote missing score scale or official registration link to blocking conditions.

**Source evidence**

- `phase-09-03-implementation-guide.md:647-655`
- `packages/domain/src/tests-platform/validation.ts:70-72,147-165`
- `InternationalTestPublicationReadinessPolicy.ts:16-47`

**Impact**

A test can satisfy the source publication gate while lacking two structures the phase specification declares mandatory for a complete authoritative test profile.

**Preliminary remediation direction**

Align one canonical mandatory-field policy used by completeness, import promotion and publication readiness. Explicitly define which official link qualifies as registration evidence and require a valid normalized score-scale object before publication.

---

### P10-TAX-001 — the production DI path constructs the Major taxonomy resolver from static seed definitions that contain no database node IDs

**Owner:** Phase 10 — Major Platform / Taxonomy Resolution  
**Type:** COMPOSITION / CANONICAL LINKAGE / CROSS-PHASE DEPENDENCY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

`AcademicTaxonomyResolver` falls back to `iscedFBaselineNodes` when no node list is injected. Those seed definitions have codes/names/status metadata but no database `id` field.

The active API DI registration creates `MajorImportPromotionUseCase(majorRepository, undefined, atomicDomainMutationCoordinator)`, explicitly triggering the resolver's default static baseline.

The resolver can therefore return `EXACT_MATCH` by code/name while `academicFieldId`, `disciplineId` and `programAreaId` remain undefined. The import promotion path only copies canonical links when those IDs exist.

**Source evidence**

- `packages/application/src/majors/services/AcademicTaxonomyResolver.ts:76-99,447-475`
- `packages/domain/src/academic-taxonomy/isced-f-baseline.ts:13-27`
  - seed input has no DB ID.
- `apps/api/src/infrastructure/di/container.ts:8281-8282`
  - Major promotion is constructed without a DB-backed resolver.
- `MajorImportPromotionUseCase.ts:103-113`

**Impact**

The default runtime composition can classify a taxonomy match semantically yet fail to establish the canonical Phase 8 IDs required for COMPLETE/publication readiness. Canonical linkage therefore depends on pre-linked payloads or out-of-band scripts rather than the composed import use case.

**Preliminary remediation direction**

Compose a resolver backed by the canonical Phase 8 repository/read model, with bounded cached code lookups if needed. Static seed nodes may remain deterministic matching aids but must not masquerade as canonical persisted identities.

---

### P10-CAN-002 — Major completeness/publication checks reference presence, not active canonical DegreeLevel/taxonomy validity

**Owner:** Phase 10 — Major Platform  
**Type:** PUBLICATION / CANONICAL IDENTITY / LIFECYCLE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

Major import accepts free `degreeLevelId`, `academicFieldId` and `disciplineId` strings. `ensureLevelProfile()` writes them directly. Prisma FKs prove existence, but the application does not resolve them through Phase 8 or verify that the referenced DegreeLevel/taxonomy node is active and semantically the expected node type.

`MajorPublicationReadinessPolicy` tests only whether a profile contains a `degreeLevelId` and whether some taxonomy ID/mapping exists. It does not inspect the included canonical objects' lifecycle state.

**Source evidence**

- `MajorImportPayloadSchema` in `packages/domain/src/majors/majors.ts` accepts the canonical IDs as optional strings.
- `MajorImportPromotionUseCase.ts:356-398`
- `MajorPublicationReadinessPolicy.ts:11-63`
- `schema.prisma:1510-1539` and `1624-1647` enforce FK existence, not lifecycle state.

**Impact**

An archived/deprecated/non-active canonical reference can satisfy the source publication gate solely because its ID exists.

**Preliminary remediation direction**

Add a canonical-reference validation service for Phase 8 DegreeLevel and taxonomy nodes, require active publishable references at the publication boundary, and retain FK constraints as the final persistence defense.

---

### P10-CMP-003 — Major completeness source-identity logic disagrees with the publication policy and can downgrade valid imported majors

**Owner:** Phase 10 — Major Platform / Completeness  
**Type:** STATE MODEL / IMPORT / PUBLICATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

The frozen Phase 10 contract treats source identity as part of completeness and the publication policy accepts `sourceImportRecordId`, `officialSourceUrl`, or a persisted `MajorSource`.

`MajorCompletenessClassifier`, however, considers source identity satisfied **only** when `officialSourceUrl` or `sourceUrl` exists.

The import use case classifies the payload before attaching the ImportRecord as `sourceImportRecordId`. `AdminMajorUseCases.updateMajor()` also rebuilds the classification payload without `sourceImportRecordId` or `sources`.

Therefore an imported Major with valid import evidence but no URL can remain/downgrade to `NEEDS_REVIEW` even though the publication policy recognizes its source identity.

**Source evidence**

- `packages/domain/src/majors/majors.ts:502-520`
- `MajorImportPromotionUseCase.ts:97-116,139-165`
- `AdminMajorUseCases.ts:111-134`
- `MajorPublicationReadinessPolicy.ts:33-37`

**Impact**

Completeness state is non-deterministic across creation, update and publication logic, creating false review blockers and making status changes depend on which representation of source evidence happened to be supplied.

**Preliminary remediation direction**

Define one canonical SourceIdentity predicate shared by the completeness classifier and publication policy, including persisted ImportRecord/MajorSource evidence. Recompute completeness from authoritative aggregate state after persistence where necessary.

---

### P10-VERS-004 — duplicate Major import selects the oldest version as “previous” and can generate a duplicate version number

**Owner:** Phase 10 — Major Import Versioning  
**Type:** VERSIONING / DATA INTEGRITY / IMPORT  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH**

**Problem**

`PrismaMajorRepository.listVersions()` returns versions ordered by `versionNumber DESC`.

`MajorImportPromotionUseCase.attachImportSnapshot()` then selects:

```ts
const previousVersion = existingVersions[existingVersions.length - 1];
```

That is the **oldest** returned version, not the latest. It then computes `previousVersion.versionNumber + 1` and builds the diff against that oldest raw payload.

With versions `[3,2,1]`, a new import calculates version `2`, colliding with the existing unique tuple. The current unit tests only mock a single previous version, so this multi-version case is not covered.

**Source evidence**

- `PrismaMajorRepository.ts:293-300`
  - descending version order.
- `MajorImportPromotionUseCase.ts:240-248`
  - uses final/oldest array element.
- `schema.prisma:1476-1507`
  - unique `[majorId, profileId, versionNumber]`.
- `MajorImportPromotionUseCase.spec.ts:228-300`
  - tested with only one existing version.

**Impact**

After more than one prior version exists, duplicate import/version promotion can fail with a uniqueness error and can compute change summaries against the wrong historical snapshot.

**Preliminary remediation direction**

Use the newest version deterministically (`existingVersions[0]` under the current repository contract) or expose a dedicated `getLatestVersion()` repository operation. Add multi-version and concurrency tests.

---

## MEDIUM / P2

### P8-DEG-005 — DegreeLevel lifecycle status accepts arbitrary strings through the canonical Admin write surface

**Owner:** Phase 8 — DegreeLevel  
**Type:** LIFECYCLE GOVERNANCE / INPUT VALIDATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

`UpdateDegreeLevelCommand.status` is an unrestricted `string`, and the API schema uses `z.string().optional()`. The repository writes it directly.

**Source evidence**

- `DegreeLevelUseCases.ts:8-13`
- `AcademicTaxonomyAdminRouter.ts:216-220`
- `DegreeLevelRepository.ts:31-37`

**Impact**

Values outside the canonical lifecycle vocabulary can enter a shared Phase 8 reference entity. Downstream Phase 9/10 code uses exact checks such as `status === 'ACTIVE'`, so invalid strings have cross-phase consequences.

**Preliminary remediation direction**

Use the canonical lifecycle enum/value object at API, application and persistence boundaries.

---

### P9-COMP-006 — International Test validation can never emit `NEEDS_REVIEW`

**Owner:** Phase 9 — International Tests  
**Type:** STATE MACHINE / COMPLETENESS  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

The validator computes:

```text
isComplete = missingFields.length === 0 && !hasErrors
canBeReviewed = isComplete
```

and then returns `NEEDS_REVIEW` only in `else if (canBeReviewed)` after `if (isComplete)`.

That branch is unreachable. The validator can only report COMPLETE or INCOMPLETE even though the Phase 9 state model contains NEEDS_REVIEW.

**Source evidence**

- `packages/domain/src/tests-platform/validation.ts:314-331`

**Impact**

Reviewable-but-not-complete states cannot be represented consistently and downstream workflow decisions cannot rely on the advertised completeness enum.

**Preliminary remediation direction**

Define independent `isComplete` and `canBeReviewed` predicates and cover all intended state transitions with table-driven tests.

---

### P9-PAGE-007 — public International Test pagination accepts negative page/page-size values and can send invalid Prisma pagination

**Owner:** Phase 9 — International Tests API  
**Type:** INPUT VALIDATION / API RELIABILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

The public router uses `parseInt()` transforms without minimum validation. `pageSize` is capped only from above. The repository converts values with `Number(...)` but does not clamp them positive.

Negative query values therefore survive into pagination arithmetic / Prisma `skip` and `take` behavior.

**Source evidence**

- `InternationalTestPublicRouter.ts:13-19`
- `PrismaInternationalTestRepository.ts:253-255` and subsequent pagination calculation.

**Impact**

Malformed but syntactically accepted requests can become infrastructure errors rather than clean 400 validation responses; the router then also classifies unknown errors as 400, reducing observability.

**Preliminary remediation direction**

Use numeric Zod coercion with integer `.min(1)` and explicit maximums before reaching the repository; keep repository clamps as defense in depth.

---

### P9-VERS-008 — International Test draft-version numbering is a read-then-insert race under concurrent import requests

**Owner:** Phase 9 — International Tests Versioning  
**Type:** CONCURRENCY / VERSIONING  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

`createImportDraftVersion()` reads the highest version number, calculates `+1`, then inserts separately. The database has a unique `[testId, versionNumber]` constraint, but no source-level retry/locking/sequence allocation is used.

Two concurrent draft requests for the same test can both select the same next number; one will fail on uniqueness.

**Source evidence**

- `PrismaInternationalTestRepository.ts:618-633,686-713`
- `schema.prisma:1813-1849`

**Impact**

Concurrent import processing can fail nondeterministically and require manual retry even though both operations were otherwise valid.

**Preliminary remediation direction**

Allocate version numbers atomically using a transaction/lock/retry strategy and prove the final behavior in Google Studio concurrency tests.

---

### P10-GOV-005 — active Phase 10 architecture documents and the implemented root/profile identity model disagree on the deduplication key

**Owner:** Phase 10 — Major Platform Governance  
**Type:** CONTRACT DRIFT / SSOT / DEDUPLICATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM**

**Problem**

The Phase 10 architecture specification and implementation guide define the deterministic Major duplicate key as:

```text
canonicalMajorName + academicFieldOrDiscipline + degreeLevel + sourceClassificationSystem
```

The current source intentionally generates a root Major key that omits degree level and source classification system, and unit tests explicitly require Bachelor/Master/Doctorate representations to share the same Major identity with separate `MajorLevelProfile`s.

The later freeze handoff also describes `MajorLevelProfile` as the level-specific child. Therefore the implementation appears intentionally evolved, but the active architecture documents were not reconciled with that design.

**Source evidence**

- `phase-10-01-enterprise-architecture-specification.md:231`
- `phase-10-03-implementation-guide.md:579`
- `packages/domain/src/majors/majors.ts` — `MajorDeduplicationService.generateKey()` / `generateProfileKey()`.
- `packages/application/tests/majors/MajorImportPromotionUseCase.spec.ts:400-431`
  - explicitly asserts one root identity across MJR/MAS/DOC degree levels.
- `docs/phases/phase-10-majors/PHASE_10_FINAL_FREEZE_AND_HANDOFF.md:15-18`
  - establishes source IDs plus level-profile linkage.

**Impact**

Future remediation or import work can follow two incompatible duplicate semantics depending on which “active” document is consulted. This is a governance hazard with potential data-merging consequences.

**Preliminary remediation direction**

During final remediation planning, obtain one ARB-approved canonical dedup contract and update the stale architecture/implementation text or the source—not both independently. Do not change identity behavior before database reconciliation.

---

# 15. Phase 8–10 runtime/DB evidence register — not source defects yet

These items are intentionally deferred to the Google Studio runtime phase and are **not** included in the 18 source findings above.

| Runtime ID | Owner | Status | Evidence required in Google Studio | DB mutation required? |
|---|---|---|---|---|
| RT-P8-DAG-001 | Phase 8 Taxonomy DAG | `PENDING_GOOGLE_STUDIO` | Inspect current graph for cycles/orphans; after source repair prove concurrent edge writes cannot create a cycle | Inspection first; controlled edge writes after backup gate |
| RT-P8-MAP-001 | Phase 8 Crosswalks | `PENDING_GOOGLE_STUDIO` | Count mappings with inactive endpoints, same source/target standards, or node-standard mismatch before enforcing new guards | Inspection first; backfill only after plan |
| RT-P8-DEG-001 | Phase 8 DegreeLevel | `PENDING_GOOGLE_STUDIO` | Snapshot canonical DegreeLevel statuses/ranks and prove name-only updates preserve them | Controlled test write |
| RT-P9-PUB-001 | Phase 9 Publication | `PENDING_GOOGLE_STUDIO` | Inspect existing InternationalTest `optionalFields` for reserved-key collisions (`status`, visibility, verification, canonical identity) before sanitation/backfill | Read-only first; mutation after approved cleanup |
| RT-P9-REF-001 | Phase 9 References | `PENDING_GOOGLE_STUDIO` | Reconcile code-only country/language rows to canonical Phase 7 IDs; prove zero unresolved/ambiguous links | Inspection + staged backfill |
| RT-P9-VERS-001 | Phase 9 Versions | `PENDING_GOOGLE_STUDIO` | Concurrent import-draft version creation, unique-number retry/serialization and rollback proof | Controlled writes |
| RT-P10-LINK-001 | Phase 10 Majors | `PENDING_GOOGLE_STUDIO` | Reconcile all source identities against real DegreeLevel/taxonomy IDs; preserve `IDs regenerated = 0` and no silent remapping | Inspection first; staged linkage only |
| RT-P10-VERS-001 | Phase 10 Majors | `PENDING_GOOGLE_STUDIO` | Inspect existing MajorVersion ordering/duplicates and prove third+ version promotion selects latest version/diff source | Controlled writes after source repair |
| RT-P10-PUB-001 | Phase 10 Publication | `PENDING_GOOGLE_STUDIO` | Verify every published Major has active canonical DegreeLevel + taxonomy references and valid persisted source identity | Read-only audit first |

Existing Phase 2–7 runtime items remain active and are not duplicated here.

---

# 16. Historical / overlapping concerns re-verified during Phase 8–10

The following items were checked to avoid inflating the register with duplicate symptoms:

- **Generic router error classification:** Phase 8/9/10 local routers contain the same broad local error-mapping pattern already captured as an earlier cross-phase API error-classification concern. It is not counted again here as three new root causes.
- **Phase 10 optional JSON shadowing:** unlike the Phase 9 repository, `PrismaMajorRepository` removes reserved canonical keys from `optionalFields` and then spreads canonical columns after sanitized compatibility fields. The Phase 9 CRITICAL finding is therefore not copied into Phase 10.
- **Phase 10 public list lifecycle filter:** `listPublished()` forces the canonical Prisma `status=PUBLISHED` filter. No separate public-list publication bypass was added for Phase 10.
- **Phase 9 fee currency resolution:** the import promotion path resolves active canonical currency identity before fee persistence; this control is preserved and is not an open source defect.
- **Phase 8 FK existence:** Prisma FKs protect taxonomy edge/mapping endpoint existence at persistence, but they do not replace the missing lifecycle/semantic checks recorded above.

---

# 17. Phase 8–10 positive controls observed

Controls that should be preserved during eventual remediation:

- Academic Taxonomy nodes have deterministic identity fields plus schema uniqueness for deterministic key and canonical standard/code combinations.
- Academic Taxonomy edges have parent/child FKs and duplicate-edge uniqueness; the missing protection is shared/atomic cycle semantics, not basic referential existence.
- DegreeLevel identity is centralized in Phase 8 and consumed by later phases rather than recreated in Phase 9/10 schemas.
- Phase 9 root/admin mutations are routed through the shared atomic mutation coordinator when configured, and the repository exposes a transactional form.
- Phase 9 explicitly rejects payment-execution fields and auto-publish/auto-merge flags in domain validation.
- Phase 9 import fee persistence resolves an active Phase 7 currency before normalized fee write.
- Phase 10 `PrismaMajorRepository` has reserved-key sanitation for `optionalFields`, preventing the canonical-field shadowing found in Phase 9.
- Phase 10 Major classification mappings use canonical taxonomy FKs and batch-level semantic duplicate checks.
- Phase 10 Major relationships reject self-links and duplicate semantic tuples within a write batch.
- Phase 10 Admin mutation paths are wired with authenticated actor context and the atomic-domain-mutation coordinator in the active API composition.
- Phase 10 source-freeze documentation correctly leaves final database reconciliation/build/runtime approval pending Google Studio instead of falsely declaring runtime closure.

---

# 18. Batch verdict — Phase 8–10

```text
PHASE_8_TO_10_DEEP_AUDIT = COMPLETE
SOURCE_MODIFICATIONS = 0
DATABASE_CONNECTED = NO
MIGRATIONS_APPLIED = 0
GOOGLE_STUDIO_RUNTIME_EXECUTED = NO
NEW_CONFIRMED_OPEN_FINDINGS = 18
CUMULATIVE_CONFIRMED_OPEN_FINDINGS = 52
CRITICAL_NEW = 1
HIGH_NEW = 12
MEDIUM_NEW = 5
LOW_NEW = 0
RUNTIME_DEFERRED_ITEMS_NEW = 9
```

Current cumulative source finding totals after Phase 2–10:

```text
CRITICAL = 5
HIGH = 28
MEDIUM = 18
LOW = 1
TOTAL = 52
```

The register is still maintained in audit discovery order. **No execution priority has been finalized and no remediation has started.** Final root-cause consolidation may merge downstream symptoms into earlier foundation repairs after Phase 19 is audited.

---

# 19. Next audit batch

```text
NEXT = PHASE 11 → PHASE 13
MODE = DEEP AUDIT ONLY
APPEND_TO_THIS_SAME_REGISTER = YES
SOURCE_CHANGES = FORBIDDEN DURING AUDIT
DB/RUNTIME_ONLY_ITEMS = TAG PENDING_GOOGLE_STUDIO
```

The next batch must audit University Platform, Scholarships, and Learning/Online Courses against their current repository contracts, while cross-checking all dependencies into Phase 7 Reference Data, Phase 8 DegreeLevel/Taxonomy, Phase 9 Tests, and Phase 10 Major identity without duplicating already-recorded root causes.


# 20. Phase 11–13 deep audit — confirmed source findings

Audit baseline remains:

```text
Repository = wegdangamil2022-oss/MANARATAK_FINAL
Branch = main
Commit = e57aad8c52a3ee6d686671870e0bf0392ba7417f
Database connected = NO
Google Studio runtime = NOT EXECUTED
Source modifications during audit = 0
```

This batch audits **Phase 11 Universities & Institutions**, **Phase 12 Scholarships**, and **Phase 13 Learning Platform / Online Courses**. Existing findings from Phase 2–10 were cross-checked to avoid recording the same upstream root cause twice.

## 20.1 Phase 11 — Universities & Institutions

### P11-PUB-001 — publication readiness still keys major/degree enforcement to stale `status=MATCHED` instead of the normalized mapping state

**Owner:** Phase 11 — Universities & Institutions  
**Type:** Publication integrity / canonical relationships  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The publication readiness policy blocks a missing Major or DegreeLevel only when an academic program has `status === 'MATCHED'`. The normalized Phase 11 contract and persistence model instead carry the authoritative mapping state in `majorMappingState` (`CANONICALLY_MAPPED | MAJOR_REVIEW_REQUIRED | UNMAPPED`), while persisted program `status` defaults independently to `DRAFT`.

A program can therefore be marked `CANONICALLY_MAPPED` while missing `majorId`, remain `DRAFT`, and evade the publication-readiness check that was intended to enforce canonical program relationships.

**Source evidence**

- `packages/domain/src/universities/UniversityPublicationReadinessPolicy.ts:18-20` — major/degree checks execute only for `program.status === 'MATCHED'`.
- `packages/domain/src/universities/UniversityReadinessContracts.ts:64-75` — the normalized contract defines `majorMappingState` as the mapping authority.
- `packages/infrastructure/src/universities/PrismaUniversityRepository.ts:527-540` — `majorMappingState` is persisted separately while program `status` defaults to `DRAFT`.
- `packages/application/src/universities/UniversityCanonicalRelationshipValidator.ts` — current canonical validation checks referenced entities but does not repair this publication-policy state mismatch.

**Impact**

A University can reach publication readiness with an academic-program relationship state that contradicts its canonical mapping claim, weakening Phase 10 Major / Phase 8 DegreeLevel integrity in public University data.

**Root cause**

The readiness policy retained an older `MATCHED` workflow field after the domain evolved to a normalized `majorMappingState` contract.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Make publication readiness consume the normalized mapping-state contract and require the canonical IDs implied by each publishable state. Reconcile existing persisted program states in Google Studio before tightening DB/runtime gates.

---

### P11-REL-002 — normalized University replacement can silently discard campus and organization-unit relationships

**Owner:** Phase 11 — Universities & Institutions  
**Type:** Data integrity / relationship preservation  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

During normalized replacement, a supplied `campusSourceReferenceId` on an organization unit is converted through `campusIds.get(...)`, and a supplied `organizationUnitSourceReferenceId` on an academic program is converted through `unitIds.get(...)`. If the source reference is not found, the code passes `undefined` and persists the row without that relationship.

This behavior is inconsistent with adjacent references in the same method: missing parent-unit references and missing program-campus references throw explicit errors.

**Source evidence**

- `packages/infrastructure/src/universities/PrismaUniversityRepository.ts:499-515` — missing organization-unit campus references are silently converted to `undefined`.
- `packages/infrastructure/src/universities/PrismaUniversityRepository.ts:527-543` — missing program organization-unit references are silently converted to `undefined`.
- `packages/infrastructure/src/universities/PrismaUniversityRepository.ts:516-524` — parent-unit references correctly fail closed.
- `packages/infrastructure/src/universities/PrismaUniversityRepository.ts:544-549` — program-campus references correctly fail closed.

**Impact**

A normalized update can report success while dropping structural University relationships, violating the project rule of **no silent relation loss** and making later reconciliation difficult.

**Root cause**

Reference resolution behavior is inconsistent across relation types inside the same normalized persistence boundary.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Fail closed whenever a non-empty source reference cannot be resolved, then add transaction-level tests proving `relations lost = 0`. Existing real rows must be inspected before any repair write.

---

### P11-IMPORT-003 — Stage 3 accepted-test change plans are structurally non-committable by the paired executor

**Owner:** Phase 11 — Universities & Institutions  
**Type:** Import contract / executor incompatibility  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The Stage 3 planner creates `ADMISSION_REQUIREMENT` changes from accepted language-test names with screening metadata, but does not provide the `academicProgramId` and `internationalTestId` required by the executor. The executor treats both as mandatory and throws when either is absent.

Therefore a valid Stage 3 handoff containing accepted tests can be planned successfully yet be impossible to commit through the source's own paired executor.

**Source evidence**

- `packages/application/src/universities/use-cases/UniversityImportChangePlan.ts:61-79` — accepted-test derived changes are created without committed canonical IDs.
- `packages/infrastructure/src/universities/PrismaUniversityImportChangeExecutorGateway.ts:202-215` — executor requires `academicProgramId` and `internationalTestId` before persistence.
- `packages/domain/src/universities/UniversityReadinessContracts.ts:77-84` — normalized admission requirement contract requires both program and International Test identity.

**Impact**

Stage 3 imports with accepted tests can reach an execution dead end, preventing reliable University enrichment and making plan-generation success misleading.

**Root cause**

The planner emits a pre-resolution representation while the executor consumes only a post-resolution canonical representation; no explicit resolution step bridges them.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Define one canonical Stage 3 transition: resolve test/program identity before executor commit or create a typed intermediate plan that cannot be executed until resolution is complete.

---

### P11-SRC-004 — University source provenance can remain attached to the wrong University identity

**Owner:** Phase 11 — Universities & Institutions  
**Type:** Provenance / permanent identity integrity  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The import executor locates a source record by `(stage, sourceArtifactId, sourceRowNumber)`. When an existing record is found, it updates source metadata but does not verify that the row still belongs to the same `universityId`, nor does it safely remap ownership.

`sourceRowNumber` is nullable while the Prisma uniqueness is defined across the same tuple. On PostgreSQL, nullable unique components do not provide a single durable identity for all null-row cases. A reused artifact/row or null-row lookup can therefore cross-bind provenance independently of the permanent `INS-*` identity.

**Source evidence**

- `packages/application/src/universities/use-cases/UniversityImportChangePlan.ts:54` — source-record changes are keyed from handoff/artifact/row provenance.
- `packages/infrastructure/src/universities/PrismaUniversityImportChangeExecutorGateway.ts:344-361` — existing source record is updated without asserting the existing `universityId` matches the planned University.
- `packages/infrastructure/prisma/schema.prisma:1088-1106` — source row number is nullable and uniqueness is based on stage/artifact/row.

**Impact**

Audit provenance can point to the wrong canonical University. This is a high-risk identity defect because later imports, reconciliation, and rollback evidence can be attributed to the wrong `INS-*` record.

**Root cause**

Source-row provenance is treated as an ownership key without a hard invariant tying it to permanent University identity.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Make provenance ownership explicit and immutable unless an audited remap operation is used. Reconcile existing source records against `INS-*` IDs in Google Studio with `IDs regenerated = 0`.

---

## 20.2 Phase 12 — Scholarships

### P12-PUB-001 — public Scholarship API accepts filters that the repository silently ignores

**Owner:** Phase 12 — Scholarships  
**Type:** Public API contract / query correctness  
**Status:** `CLOSED_AFTER_REMEDIATION`
**Severity:** **HIGH / P1**

**Problem**

The public router accepts filters including study country, degree level, funding coverage, sponsor name, and deadline range. The public use case forwards them, but the domain repository contract only models a narrow subset and `PrismaScholarshipRepository.listPublished()` applies only the publication-status predicate.

The API therefore accepts filtering parameters that do not change the result set.

**Source evidence**

- `apps/api/src/presentation/api/router/ScholarshipPublicRouter.ts:14-25` — router accepts the public filter surface.
- `packages/application/src/scholarships/use-cases/PublicScholarshipUseCases.ts` — filter object is forwarded to repository.
- `packages/domain/src/scholarships/contracts.ts:234-238` — `PublicScholarshipFilters` does not represent the full router contract.
- `packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts:253-261` — public list filters only by `publicationStatus=PUBLISHED`.

**Impact**

Users can receive materially incorrect search results while the API appears to have honored their criteria. This directly affects scholarship discovery quality.

**Root cause**

Router, domain contract, and infrastructure query evolved independently.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Freeze one public filter contract, map each field to normalized columns/relations, and add contract tests verifying each accepted filter changes the generated query/result set.

---

### P12-PUB-002 — public Scholarship DTO can reintroduce hidden or canonical fields from arbitrary `optionalFields`

**Owner:** Phase 12 — Scholarships  
**Type:** Public serialization / data trust  
**Status:** `CLOSED_AFTER_REMEDIATION`
**Severity:** **MEDIUM / P2**

**Problem**

The public use case removes internal fields from the canonical DTO, then spreads `optionalFields` back into the public object. Unlike the Course repository, Scholarship persistence has no reserved-key sanitizer; legacy compatibility starts by preserving arbitrary optional keys.

An optional key can therefore reintroduce an internal-looking field or override a mapped public value after the canonical DTO has been sanitized.

**Source evidence**

- `packages/application/src/scholarships/use-cases/PublicScholarshipUseCases.ts:31-48` — public DTO is reconstructed and then `optionalFields` are spread into it.
- `packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts:88-124` — create path accepts optional fields into legacy compatibility.
- `packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts:292-301` — `buildLegacyCompatibility()` preserves arbitrary existing optional fields.
- `packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts:264-283` — raw optional fields return through mapping.

**Impact**

Public payload semantics can be shadowed by compatibility JSON, reducing trust in canonical field ownership and potentially exposing internal metadata.

**Root cause**

Legacy compatibility JSON is treated as an unscoped extension object instead of a namespaced, reserved-key-safe compatibility envelope.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Introduce a reserved-key sanitizer/namespaced compatibility contract and ensure canonical/public fields always win during serialization. Inspect existing JSON before cleanup.

---

### P12-PUB-003 — Scholarship publication does not require VERIFIED source state or resolved canonical relationships

**Owner:** Phase 12 — Scholarships  
**Type:** Publication governance / canonical integrity  
**Status:** `CLOSED_AFTER_REMEDIATION`
**Severity:** **HIGH / P1**

**Problem**

`markReadyToPublish()` requires completeness but does not require `verificationStatus === VERIFIED`. `publish()` requires the workflow state but does not revalidate verification or unresolved canonical relationships. The same use-case class already has logic capable of calculating unresolved links, but it is not used as a publication blocker.

**Source evidence**

- `packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts:175-191` — ready/publish transitions omit verification and unresolved-link gates.
- `packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts:416-467` — unresolved canonical links are explicitly computable elsewhere in the class.
- `docs/phases/phase-12-scholarships/phase-12-01-enterprise-architecture-specification.md:240-246` — `ReadyToPublish` is complete/reviewed and imported scholarships require admin review before public publication.

**Impact**

A Scholarship can become publicly visible while source verification is still pending or country/language/degree/major/university/test relationships remain unresolved.

**Root cause**

Completeness workflow and trust/canonical-readiness workflow are modeled separately but not composed into one publication policy.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Create a single publication-readiness policy that requires completeness, reviewed/verified provenance, and zero blocking canonical resolutions before state transition.

---

### P12-DEDUP-004 — active Scholarship dedupe identity omits country and official URL required by the architecture

**Owner:** Phase 12 — Scholarships  
**Type:** Deduplication / canonical identity  
**Status:** `CLOSED_AFTER_REMEDIATION`
**Severity:** **HIGH / P1**

**Problem**

The active duplicate key is generated from provider, cleaned scholarship name, and year/intake. The approved Phase 12 architecture explicitly requires matching to include country and official URL when available.

Distinct opportunities with the same provider/name/year can therefore collapse into the same duplicate identity even when country or official source distinguishes them.

**Source evidence**

- `docs/phases/phase-12-scholarships/phase-12-01-enterprise-architecture-specification.md:238-239` — canonical dedupe must consider name + sponsor/provider + year/intake + country + official URL if available.
- `packages/domain/src/scholarships/scholarships.ts:362-383` — current duplicate key omits country and official URL.
- `packages/application/src/scholarships/import-center/ScholarshipImportAtomicTransferUseCase.ts:285-294` — active transfer path uses that key.

**Impact**

Valid distinct scholarships can be incorrectly merged or forced into conflict review, threatening data identity and source lineage.

**Root cause**

The implemented dedupe key is a reduced earlier contract that was not updated with the final Phase 12 architecture.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Define a backward-compatible dedupe-v2 strategy and perform a read-only collision analysis in Google Studio before changing any keys or merges.

---

### P12-DEC-005 — durable verification/canonical decisions are visible to Import Center but ignored by the atomic transfer gate

**Owner:** Phase 12 — Scholarships  
**Type:** Import workflow / decision persistence  
**Status:** `CLOSED_AFTER_REMEDIATION`
**Severity:** **HIGH / P1**

**Problem**

Admin verification and canonical-resolution decisions are persisted through dedicated decision ports and consumed by Import Center views. The atomic transfer use case does not inject or read those decision ports; instead it evaluates verification and canonical screening only from raw payload metadata.

This creates two conflicting sources of truth: an administrator can resolve a record in the durable decision layer while transfer continues to reject it using stale raw state.

**Source evidence**

- `packages/application/src/scholarships/import-center/ScholarshipImportDecisionUseCases.ts:19-40` — decisions are durably recorded.
- `packages/infrastructure/src/scholarships/PrismaScholarshipImportDecisionPorts.ts` — Prisma decision persistence exists.
- `packages/application/src/scholarships/import-center/ScholarshipImportCenterUseCases.ts:407-412` and `486-516` — Import Center consumes latest verification/canonical decisions.
- `packages/application/src/scholarships/import-center/ScholarshipImportAtomicTransferUseCase.ts:242-283` — transfer gates only on raw-payload helpers.

**Impact**

Reviewed imports can remain untransferable, while UI/admin state and execution state disagree. Operators can repeatedly approve a record without affecting the actual promotion gate.

**Root cause**

The decision subsystem was integrated into review/read flow but not into the write-side transfer decision boundary.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Make transfer consume one authoritative resolved decision snapshot and record the exact decision IDs/version used in the transfer audit trail.

---

### P12-HANDOFF-006 — atomic transfer ignores canonical screening stored in the canonical `_domainHandoff`

**Owner:** Phase 12 — Scholarships  
**Type:** Import handoff / pipeline integration  
**Status:** `CLOSED_AFTER_REMEDIATION`
**Severity:** **HIGH / P1**

**Problem**

The generic Import Foundation persists domain handoff under `_domainHandoff`, and the Scholarship handoff places canonical screening there. Scholarship Import Center and decision code understand this location. The transfer helper looks only at `metadata.canonicalScreening` or a raw `_canonicalScreening` field.

A correctly persisted domain handoff can therefore be invisible to the transfer gate and generate a false `SCHOLARSHIP_IMPORT_CANONICAL_SCREENING_REQUIRED` failure.

**Source evidence**

- `packages/application/src/import-foundation/use-cases/ImportAdminUseCases.ts:124` — domain handoff is persisted as `_domainHandoff`.
- `packages/application/src/scholarships/handoff/ScholarshipImportHandoffService.ts:52-88` — Scholarship handoff includes canonical screening.
- `packages/application/src/scholarships/import-center/ScholarshipImportCenterUseCases.ts:365,486-490` — Import Center reads `_domainHandoff`.
- `packages/application/src/scholarships/import-center/ScholarshipImportDecisionUseCases.ts:51-54` — decision logic also understands `_domainHandoff`.
- `packages/application/src/scholarships/import-center/ScholarshipImportAtomicTransferUseCase.ts:652-679` — transfer screening helpers do not read that canonical location.

**Impact**

Valid import records can be blocked despite having completed the intended handoff screening, breaking Phase 6→12 integration.

**Root cause**

Multiple historical canonical-screening storage shapes coexist without a single normalized reader used across all workflow stages.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Centralize screening extraction in one typed adapter and migrate/compatibly read historical payload shapes before deleting legacy support.

---

### P12-ADM-007 — admin country filtering still queries legacy compatibility JSON instead of the normalized canonical country reference

**Owner:** Phase 12 — Scholarships  
**Type:** Admin query correctness / normalization  
**Status:** `CLOSED_AFTER_REMEDIATION`
**Severity:** **MEDIUM / P2**

**Problem**

The repository's admin `country` filter targets legacy `optionalFields.studyCountry` even though normalized country reference/source-label/scope fields are persisted on the Scholarship model.

**Source evidence**

- `packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts:222-231` — country filtering uses legacy optional JSON.
- `packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts` create/update mapping — normalized country reference fields are already persisted separately.

**Impact**

Canonical records can be omitted or misclassified in admin searches depending on whether legacy compatibility JSON happens to contain the old text field.

**Root cause**

A legacy query path survived normalized Phase 12 persistence work.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Move filtering to canonical country identity, preserving an explicit compatibility fallback only if required during migration and measuring legacy-row coverage before removal.

---

### P12-ARCH-008 — required Scholarship versioning, Sponsor context, and Application Cycle architecture is absent from the active persistence/domain model

**Owner:** Phase 12 — Scholarships  
**Type:** Architecture completeness / historical integrity  
**Status:** `CLOSED_AFTER_REMEDIATION`
**Severity:** **HIGH / P1**

**Problem**

The approved architecture makes Scholarship Version, Sponsor, independently versioned Eligibility Rules, and Application Cycle first-class owned concepts and explicitly forbids overwriting historical structural state. The current Prisma model contains the Scholarship root and several child tables but no ScholarshipVersion, Sponsor, or ApplicationCycle model. Repository updates mutate the current root/children in place.

**Source evidence**

- `docs/phases/phase-12-scholarships/phase-12-01-enterprise-architecture-specification.md:75-95` — required owned hierarchy includes Scholarship Version, Sponsor, Eligibility Rule, Award Package, and Application Cycle.
- `...:145-162` — eligibility must be independently versioned and cycles are Phase 12-owned.
- `...:314-328` — structural changes must generate new versions; historical records must never be overwritten; A/B/C traceability forbids omitting required entities.
- `packages/infrastructure/prisma/schema.prisma:1192-1420` — current Phase 12 schema has Scholarship plus benefit/targets/eligibility/document/evidence/university-link models, but no ScholarshipVersion, Sponsor, or ApplicationCycle.
- `packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts` — update path replaces current structural state in place.

**Impact**

Eligibility/funding/cycle history cannot be represented according to the approved architecture, undermining temporal auditability and future change tracking.

**Root cause**

The implementation closed a practical import/publication slice without implementing the architecture's mandatory versioned aggregate model.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Do not retrofit versions blindly. First define an ARB-approved migration from current canonical Scholarship IDs to versioned children, then backfill in Google Studio without regenerating public/canonical IDs.

---

## 20.3 Phase 13 — Learning Platform / Online Courses

### P13-API-001 — enrollment, progress, quiz-attempt, and completion use cases are wired in DI but have no active API route

**Owner:** Phase 13 — Learning Platform  
**Type:** Runtime reachability / implementation completeness  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

`CourseProgressUseCases` is constructed in the API container, but there is no router consuming `courseProgressUseCases`. The active app mounts Course admin/public/imported routers, not a learner progress/enrollment router.

**Source evidence**

- `apps/api/src/infrastructure/di/container.ts:8299` — `courseProgressUseCases` is registered.
- Repository-wide source search finds no consumer of that registration outside DI.
- `apps/api/src/app.ts:372-390` — Course API composition mounts admin/public paths but no learner Course-progress route.
- `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md:104,121-124,157-158` — enrollment, progress, assessments and completion are core owned runtime capabilities.

**Impact**

A substantial Phase 13 learner capability exists only as internal source code and cannot be exercised by the application through its normal API composition.

**Root cause**

Domain/application implementation progressed further than presentation-layer integration.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Define authenticated learner routes only after the underlying authorization/integrity findings below are fixed; do not expose the current use cases unchanged.

---

### P13-PUB-002 — generic Course lifecycle endpoints bypass imported-course source/link publication gates

**Owner:** Phase 13 — Learning Platform  
**Type:** Publication security / route bypass  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The specialized imported-course lifecycle verifies approved provider/domain and a verified link before ready/publish. The generic `/admin/courses` router delegates all non-native courses—including `EXTERNAL_LINKED_COURSE`—to generic `AdminCourseUseCases`, whose ready/publish transitions enforce completeness/state only.

An authorized admin can therefore use the generic endpoint for the same imported course and bypass the stronger source/link publication policy.

**Source evidence**

- `packages/application/src/courses/use-cases/ImportedCourseAdminUseCases.ts:127-140` — specialized ready/publish verifies source and link.
- `apps/api/src/presentation/api/router/CourseAdminRouter.ts:390-401` — native courses use native policy; other origins fall through to generic admin lifecycle.
- `packages/application/src/courses/use-cases/AdminCourseUseCases.ts:91-105` — generic ready/publish lacks imported provider/link verification.

**Impact**

Broken, unverified, or untrusted external links can be published by taking a weaker route to the same aggregate.

**Root cause**

Security/readiness policy is enforced at one presentation path instead of at the authoritative domain/application transition.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Move origin-specific publication readiness below the router so every transition to `READY_TO_PUBLISH/PUBLISHED` uses the same authoritative policy.

---

### P13-LINK-003 — `VERIFIED_DIRECT` proves network health and approved domain, not that the URL is a direct course page

**Owner:** Phase 13 — Learning Platform  
**Type:** External-link validation / import quality  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

`SafeImportedCourseLinkChecker` verifies HTTPS, approved domain, DNS/public-network safety, redirect behavior, and 2xx status. Any successful approved-domain page becomes `VERIFIED_DIRECT` (or `REDIRECTED_VALID`). It contains no semantic/path check that the page is an actual course detail page, despite the contract having a `NOT_DIRECT_COURSE_PAGE` concept and Phase 13 explicitly requiring deep links rather than homepages.

**Source evidence**

- `packages/infrastructure/src/courses/SafeImportedCourseLinkChecker.ts:43-127` — successful 2xx is accepted without course-page semantics.
- `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md:486,511,542,592,663` — imported links must point to a specific course page, not provider root/homepage.
- `docs/phases/phase-13-learning-platform/phase-13-03-implementation-guide.md:415-416` — implementation guide explicitly calls for deep-URL validation and rejects generic homepages.

**Impact**

A provider homepage/catalog page can satisfy the current verifier and become publication-eligible, violating one of the project's strongest Course import rules.

**Root cause**

SSRF/network verification was implemented, but direct-course-page semantic validation was not.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Preserve the strong network safety controls and add provider-aware deep-link policy/adapter validation with explicit `NOT_DIRECT_COURSE_PAGE` results.

---

### P13-URL-004 — generic Course PATCH can change an imported course URL outside the controlled source-lineage workflow

**Owner:** Phase 13 — Learning Platform  
**Type:** Provenance / URL history integrity  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The specialized imported-course use case correctly forbids direct URL mutation and requires URL evolution to go through the identity/diff → import coordinator path so identity, URL history, provenance and canonical record change together. The generic Course admin PATCH accepts `directCourseUrl` and the generic update use case permits changing it for external courses.

**Source evidence**

- `packages/application/src/courses/use-cases/ImportedCourseAdminUseCases.ts:48-57` — direct URL changes are explicitly forbidden outside controlled import.
- `apps/api/src/presentation/api/router/CourseAdminRouter.ts` — generic update payload accepts `directCourseUrl`.
- `packages/application/src/courses/use-cases/AdminCourseUseCases.ts:29-79` — generic update can persist the new URL and only forbids origin-type mutation.

**Impact**

An imported URL can change without a corresponding `CourseSourceUrlHistory`/provenance transition, breaking auditability and replay assumptions.

**Root cause**

Lineage protection exists in a specialized façade rather than in the aggregate/update boundary.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Reject lineage-owned fields in the generic update path for external imports and route all such changes through the controlled coordinator.

---

### P13-ELIG-005 — imported external courses can be reclassified as paid/non-free yet still become public through the free-course publication path

**Owner:** Phase 13 — Learning Platform  
**Type:** Catalog eligibility / publication integrity  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Imported admin update accepts `accessType` and free-study/free-certificate flags. The generic admin completeness path explicitly treats `PAID` / `PAID_COURSE` as complete when minimal metadata exists, whereas the domain `CourseCompletenessClassifier` rejects paid external records from the free import path. The specialized publish gate verifies provider/link but does not reassert free-catalog eligibility.

**Source evidence**

- `apps/api/src/presentation/api/router/ImportedCourseAdminRouter.ts` — imported update surface includes access/free fields.
- `packages/application/src/courses/use-cases/ImportedCourseAdminUseCases.ts:36-65` — update delegates to generic Course admin logic without a free-eligibility invariant.
- `packages/application/src/courses/use-cases/AdminCourseUseCases.ts:51-59` — paid access/origin can be classified complete.
- `packages/domain/src/courses/services/CourseCompletenessClassifier.ts:23-30` — domain classifier rejects paid external free-import records.
- `packages/infrastructure/src/courses/PrismaCourseRepository.ts:304+` — public list requires `PUBLISHED` but does not default-filter paid/non-free records.
- `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md:506,561` — paid external courses are excluded from the Global Free Courses import path absent a separate approved catalog decision.

**Impact**

The free Global Courses catalog can contain a paid/non-free external record despite the approved import policy.

**Root cause**

Two completeness/eligibility implementations disagree, and publication does not reassert the authoritative catalog policy.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Unify completeness/eligibility classification and make catalog eligibility a publication invariant, not an editable metadata convention.

---

### P13-CURR-006 — curriculum creation/list operations do not enforce same-course ownership of referenced child entities

**Owner:** Phase 13 — Learning Platform  
**Type:** Authorization/data integrity / cross-aggregate references  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Curriculum use cases ensure that the target Course is mutable but do not consistently verify that referenced module, lesson, quiz, or question-bank IDs belong to that same Course before creating/listing child records. Prisma stores separate FKs for `courseId` and those child IDs, without a compound ownership FK tying them together.

**Source evidence**

- `packages/application/src/courses/use-cases/CourseCurriculumUseCases.ts:117-120` — `createLesson` does not verify module ownership.
- `...:182-185` — `createQuiz` does not verify module/lesson ownership.
- `...:231-234` — `createQuestion` does not verify quiz/question-bank ownership.
- Related list operations likewise accept child IDs without consistently proving same-Course ownership.
- `packages/infrastructure/src/courses/PrismaCourseCurriculumRepository.ts:64-68,130-135,173-188` — referenced IDs are persisted directly.
- `packages/infrastructure/prisma/schema.prisma:245-376` — child FKs exist independently but no compound FK enforces matching Course ownership.

**Impact**

The source permits structurally inconsistent cross-course curriculum graphs and can return another Course's children when a mismatched child ID is supplied.

**Root cause**

Entity existence and Course mutability are checked, but aggregate ownership is not treated as a first-class invariant.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Add explicit same-Course ownership assertions in application/domain policy and, where practical, reinforce them through schema/index design.

---

### P13-PROG-007 — progress and quiz-attempt records can cross-bind to foreign Course children and distort completion

**Owner:** Phase 13 — Learning Platform  
**Type:** Learner progress integrity  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

`markLessonProgress()` validates Course/enrollment but not that `lessonId` belongs to the Course. `startQuizAttempt()` similarly does not verify that `quizId` belongs to the Course. The schema persists independent `courseId` + `lessonId` / `quizId` FKs. Progress recomputation counts completed progress rows for the Course/student but does not intersect them with the Course's actual lesson identities.

**Source evidence**

- `packages/application/src/courses/use-cases/CourseProgressUseCases.ts:36-50` — percentage recomputation counts persisted completed progress rows against trackable lesson count.
- `...:64-79` — lesson progress lacks lesson-to-Course ownership check.
- `...:88-95` — quiz attempt lacks quiz-to-Course ownership check.
- `packages/infrastructure/prisma/schema.prisma:396-439` — progress/attempt models hold independent Course and child FKs.

**Impact**

Foreign lesson/quiz identities can be recorded against another Course and can inflate or corrupt learner progress/completion state.

**Root cause**

Progress records trust caller-supplied Course/child pairings instead of deriving or validating ownership from canonical curriculum.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Resolve Course ownership from the canonical child record before persistence and calculate completion from canonical curriculum membership, not arbitrary progress row count.

---

### P13-ASMT-008 — Course completion ignores passing-assessment criteria and quiz score/pass state is caller-controlled

**Owner:** Phase 13 — Learning Platform  
**Type:** Assessment integrity / completion policy  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The completion use case requires progress percentage to reach 100 but does not evaluate required quizzes/assessments or passing grades. Quiz submission delegates a DTO containing `score` and `passed` directly to persistence rather than calculating authoritative grading from stored questions/answers.

**Source evidence**

- `packages/application/src/courses/use-cases/CourseProgressUseCases.ts:97-141` — quiz submission and completion contain no authoritative grading/completion-criteria evaluation.
- `packages/domain/src/courses/CourseProgress.ts` — submission DTO carries score/pass state.
- `packages/infrastructure/src/courses/PrismaCourseProgressRepository.ts:130-142` — caller-provided score/pass values are persisted.
- `docs/phases/phase-13-learning-platform/phase-13-03-implementation-guide.md:442` — completion policy is defined as 100% progress **and passing grades**.
- `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md:121-124` — Phase 13 owns secure assessment/grading and authoritative completion.

**Impact**

A learner can be marked complete despite failing or never attempting required assessments, and assessment truth is not derived from authoritative grading logic.

**Root cause**

The current source implements telemetry persistence but not the architecture's assessment/grading policy engine.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Separate answer submission from grading output, calculate score/pass server-side, and make Course completion consume a versioned completion policy.

---

### P13-EVT-009 — Course completion persistence and `CourseCompleted` event publication are a non-atomic dual write

**Owner:** Phase 13 — Learning Platform  
**Type:** Event integrity / transactional outbox  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The use case first persists Course completion and only afterward publishes/registers the enterprise completion event. If event publication fails after the DB write, a retry finds the existing completion and returns early without republishing, creating a durable lost-event state.

This is distinct from the previously recorded Phase 5 Event Foundation issue: even with a durable event gateway, the Phase 13 Course completion write is not bound to the same transaction/outbox operation.

**Source evidence**

- `packages/application/src/courses/use-cases/CourseProgressUseCases.ts:101-141` — existing completion short-circuits; new completion is persisted before event publisher call.
- `packages/infrastructure/src/courses/PrismaCourseProgressRepository.ts:157-174` — completion persistence is its own DB operation.
- `packages/application/src/courses/gateways/EnterpriseCourseCompletionEventPublisher.ts:13-39` — event is registered/published afterward.
- `packages/application/src/event-foundation/use-cases/ManageEnterpriseEventsUseCase.ts:27-75` — event registration/publish is a separate boundary.
- `docs/phases/phase-13-learning-platform/phase-13-03-implementation-guide.md:291,442` — Course events/completion must use the Enterprise Transactional Outbox in the same PostgreSQL transaction.

**Impact**

Downstream student/certificate/projection consumers can permanently miss a legitimate Course completion.

**Root cause**

Completion and event publication were composed sequentially rather than as one atomic domain mutation + outbox commit.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Use the shared atomic mutation/outbox boundary and make completion idempotency include event registration state so retry cannot suppress a missing event.

---

### P13-VERS-010 — mandatory Course/question versioning and historical immutability have no persistence model

**Owner:** Phase 13 — Learning Platform  
**Type:** Architecture completeness / historical integrity  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The Phase 13 architecture explicitly defines Courses & Course Versions, version-controlled educational assets, versioned/auditable question-bank behavior, and immutable historical state. The active Prisma schema has Course/curriculum/question records but no CourseVersion or question-version model; repository updates mutate those records in place.

**Source evidence**

- `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md:41,686` — version-controlled repository and `Courses & Course Versions` are mandatory.
- `...:197` — significant state changes are required to generate immutable audit events.
- `docs/phases/phase-13-learning-platform/phase-13-03-implementation-guide.md` — domain layout/architecture assumes versioned and auditable learning content.
- `packages/infrastructure/prisma/schema.prisma:168-376` — Course/curriculum/question models exist, but no CourseVersion or question-version model.
- `packages/infrastructure/src/courses/PrismaCourseRepository.ts` and `PrismaCourseCurriculumRepository.ts` — update paths mutate current records in place.

**Impact**

Historical curriculum/assessment state cannot be reconstructed reliably after edits, undermining auditability and reproducible learner outcomes.

**Root cause**

The operational Course slice was implemented without the architecture's temporal/version aggregate.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Design version ownership and migration only after current production-like data is inspected. Preserve canonical Course IDs while backfilling an initial immutable version in Google Studio.

---

### P13-PUBEVT-011 — Course publication changes status but emits no authoritative `CoursePublished` integration event

**Owner:** Phase 13 — Learning Platform  
**Type:** Event contract / read-model integration  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The architecture makes `CoursePublished` a critical domain event and states that public/read models are populated asynchronously from enterprise events. Current generic/native publication transitions update status but no source implementation emits `CoursePublished` or writes a publication outbox event.

**Source evidence**

- Repository source search for `CoursePublished` / `COURSE_PUBLISHED` returns architecture documentation but no Phase 13 publication implementation.
- `packages/application/src/courses/use-cases/AdminCourseUseCases.ts:99+` — generic publish updates status.
- `packages/application/src/courses/use-cases/NativeCourseUseCases.ts:220+` — native publish updates status/readiness but has no CoursePublished event.
- `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md:197,742` — CoursePublished is part of the event catalog and read models are event-driven.
- `docs/phases/phase-13-learning-platform/phase-13-03-implementation-guide.md:291` — Course aggregate events must be written to the transactional outbox.

**Impact**

Event-driven indexes/read models/downstream consumers have no authoritative publication signal, creating divergence between canonical Course status and projections.

**Root cause**

Publication workflow was implemented as a repository status transition without the declared integration-event boundary.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Emit publication/archive lifecycle events inside the same atomic mutation/outbox transaction as the status transition.

---

### P13-ENR-012 — enrollment policy does not enforce publication, prerequisites, capacity, eligibility, or paid-course financial clearance

**Owner:** Phase 13 — Learning Platform  
**Type:** Enrollment policy / business integrity  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The learner progress use case only rejects externally linked courses from local tracking. Enrollment otherwise immediately upserts an enrollment after checking that the Course is trackable. It does not require the Course to be published/active and implements none of the declared prerequisite, capacity, eligibility, or financial-clearance rules.

**Source evidence**

- `packages/application/src/courses/use-cases/CourseProgressUseCases.ts:27-34` — trackability check only excludes external linked Course origin.
- `...:54-61` — enrollment immediately persists after that narrow check.
- `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md:104,121` — Phase 13 owns enrollment state and transactional enrollment processing.
- Phase 13 enrollment architecture requires validation of capacities, prerequisites, eligibility and financial clearance before enrollment.

**Impact**

If/when the learner API is exposed, source policy permits enrollment into draft/archived native offerings and paid offerings without authoritative finance clearance.

**Root cause**

The current enrollment code is a persistence skeleton, not the architecture's policy-driven enrollment aggregate.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Implement a centralized enrollment eligibility policy before exposing routes, consuming Phase 19 payment/clearance contracts rather than duplicating finance state.

---

### P13-SCOPE-013 — Learning Path exists as an event contract but not as an owned aggregate/runtime capability

**Owner:** Phase 13 — Learning Platform  
**Type:** Architecture completeness / orphaned contract  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The architecture makes Learning Paths a core Phase 13 capability with sequencing, prerequisites, progression and `LearningPathCompleted`. The source exports `LearningPathCompletedEvent`, but there is no LearningPath entity/model/repository/use case or persistence schema implementing path definition and progression.

**Source evidence**

- `packages/domain/src/courses/events/LearningPathCompletedEvent.ts` — completion event contract exists.
- Repository source search finds no corresponding LearningPath aggregate/repository/use-case/schema model.
- `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md:152,389` — Phase 13 owns learning-path sequencing/progression and completion signaling.
- `docs/phases/phase-13-learning-platform/phase-13-03-implementation-guide.md:12,38` — LearningPath is described as a core LMS aggregate.

**Impact**

One of the declared Phase 13 sovereign capabilities cannot be represented or executed, while downstream event contracts imply that it exists.

**Root cause**

The event/API architecture was documented ahead of aggregate implementation.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Treat Learning Path as an explicit remaining Phase 13 implementation slice, with versioning/progression/event semantics defined before runtime closure.

---

# 21. Phase 11–13 runtime/DB evidence register — not source defects yet

These items are deferred to the Google Studio runtime phase and are **not** included in the 25 confirmed source findings above.

| Runtime ID | Owner | Status | Evidence required in Google Studio | DB mutation required? |
|---|---|---|---|---|
| RT-P11-REL-001 | Phase 11 normalized relationships | `PENDING_GOOGLE_STUDIO` | Inspect organization-unit/campus/program rows for supplied source refs that resolved to null; establish zero silent relation loss before/after repair | Read-only first; controlled repair after backup gate |
| RT-P11-SRC-001 | Phase 11 provenance | `PENDING_GOOGLE_STUDIO` | Reconcile `UniversitySourceRecord` ownership against stage/artifact/row and permanent `INS-*` identity; prove `IDs regenerated = 0` | Read-only first; remap only by approved plan |
| RT-P11-PUB-001 | Phase 11 publication | `PENDING_GOOGLE_STUDIO` | Inspect READY/PUBLISHED programs where mapping state and Major/DegreeLevel links disagree | Read-only first |
| RT-P12-DEDUP-001 | Phase 12 dedupe | `PENDING_GOOGLE_STUDIO` | Detect existing collisions where provider/name/year match but country/official URL distinguish opportunities | Read-only analysis first |
| RT-P12-PUB-001 | Phase 12 publication | `PENDING_GOOGLE_STUDIO` | Count READY/PUBLISHED scholarships with non-VERIFIED source state or unresolved canonical links | Read-only first |
| RT-P12-DEC-001 | Phase 12 import decisions | `PENDING_GOOGLE_STUDIO` | End-to-end handoff → durable decision → transfer replay proof after source repair | Controlled pilot writes after backup/recovery gate |
| RT-P13-IMPORT-001 | Phase 13 imported courses | `PENDING_GOOGLE_STUDIO` | Audit published imported records for paid/non-free state, unverified links, generic provider homepages, and lineage gaps | Read-only first |
| RT-P13-EVT-001 | Phase 13 completion events | `PENDING_GOOGLE_STUDIO` | Failure injection between completion and outbox/event; prove idempotent replay with exactly one authoritative event after repair | Controlled runtime test |
| RT-P13-PROG-001 | Phase 13 progress | `PENDING_GOOGLE_STUDIO` | Inspect/attempt cross-course lesson/quiz pairings and prove repaired ownership/completion constraints | Controlled test data only |
| RT-P13-VERS-001 | Phase 13 version migration | `PENDING_GOOGLE_STUDIO` | If version schema is approved, backfill initial Course/content versions without changing canonical/public IDs or losing relationships | Migration/backfill only after full gates |

All previously recorded Phase 2–10 Google Studio runtime items remain active.

---

# 22. Historical / overlapping concerns re-verified during Phase 11–13

The following were deliberately **not** added as duplicate findings:

- Phase 11 canonical lifecycle-state enforcement overlaps previously recorded Phase 8–10 canonical lifecycle/reference findings. Phase 11 findings above are limited to unique publication/relationship/provenance defects.
- The old Phase 12 Fellowship resolver problem was rechecked against current source and is not reopened here; the current resolver supports the evolved Major/Fellowship identity path.
- A legacy Scholarship promotion path contains older assumptions, but it is not the active composed transfer path; only defects proven in the current Import Center / atomic transfer path were counted.
- Phase 13 Course `optionalFields` does **not** repeat the Phase 9 shadowing defect: `PrismaCourseRepository` has a reserved-key sanitizer and maps canonical fields independently.
- Phase 13 completion-event failure is related to the earlier `P5-EVT-004` Event Foundation durability issue, but `P13-EVT-009` is a separate Phase 13 dual-write defect that would remain unsafe even after replacing the in-memory publisher unless completion and outbox become one transaction.
- Learner progress/enrollment defects are source-level latent risks at this baseline because the API currently does not expose `courseProgressUseCases`; they are not claimed as a currently reachable unauthenticated exploit.
- No live PostgreSQL state, migrations, backfills, row counts, or concurrency behavior were assumed. Those remain explicitly deferred to Google Studio.

---

# 23. Phase 11–13 positive controls observed

Controls to preserve during remediation:

- Phase 11 maintains permanent `INS-*` University source identity and prevents later import stages from silently creating a missing University when identity resolution is available.
- Phase 11 normalized persistence correctly fails closed for missing parent-organization references and program-campus references; the repair should extend this behavior consistently rather than replace the model.
- Phase 11 admin normalized replacement invokes canonical relationship validation before write.
- Phase 12 atomic Scholarship transfer is transaction-oriented, audit/outbox aware, does not auto-publish, and locks published/archived merge targets.
- Phase 12 has dedicated durable verification and canonical decision persistence; the missing piece is consuming those decisions consistently at transfer/publication boundaries.
- Phase 12 canonical-resolution logic verifies existing upstream entities rather than inventing Country/Major/University/Test identities.
- Phase 13 `PrismaCourseRepository` sanitizes reserved optional-field keys, avoiding canonical-field shadowing in Course DTOs.
- Phase 13 imported-course coordinator/source models include source identity, URL history, provenance and atomic import concepts; the generic update bypass must be closed without removing those controls.
- `SafeImportedCourseLinkChecker` implements strong HTTPS/domain/DNS/public-network/redirect protections; only semantic direct-course validation is missing.
- Phase 13 blocks external linked courses from native learner progress tracking, preserving the boundary that external Global Courses are redirects rather than hosted LMS content.
- Phase 13 curriculum mutations block native content changes after `PUBLISHED/ARCHIVED`; future versioning should preserve this immutability intent.
- Phase 13 EAP/asset integration uses managed asset handles rather than trusting arbitrary external learning-material URLs.

---

# 24. Batch verdict — Phase 11–13

```text
PHASE_11_TO_13_DEEP_AUDIT = COMPLETE
SOURCE_MODIFICATIONS = 0
DATABASE_CONNECTED = NO
MIGRATIONS_APPLIED = 0
GOOGLE_STUDIO_RUNTIME_EXECUTED = NO
NEW_CONFIRMED_OPEN_FINDINGS = 25
CUMULATIVE_CONFIRMED_OPEN_FINDINGS = 77
CRITICAL_NEW = 0
HIGH_NEW = 23
MEDIUM_NEW = 2
LOW_NEW = 0
RUNTIME_DEFERRED_ITEMS_NEW = 10
```

Current cumulative source finding totals after Phase 2–13:

```text
CRITICAL = 5
HIGH = 51
MEDIUM = 20
LOW = 1
TOTAL = 77
```

The register remains in **audit discovery order**. No remediation priority has been finalized and no code/ZIP/database modification has begun. After Phase 19, the complete register will be consolidated and globally reordered by root cause, dependency order, severity, blast radius and runtime safety before implementation starts.

---

# 25. Next audit batch

```text
NEXT = PHASE 14 → PHASE 16
MODE = DEEP AUDIT ONLY
APPEND_TO_THIS_SAME_REGISTER = YES
SOURCE_CHANGES = FORBIDDEN DURING AUDIT
DB/RUNTIME_ONLY_ITEMS = TAG PENDING_GOOGLE_STUDIO
```

The next batch must audit Certificates/Verification, Student/Application ownership where applicable, and CMS/adjacent Phase 14–16 responsibilities according to the **actual repository phase definitions at this baseline**, not by stale roadmap naming. Cross-phase dependencies into Phase 11 University, Phase 12 Scholarships, Phase 13 Learning, Phase 5 Event/Asset foundations, and Phase 19 Finance must be referenced without duplicating previously recorded root causes.

---

# 26. Phase 14–16 deep audit — confirmed source findings

**Audit baseline:** `e57aad8c52a3ee6d686671870e0bf0392ba7417f` (`Complete Phase 19 enterprise finance platform`)  
**Mode:** source-only deep audit  
**Database:** not connected  
**Migrations:** not applied  
**Google Studio runtime:** not executed  
**Project source modifications during this batch:** `0`

The audit used the current repository source and the Phase 14/15/16 architecture, domain-contract, implementation-guide, source-closure, and Google Studio runbook documents. Runtime-only activation work explicitly deferred by those runbooks is listed separately in Section 27 and is **not** counted as a confirmed source defect unless the current source itself contradicts or makes the declared contract impossible.

## CRITICAL / P0

### P14-CRYPTO-001 — the certificate signature/hash does not seal issuer, validity, certificate type, or expiration semantics

**Owner:** Phase 14 — Enterprise Certificates Platform  
**Type:** CRYPTOGRAPHIC INTEGRITY / IMMUTABILITY / PUBLIC VERIFICATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL / P0**

**Problem**

Phase 14 claims cryptographic immutability of the credential, including issuing authority and validity policy. The current issuance path hashes only a small `sealed` object containing learner/course/completion/template/grade/skills data. `certificateType`, `issuerName`, `issuerReferenceId`, `validityPolicy`, and `expiresAt` are persisted outside that sealed payload.

Public verification recalculates only the same partial `sealed` payload and then returns the unsealed issuer/type/expiration fields as trusted certificate data. Therefore a database-side corruption, accidental update, or unauthorized mutation of those core fields can leave `integrityVerified === true` while the externally displayed credential semantics have changed.

**Source evidence**

- `docs/phases/phase-14-enterprise-certificates-platform/phase-14-01-enterprise-architecture-specification.md:149-158` — issuer is a verified first-class authority with cryptographic identity.
- same file `:238-240` — validity policy and calculated expiration date must become part of the signed metadata hash.
- same file `:348-352` — the credential hash is the core immutability control and must include issuing authority.
- `packages/application/src/certificates/use-cases/CertificateUseCases.ts:116-129` — current `sealed` payload omits issuer, certificate type, validity policy, and expiration.
- same file `:130-155` — those omitted values are persisted on the certificate separately.
- same file `:168-206` — public verification validates only `metadata.sealed` + current signature, then returns the unsealed issuer/type/expiry values.

**Impact**

The platform can report a certificate as cryptographically intact while material legal/academic semantics are no longer the values originally signed. This defeats the primary trust property of Phase 14.

**Root cause**

The source implemented a partial metadata digest rather than one canonical signed credential envelope.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Define one immutable signed payload containing every trust-bearing credential field, canonicalize it deterministically, version the signature schema, and verify public output exclusively against that sealed representation. Preserve the runtime KMS work for Google Studio as a separate activation task.

---

## HIGH / P1

### P14-ISSUE-002 — a privileged HTTP caller can synthesize a CourseCompleted receipt and issue an initial certificate without the authoritative completion event

**Owner:** Phase 14 — Certificate Issuance  
**Type:** AUTHORITY BOUNDARY / EVENT INTEGRITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The Phase 14 architecture explicitly forbids issuance without a direct completion-event trigger. The active Admin API exposes `POST /admin/certificates/course-completions/issue`, accepts `courseId`, `studentReferenceId`, `completionId`, `completedAt`, and `eligibleForCertificate` directly from the request body, and passes them to the issuance use case as though they were an authoritative Phase 13 completion receipt.

The route is admin-protected, but broad administrative permission is not equivalent to the upstream pedagogical event authority specified by Phase 14.

**Source evidence**

- `phase-14-01-enterprise-architecture-specification.md:73-80` — issuance occurs exclusively when upstream domains broadcast completion events.
- same file `:294-311` — the platform cannot issue without a direct event trigger from an authorized pedagogical domain.
- `apps/api/src/app.ts:379` — Certificate Admin router is mounted under broad `admin:certificates:manage`.
- `apps/api/src/presentation/api/router/CertificateAdminRouter.ts:99-128` — HTTP body constructs the completion command and invokes `issueFromCourseCompletion()`.

**Impact**

A privileged operational/API path can create an academically valid-looking certificate from caller-supplied completion facts without proving that Phase 13 produced the completion event.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Separate operational inspection/replay from authoritative issuance. Production issuance should consume a durable, authenticated completion envelope; any manual replay must reference an existing immutable event/inbox record rather than recreate completion facts from request JSON.

---

### P14-PATH-003 — LearningPathCompleted is declared as a Phase 14 issuance trigger but the source has no learning-path issuance contract

**Owner:** Phase 14 — Certificate Issuance  
**Type:** CONTRACT GAP / CROSS-PHASE INTEGRATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The architecture and domain contracts require Phase 14 to consume both `CourseCompleted` and `LearningPathCompleted`. The current application contract extends only `CourseCompletedEventPayload`; the persisted certificate requires course-specific fields (`courseId`, `courseCompletionId`, `courseDisplayName`), and the source contains no `issueFromLearningPathCompletion` equivalent.

This is not merely an unstarted runtime subscription: there is no source command/persistence path capable of consuming the second mandatory event type once the Google Studio worker is connected.

**Source evidence**

- `phase-14-01-enterprise-architecture-specification.md:23,46,73` — both completion-event types are mandatory triggers.
- `phase-14-02-domain-contracts.md:254-256` — explicitly consumes `CourseCompleted` and `LearningPathCompleted`.
- `packages/application/src/certificates/use-cases/CertificateUseCases.ts:17-26` — issuance command extends only `CourseCompletedEventPayload`.
- same file `:87-166` — only course completion issuance exists.
- `packages/infrastructure/prisma/schema.prisma:495-541` — certificate persistence is structurally course-centric.

**Impact**

Connecting the runtime worker to `LearningPathCompleted`, as required by the Phase 14 Google Studio runbook, cannot complete issuance using the current source contract.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Introduce a typed achievement/completion issuance envelope or a dedicated learning-path issuance command and persistence mapping without weakening course-certificate idempotency.

---

### P14-TPL-004 — template “versioning” is a mutable column, not an immutable template-version aggregate

**Owner:** Phase 14 — Certificate Templates  
**Type:** VERSIONING / HISTORICAL PRESERVATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The binding Phase 14 contract defines a template root with multiple immutable `ICertificateTemplateVersion` records and requires historic certificates to remain tied to the exact assets/layout/version active at issuance. The Prisma schema instead stores one `CertificateTemplate` row with a `templateVersion` string and a globally unique `code`. No template-version table or version repository exists.

**Source evidence**

- `phase-14-02-domain-contracts.md:105-121` — explicit `versions[]` plus `ICertificateTemplateVersion` contract.
- `phase-14-01-enterprise-architecture-specification.md:109-116` — template edits must result in a new version so historic certificates remain bound to the exact prior version.
- `packages/infrastructure/prisma/schema.prisma:460-493` — one mutable `CertificateTemplate` row; `code` is globally unique; only `templateVersion String` exists.
- `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts:29-51` — draft template content is updated in place; no version record is created.

**Impact**

The current model cannot preserve a complete immutable chain of historic template layouts/localizations/assets as required for multi-decade re-rendering and verification.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Separate stable template identity from immutable template-version records and bind each certificate to a concrete version ID plus immutable EAP asset references.

---

### P14-TPL-005 — automatic fallback template creation bypasses the required Draft → Approval → Active governance

**Owner:** Phase 14 — Certificate Templates  
**Type:** GOVERNANCE / MAKER-CHECKER / ISSUANCE SAFETY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Normal course issuance calls `ensureDefaultCourseTemplate()`. If an active template is missing, this method creates the MANARATAK Signature Certificate directly with `status: ACTIVE`. This bypasses the lifecycle that the same source otherwise exposes and contradicts the Google Studio activation runbook, which instructs operators to create the first template as Draft and move it through Pending Approval → Approved → Active.

**Source evidence**

- `phase-14-01-enterprise-architecture-specification.md:127-145` — mandatory governed template lifecycle and approval workflow.
- `CertificateUseCases.ts:45-84` — fallback template is created directly as `ACTIVE`.
- same file `:99-106` — issuance automatically invokes that fallback.
- `docs/implementation-status/MANARATAK-2.0-Phase14-Source-Closure-and-Google-Studio-Runbook.md:32-37` — runtime plan requires first template to be created as Draft and formally promoted.

**Impact**

An environment that receives a qualifying issuance before manual template activation can silently manufacture an unreviewed production template and immediately use it for credentials.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Remove production auto-activation. Bootstrap may create at most a Draft template, or fail closed until an approved Active template exists.

---

### P14-ISSUER-006 — the mandatory accredited Issuer aggregate is reduced to free-form fields

**Owner:** Phase 14 — Issuer Management  
**Type:** DOMAIN MODEL / AUTHORITY / CRYPTOGRAPHIC OWNERSHIP  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Phase 14 requires every certificate to be issued by a registered, verified, accredited first-class `Issuer` aggregate with status, type, EAP branding, and KMS identity. Current persistence has no issuer model/table/repository. Templates and certificates contain only `issuerName` plus an optional unconstrained `issuerReferenceId`.

**Source evidence**

- `phase-14-01-enterprise-architecture-specification.md:147-158` — Issuer is a first-class aggregate with accreditation and dedicated KMS keys.
- `phase-14-02-domain-contracts.md:135-146` — binding `ICertificateIssuer` contract.
- `packages/infrastructure/prisma/schema.prisma:460-493,495-541` — only scalar issuer name/reference fields; no issuer aggregate exists.
- `CertificateUseCases.ts:147-155` — issuance copies those flat template fields into the certificate.

**Impact**

The source cannot prove that the party named on a certificate is active/accredited or that the signing identity belongs to that issuer.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Add stable issuer identity/status/authority records and bind template versions/signing-key references to that authority. Runtime KMS provisioning remains a later Google Studio step.

---

### P14-REISSUE-007 — reissuance copies revocation state into the replacement certificate

**Owner:** Phase 14 — Reissue Workflow  
**Type:** DATA INTEGRITY / LIFECYCLE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Reissue is allowed only after the original certificate is revoked. The replacement object is created by spreading the entire revoked source DTO and overriding selected identity/signature fields. `issueData()` removes only a small set of helper fields and then spreads the rest into Prisma creation.

As a result, the replacement can be created with `status: ACTIVE` while still carrying the original `revokedAt`, `revocationReason`, and `revokedBy` values.

**Source evidence**

- `CertificateUseCases.ts:261-323` — replacement starts with `...source`; only selected fields are overridden.
- `PrismaCertificateRepository.ts:200-229` — reissue requires original status `REVOKED` before creating the replacement.
- same file `:286-303` — `issueData()` spreads remaining DTO fields into the new row and does not clear revocation/archive/replacement lifecycle fields.
- `schema.prisma:526-531` — those lifecycle fields are persisted columns.

**Impact**

A newly active replacement certificate can contain contradictory revoked metadata, confusing public/admin state and future lifecycle rules.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Build reissue data from an allow-listed immutable credential payload, never by spreading a stateful certificate DTO. Explicitly initialize all replacement lifecycle fields.

---

### P14-EVT-008 — CertificateIssued outbox payload does not satisfy the Phase 14 event contract or Phase 15 projection needs

**Owner:** Phase 14 — Integration Events  
**Type:** EVENT CONTRACT / CROSS-PHASE INTEGRATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The binding event contract requires `CertificateIssued` to carry student identity, course identity, certificate number, and verification URL. The current issuance transaction writes an outbox event with only `certificateId`, `action`, `reason`, and `serialNumber`.

Phase 15's certificate projection expects a student-scoped event and certificate metadata such as verification code/status/course display/assets. The current Phase 14 payload cannot populate that projection faithfully.

**Source evidence**

- `phase-14-02-domain-contracts.md:254-268` — mandatory `ICertificateIssued` fields.
- `PrismaCertificateRepository.ts:75-91` — issuance calls `appendMutation()` with only `{ serialNumber }` as event-specific payload.
- same file `:306-345` — outbox payload becomes `{ certificateId, action, reason, ...payload }`.
- `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts:720-739` — Phase 15 certificate projection expects certificate/student metadata that is absent from the emitted payload.

**Impact**

The declared Phase 14 → Phase 15 integration cannot reliably update the learner's certificate vault/timeline from the current event envelope.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Publish a versioned event DTO matching the binding event catalog and the consumer contract; add contract tests spanning Phase 14 serialization and Phase 15 ingestion before connecting the runtime bus.

---

### P14-VALIDITY-009 — Expiring/Renewable certificate lifecycle exists in contracts but normal source issuance can only create Permanent certificates

**Owner:** Phase 14 — Validity & Renewal  
**Type:** DOMAIN CAPABILITY / LIFECYCLE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The domain type and architecture support Permanent, Expiring, and Renewable credentials plus expiration/renewal events. Current issuance hardcodes `validityPolicy: 'PERMANENT'`, supplies no `expiresAt`, and the repository/application expose no renewal/expiry transition command.

**Source evidence**

- `phase-14-02-domain-contracts.md:193-201,296-313` — validity/expiration/renewal are first-class contracts/events.
- `CertificateUseCases.ts:130-155` — normal issuance hardcodes `PERMANENT`.
- `packages/domain/src/certificates/entities/Certificate.ts` — source types expose EXPIRING/RENEWABLE but no implementing use case exists.
- `ICertificateRepository.ts:15-35` — no expire/renew command is available.
- `PrismaCertificateRepository.ts:154-168` — expiry is only counted in analytics; no lifecycle processing exists.

**Impact**

The source advertises credential lifecycles that cannot be produced or governed through its own application boundary.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Add explicit validity policy input/rules and durable expire/renew workflows/events; include all validity semantics in the immutable signed envelope from `P14-CRYPTO-001`.

---

### P15-INIT-001 — normal student GET traffic can synchronously create an ACTIVE workspace and bypass event-driven INITIALIZING

**Owner:** Phase 15 — Student Workspace Lifecycle  
**Type:** LIFECYCLE / EVENT CHOREOGRAPHY / ACCESS CONTROL  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Phase 15 requires workspace initialization strictly from `StudentIdentityCreated`, with a transient `INITIALIZING` state during which access is blocked. Current `GET /workspace` and dashboard flow call `getOrCreateWorkspace()`. If no workspace exists, the request synchronously creates one, and repository creation defaults directly to `ACTIVE`. The integration-event path also creates the workspace directly as `ACTIVE`.

**Source evidence**

- `phase-15-01-enterprise-architecture-specification.md:97,245` — event-triggered initialization and blocked access during `Initializing`.
- `phase-15-03-implementation-guide.md:58-64` — initialization is strictly asynchronous choreography.
- `StudentWorkspaceUseCases.ts:35-48` — reads call `getOrCreateWorkspace()` and can create on demand.
- `StudentWorkspaceRouter.ts:89-110` — ordinary authenticated workspace/dashboard GET routes invoke those methods.
- `PrismaStudentWorkspaceRepository.ts:69-90` — missing workspace defaults to `ACTIVE`.
- same file `:591-605` — `StudentIdentityCreated` path also creates `ACTIVE`, skipping `INITIALIZING`.

**Impact**

Identity/workspace creation order is no longer controlled by the authoritative identity event, and the documented initialization gate can never be observed or enforced.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Make reads fail/return provisioning state when the workspace does not exist. Provision only from the inbox command, transition `INITIALIZING → ACTIVE` explicitly, and prove idempotent activation in Google Studio.

---

### P15-LIFE-002 — StudentIdentitySuspended / StudentIdentityArchived do not drive the workspace lifecycle

**Owner:** Phase 15 — Student Workspace Lifecycle  
**Type:** IDENTITY INTEGRATION / SECURITY LIFECYCLE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Architecture requires workspace suspension/archive to be driven by Identity events. `ingestIntegrationEvent()` special-cases only `StudentIdentityCreated`; `projectIntegrationEvent()` handles learning/certificate events but contains no handling for `StudentIdentitySuspended` or `StudentIdentityArchived`.

This is a source behavior gap, not merely the deferred act of connecting a runtime event bus.

**Source evidence**

- `phase-15-01-enterprise-architecture-specification.md:97-100,247-248` — suspension/archive are identity-event-driven states.
- `PrismaStudentWorkspaceRepository.ts:580-631` — only `StudentIdentityCreated` changes lifecycle during ingestion.
- same file `:692-741` — projection logic handles Course*/Certificate* only.
- repository-wide source search outside tests contains no `StudentIdentitySuspended` or `StudentIdentityArchived` handler.

**Impact**

Once the Google Studio inbox worker is connected, authoritative identity suspension/archive events still cannot enforce the documented student-workspace state.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Add idempotent lifecycle event handlers with explicit state transitions and audit/outbox records; keep actual event-bus subscription as a runtime activation item.

---

### P15-SYNC-003 — suspended/archived workspaces continue accepting integration-event projections

**Owner:** Phase 15 — Inbox / Lifecycle Enforcement  
**Type:** DATA INTEGRITY / SECURITY STATE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Phase 15 says a Suspended workspace ceases real-time synchronization and an Archived workspace halts synchronization completely. The integration-event ingestion transaction does not call `requireWritable()` or otherwise inspect workspace status before writing Inbox, Timeline, learning/certificate projections, and notifications.

**Source evidence**

- `phase-15-01-enterprise-architecture-specification.md:247-248` — synchronization must cease for Suspended/Archived.
- `PrismaStudentWorkspaceRepository.ts:580-650` — ingestion writes event/timeline/projections/notifications after loading the workspace with no state guard.
- same file `:654-661` — a correct Suspended/Archived guard exists as `requireWritable()` but is not used by ingestion.

**Impact**

A workspace that has already been suspended or archived can continue mutating from upstream events, contradicting privacy/compliance lifecycle guarantees.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Define event acceptance policy by workspace state and enforce it atomically before Inbox/projection mutation. Preserve event receipts if needed for later administrative replay without mutating active read models.

---

### P15-READ-004 — Archived workspaces remain available through the normal student read model

**Owner:** Phase 15 — Workspace Access  
**Type:** ACCESS CONTROL / TERMINAL LIFECYCLE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The architecture defines Archived as inaccessible and removed from active read models. `getOrCreateWorkspace()` returns any existing workspace regardless of status, and dashboard composition reads the workspace without rejecting `ARCHIVED`.

**Source evidence**

- `phase-15-01-enterprise-architecture-specification.md:248` — Archived is inaccessible and removed from active read models.
- `StudentWorkspaceUseCases.ts:35-53` — existing workspace is returned without lifecycle filtering; dashboard then composes it.
- `PrismaStudentWorkspaceRepository.ts:145-149` — dashboard query accepts any workspace status.

**Impact**

A terminally archived student can continue receiving the standard active workspace/dashboard read surface.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Centralize read authorization by lifecycle state and define explicit policy for any compliance-only historical access separate from normal student BFF routes.

---

### P15-SNAP-005 — snapshot creation is a write path that bypasses the Suspended/Archived write guard

**Owner:** Phase 15 — Workspace Snapshots  
**Type:** LIFECYCLE ENFORCEMENT / WRITE AUTHORIZATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

All writes are forbidden while Suspended and Archived. `createSnapshot()` is exposed to the authenticated student, but the repository uses `findWorkspace()` and writes a new snapshot directly instead of `requireWritable()`.

**Source evidence**

- `phase-15-03-implementation-guide.md:62-64` — suspension disables all mutative handlers.
- `StudentWorkspaceRouter.ts:192-205` — students can POST a new snapshot.
- `StudentWorkspaceUseCases.ts:172-178` — calls repository snapshot creation directly.
- `PrismaStudentWorkspaceRepository.ts:513-536` — writes snapshot after `findWorkspace()` with no lifecycle guard.
- same file `:654-661` — correct write guard exists but is not used here.

**Impact**

A suspended/archived account can still create persistent workspace records through a normal student route.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Route snapshot creation through the same state-aware write authorization used by other workspace mutations.

---

### P15-PRIV-006 — snapshots can roll privacy/consent preferences backward without a new consent decision

**Owner:** Phase 15 — Privacy & Snapshots  
**Type:** PRIVACY / CONSENT INTEGRITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Architecture says snapshots capture dashboard configuration/layout and restoration overwrites presentation preferences, not underlying domain data. Privacy is separately described as explicit-consent-controlled. Current snapshots serialize `privacyPreferences` and restoration writes those old values back into the active workspace.

A user can therefore restore an old snapshot and silently re-enable an earlier analytics/personalization/public-profile choice without a new explicit consent action.

**Source evidence**

- `phase-15-01-enterprise-architecture-specification.md:178,259` — tracking/personalization and privacy require explicit consent/logs.
- same file `:294-298` — snapshots are configuration/layout, not domain-data backups; restore is described in terms of layout/presentation preferences.
- `PrismaStudentWorkspaceRepository.ts:513-533` — snapshot payload includes `privacyPreferences`.
- same file `:545-565` — restore writes snapshot privacy values back to the active workspace.

**Impact**

Consent state can be changed by a workspace rollback rather than by an explicit consent workflow, weakening auditability and user intent.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Exclude consent-bearing privacy fields from layout snapshots, or route restoration of them through a dedicated consent command that records a new explicit decision.

---

### P15-CONSENT-007 — privacy preference changes have no dedicated consent ledger or auditable decision payload

**Owner:** Phase 15 — Student Preferences  
**Type:** PRIVACY GOVERNANCE / AUDITABILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The architecture makes `StudentPreference` the global configuration root and requires explicit consent logs. The current persistence stores privacy fields directly on `StudentWorkspace`. A generic workspace update can change the complete privacy matrix; the emitted audit/outbox payload contains only student ID, workspace version, and status, not the consent values/delta/purpose.

No StudentPreference or consent-log persistence model exists in the active schema.

**Source evidence**

- `phase-15-03-implementation-guide.md:84-92` — `StudentPreference` is the global preference aggregate; Personal Statistics and downstream systems depend on it.
- `phase-15-01-enterprise-architecture-specification.md:178,259` — explicit consent flags/logs are required.
- `schema.prisma:2305-2324` — privacy is embedded in `StudentWorkspace`; no consent ledger/StudentPreference model exists.
- `PrismaStudentWorkspaceRepository.ts:115-140` — privacy may be updated, but `StudentWorkspaceUpdated` audit/outbox records only student ID/version/status.

**Impact**

The system cannot reconstruct who consented to which privacy setting, when, and through which explicit action, nor can it safely propagate an authoritative consent decision downstream.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Introduce a dedicated typed privacy/consent mutation with immutable decision history and versioned event payloads; avoid treating a generic workspace configuration write as sufficient consent evidence.

---

### P15-STATS-008 — dashboard “personal statistics” are computed from capped display windows and become incorrect for larger histories

**Owner:** Phase 15 — Dashboard / Personal Statistics  
**Type:** DATA CORRECTNESS / READ MODEL  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The Phase 15 design requires a denormalized `PersonalStatistics` record maintained by stream/batch processing. Current dashboard composition fetches at most 20 learning projections and 12 certificate projections and then uses those truncated arrays to calculate active/completed course counts, certificate count, and average progress. Only saved-items and unread-notification counts are separately counted across all rows.

**Source evidence**

- `phase-15-03-implementation-guide.md:91-92` — Personal Statistics must be persisted and incrementally recalculated.
- `PrismaStudentWorkspaceRepository.ts:145-197` — dashboard queries cap learning at 20 and certificates at 12.
- same file `:215-230` — statistics are computed directly from those capped arrays.
- `schema.prisma` contains no `StudentPersonalStatistics` model even though `StudentPersonalStatisticsDto` exists in the domain.

**Impact**

Students with more than 20 enrollments or 12 certificates receive materially incorrect counts/averages in the dashboard, and downstream quick actions can be based on incomplete data.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Create the declared denormalized statistics projection or use aggregate DB queries for exact totals until that projection is activated. Display-window limits must not define statistics semantics.

---

### P16-LOCALE-001 — locale-specific workflow transitions overwrite one global ContentNode status and destroy independent locale lifecycle truth

**Owner:** Phase 16 — CMS Localization  
**Type:** LOCALIZATION / WORKFLOW STATE / DATA INTEGRITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Phase 16 explicitly requires isolated localized overlays with independent publishing lifecycles. The repository correctly stores `CmsLocalizedContent.state`, but almost every locale workflow transition also overwrites the root `CmsContentNode.status` with that locale's new state.

For example, Arabic can remain publicly published while an English review changes the root to `READY_TO_PUBLISH`; archiving one locale can set the root to `ARCHIVED` even while another locale remains published.

**Source evidence**

- `phase-16-02-enterprise-cms-domain-contracts.md:86` — translations are isolated overlays with independent publishing lifecycles.
- `PrismaCmsRepository.ts:337-344` — locale review approval updates root status.
- same file `:372-379` — locale rejection updates root status.
- same file `:487-505` — publishing one locale sets root `PUBLISHED`.
- same file `:515-531` — archiving one locale sets root `ARCHIVED`.
- same file `:888-895` — generic transitions also copy localized state into root status.

**Impact**

Admin filters, operational status, and any root-based decisions can report a state that is false for other locales. This defeats the declared independent-localization lifecycle.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Define root status as a derived aggregate state (or remove it as lifecycle authority) and keep locale publication truth exclusively on localized records/published projections.

---

### P16-SCHED-002 — scheduled publishing jobs have no atomic claim/lease and can be double-processed or marked FAILED after publication

**Owner:** Phase 16 — Scheduled Publishing  
**Type:** CONCURRENCY / IDEMPOTENCY / JOB PROCESSING  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

`processDueSchedules()` reads a batch of all due `PENDING` jobs and processes them one by one without first atomically claiming a job or changing it to a processing/leased state. Multiple workers can read the same job. There is also a crash window between successful publication and marking the job `COMPLETED`.

A second execution can then retry a now-published localized record, hit a lifecycle/version error, and mark the same job `FAILED` even though publication already occurred.

**Source evidence**

- `PrismaCmsRepository.ts:830-850` — due jobs are selected by `PENDING`, processed, and only afterwards updated to `COMPLETED`; catch unconditionally writes `FAILED`.
- no atomic claim/lease/`FOR UPDATE SKIP LOCKED`-equivalent state transition exists before publish/archive.
- Phase 16 runtime runbook requires retry/idempotency; the current source processor is the component that must provide safe semantics when that worker is activated.

**Impact**

Duplicate workers, retries, or process crashes can produce contradictory job state, repeated work, noisy failure alerts, and difficult operator recovery.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Implement an atomic claim/lease state machine and idempotent completion semantics before live scheduler concurrency is enabled in Google Studio.

---

### P16-SEO-003 — generated canonical URLs and slug-change redirects hardcode the `/articles/` route for every CMS content type

**Owner:** Phase 16 — SEO / Routing Metadata  
**Type:** SEO / CANONICAL IDENTITY / REDIRECTS  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

CMS supports articles, study guides, news, FAQ, checklists, static pages, announcements, landing pages and content blocks. Yet the generic SEO helper and localized slug-change workflow generate paths using `/{locale}/articles/{slug}` regardless of actual `contentType`.

**Source evidence**

- `phase-16-01-enterprise-cms-architecture-specification.md:90-93,201-203` — CMS owns multiple editorial content types and canonical correctness.
- `PrismaCmsRepository.ts:716-735` — slug redirects always use `/articles/`.
- same file `:990-1008` — default canonical URL always uses `/articles/`.
- `packages/domain/src/cms/enums/CmsContentType.ts` — source supports multiple content types.

**Impact**

Non-article content can publish canonical/redirect metadata pointing to the wrong route family, causing broken navigation and SEO canonicalization.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Centralize a content-type-aware canonical route registry shared by canonical generation, slug changes, public routing, and Phase 24 composition.

---

### P16-SEO-004 — admin-supplied canonical URLs bypass the architecture's strict canonical-generation rule

**Owner:** Phase 16 — SEO Governance  
**Type:** SEO INTEGRITY / GOVERNANCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The architecture requires canonical resource locators to be generated/enforced so one content item cannot cannibalize or impersonate another domain/site. Admin DTO validation accepts any absolute URL for `canonicalUrl`, and the SEO helper uses that value unchanged when present.

**Source evidence**

- `phase-16-01-enterprise-cms-architecture-specification.md:201-203` — canonical enforcement must strictly generate resource locators.
- `CmsAdminRouter.ts:8-18` — `canonicalUrl` accepts any `z.string().url()`.
- `PrismaCmsRepository.ts:990-1002` — supplied canonical URL overrides the generated one without site/origin/content identity validation.

**Impact**

An editor with normal CMS write permission can publish a canonical pointing to another host, domain record, or unrelated page, undermining SEO identity and cross-domain ownership boundaries.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Generate canonical identity from governed site/content routing; if exceptional overrides are required, model them as separately approved policy with strict allowed-origin and ownership checks.

---

### P16-NAV-005 — navigation Maker-Checker can be bypassed because the checker can replace the menu content while publishing it

**Owner:** Phase 16 — Navigation Governance  
**Type:** MAKER-CHECKER / SEPARATION OF DUTIES  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

When publishing an existing navigation menu, the repository checks only that the current actor differs from the previous `updatedBy`. In the very same transaction, that actor sets the menu to `PUBLISHED`, deletes all existing nodes, and creates the node set supplied in their own publish request.

The checker is therefore allowed to author arbitrary navigation content and approve/publish it in one operation.

**Source evidence**

- `phase-16-01-enterprise-cms-architecture-specification.md:182` — author/Maker cannot be publisher/Checker.
- `CmsAdminRouter.ts:280-282` — publish status and full node payload are accepted in one request.
- `PrismaCmsRepository.ts:760-773` — maker-checker compares old `updatedBy`, then the checker replaces nodes and publishes in the same transaction.

**Impact**

A compromised or mistaken publisher can introduce unreviewed external/domain navigation links directly into the public menu while satisfying the superficial identity check.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Separate content mutation from approval/publish commands. Checker actions must publish an immutable reviewed version/hash, not carry a replacement node payload.

---

### P16-ANN-006 — announcement Maker-Checker has the same “edit while approving” bypass

**Owner:** Phase 16 — Announcements  
**Type:** MAKER-CHECKER / SEPARATION OF DUTIES  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Publishing an existing announcement checks only that the actor differs from the original `createdBy`, but the publish request also contains title, body, urgency, audience, and schedule fields. The checker can rewrite all of those values and publish their rewritten version immediately.

**Source evidence**

- `CmsAdminRouter.ts:297-304` — announcement mutation and target status arrive in one payload.
- `PrismaCmsRepository.ts:812-827` — maker-checker compares `existing.createdBy`, then writes the checker's supplied content and `PUBLISHED` status in one transaction.
- `phase-16-01-enterprise-cms-architecture-specification.md:182` — Maker and Checker must be separated.

**Impact**

High/critical site-wide announcements can be altered by the approver after review, so the published text is not necessarily the text the Maker submitted.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Version/freeze the reviewed announcement payload and make approval/publish reference that immutable version only.

---

## MEDIUM / P2

### P14-GOV-010 — template lifecycle mutations have no actor-specific audit/outbox trail and only one broad permission boundary

**Owner:** Phase 14 — Template Governance  
**Type:** AUDIT / RBAC / GOVERNANCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

Certificate issue/revoke/reissue mutations write ledger/audit/outbox records, but template create/update/transition use direct repository writes. `transitionTemplate()` accepts only template ID + status; it has no actor/correlation context. The entire router is protected by the single broad permission `admin:certificates:manage`, while the architecture calls for a fine-grained Credentialing & Compliance approval workflow.

**Source evidence**

- `phase-14-01-enterprise-architecture-specification.md:127-145` — multi-step lifecycle, compliance approval and fine-grained RBAC.
- `CertificateUseCases.ts:228-251` — template create/update/transition contain no actor/audit contract.
- `PrismaCertificateRepository.ts:29-51` — template persistence writes directly, unlike certificate mutations that use `appendMutation()`.
- `apps/api/src/app.ts:379` — one broad permission gates the complete Certificate Admin router.

**Impact**

The system cannot produce the declared authoritative audit evidence for who edited, approved, activated, deprecated, or archived a certificate template.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Introduce actor-aware template commands, maker/checker role separation, and atomic template audit/outbox/version records.

---

### P14-DATA-011 — same-domain certificate/template/ledger references have no database-enforced referential integrity

**Owner:** Phase 14 — Persistence  
**Type:** REFERENTIAL INTEGRITY / RETENTION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

The architecture's long-term preservation policy says database schemas enforce rigid referential integrity and preserve certificate/template/history links. Current Prisma models store `Certificate.templateId`, `CertificateLedgerEntry.certificateId`, and `CertificateVerificationLog.certificateId` as scalar strings without Prisma relations/FKs.

**Source evidence**

- `phase-14-01-enterprise-architecture-specification.md:313-326` — never-delete, immutable history, and preserved historical template references.
- `schema.prisma:495-565` — the relevant IDs are scalar/indexed fields but no relation declarations/FKs exist.

**Impact**

The database cannot itself prevent orphaned certificate history/template references if future code, maintenance, or migration operations remove/replace rows incorrectly.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Add same-domain restrictive foreign-key relationships where compatible with the never-delete policy; inspect existing rows in Google Studio before introducing constraints.

---

### P15-AUDIT-009 — system/event-driven workspace creation is recorded as a USER action by the student

**Owner:** Phase 15 — Audit / Outbox  
**Type:** AUDIT PROVENANCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

`appendOutbox()` always writes `actorType: 'USER'` and derives `actorId` from `payload.studentReferenceId`. When `StudentIdentityCreated` provisions a workspace, the resulting audit record therefore says the student user performed the creation even though it was system/event-driven.

**Source evidence**

- `PrismaStudentWorkspaceRepository.ts:591-605` — identity event provisions the workspace and calls `appendOutbox()`.
- same file `:664-688` — audit actor is always the student and actor type is always `USER`.

**Impact**

Forensic/audit history attributes automated lifecycle actions to the wrong principal.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Carry explicit actor type/source event identity through audit creation and reserve student USER attribution for authenticated student commands.

---

### P15-QG-010 — official Phase 15 source verification fails on the current valid router because it searches formatting, not syntax/semantics

**Owner:** Phase 15 — Quality Gate  
**Type:** VERIFICATION / CI REPRODUCIBILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

Both Phase 15 verification scripts require the exact text `router.get('/dashboard'`. The actual router formats `router.get(` and `'/dashboard'` on separate lines. Consequently the official verifier reports a failure even though the dashboard route exists.

**Source evidence**

- `scripts/verify-phase15-source.mjs:17` — exact single-line token check.
- `scripts/verify-phase15-phase16-closure.mjs:4` — repeats the same brittle check.
- `StudentWorkspaceRouter.ts:106-110` — actual valid multiline dashboard route.
- Audit execution at this baseline:
  - `node scripts/verify-phase15-source.mjs` → all listed checks pass except `FAIL identity-derived route`; exit `1`.
  - `node scripts/verify-phase15-phase16-closure.mjs` → all listed checks pass except `FAIL 15 identity-derived BFF`; exit `1`.

**Impact**

A source-complete build can fail the official Phase 15 closure command solely due to harmless formatting, reducing trust in CI/closure evidence.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Replace grep/token closure checks with AST/import-level checks or executable tests; at minimum make the token matcher formatting-insensitive.

---

### P16-TAG-007 — public tag filtering happens after database pagination, producing missing results and false totals

**Owner:** Phase 16 — Public CMS Query  
**Type:** PAGINATION / QUERY CORRECTNESS  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

`listPublished()` applies page/skip/take in the database before applying the requested tag filter in memory. It then reports `filtered.length` as the total for that tag. Matching content outside the current unfiltered page is invisible and total/totalPages are wrong.

**Source evidence**

- `PrismaCmsRepository.ts:639-686` — tag is not included in DB `where`; rows are paged first, then filtered at lines 672-678; total becomes current-page filtered length.

**Impact**

Public tag archives/search can omit legitimate published entries and show inconsistent pagination as users move between pages.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Filter tags in the database/published projection before pagination and calculate the total against the same predicate.

---

### P16-REDIR-008 — redirect loop prevention detects only A↔B pairs and permits longer cycles

**Owner:** Phase 16 — Redirect Governance  
**Type:** ROUTING / LOOP DETECTION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

Redirect creation and slug changes reject self-redirects and an exact reverse pair, but do not traverse the existing redirect graph. A sequence such as `A → B`, `B → C`, `C → A` passes the current checks.

**Source evidence**

- `CmsPublishingPolicy.ts:52-56` — only same-path/open-target validation.
- `PrismaCmsRepository.ts:723-727` — slug change checks only a direct reverse row.
- same file `:744-749` — manual redirect creation does the same.

**Impact**

Visitors/crawlers can enter multi-request redirect loops that the CMS governance layer claims to prevent.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Resolve the destination chain before commit and reject any path that reaches the new source; cap traversal depth and include active/site/locale scope.

---

### P16-BLOCK-009 — “schema validation” is shallow and accepts undeclared block fields

**Owner:** Phase 16 — Content Blocks  
**Type:** SCHEMA GOVERNANCE / INPUT VALIDATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

The architecture requires absolute validation against registered block schemas. The implementation checks required fields and top-level primitive types for declared properties, plus listed EAP asset fields, but never rejects payload keys absent from the schema and does not implement nested constraints or standard JSON-schema semantics.

**Source evidence**

- `phase-16-01-enterprise-cms-architecture-specification.md:213-218,245` — strongly typed block schemas and absolute schema validation are mandatory.
- `PrismaCmsRepository.ts:1168-1179` — validator loops over required/declared properties but has no additional-property rejection or recursive schema validation.
- `CmsAdminRouter.ts:293-295` — block payload accepts arbitrary record keys before repository validation.

**Impact**

Editorial payloads can carry undeclared data that consumers may later interpret inconsistently, weakening schema version guarantees and content safety.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Use a real compiled schema validator with explicit `additionalProperties` policy, recursive constraints, schema version compatibility, and EAP-specific custom keywords where needed.

---

### P16-NAV-010 — navigation validation allows orphan parentNodeId references

**Owner:** Phase 16 — Navigation  
**Type:** STRUCTURAL INTEGRITY / TREE VALIDATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

The navigation cycle check builds a map only for node IDs that exist in the submitted list. If a child names a `parentNodeId` that is not present, traversal reaches an unknown key and simply stops. The Prisma model also stores `parentNodeId` as a scalar without a self-relation/FK, so the orphan is accepted by persistence.

**Source evidence**

- `CmsPublishingPolicy.ts:41-49` — missing parent IDs are treated as end-of-chain rather than invalid.
- `CmsAdminRouter.ts:280-282` — arbitrary parent ID strings are accepted in submitted nodes.
- `schema.prisma:2779-2792` — `CmsNavigationNode.parentNodeId` is not a relational self-FK.

**Impact**

A published navigation menu can contain nodes whose parent does not exist, producing broken or inconsistent trees in public composition.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Require every non-null parent to resolve within the same submitted menu and enforce the invariant in both domain validation and persistence where practical.

---

# 27. Phase 14–16 Google Studio / runtime evidence register — not counted as source defects

The following items are intentionally separated from the 31 confirmed source findings. They require the controlled runtime environment or are explicitly deferred activation work in the phase runbooks.

### GS14-DB-001 — Phase 14 migration and relational state

**Status:** `PENDING_GOOGLE_STUDIO`

Prove `20260824200000_phase14_enterprise_certificates` against the approved PostgreSQL baseline: migration order, indexes, pre-existing-row compatibility, uniqueness behavior, and rollback/recovery evidence.

### GS14-KMS-002 — asymmetric KMS signer and historical key rotation

**Status:** `PENDING_GOOGLE_STUDIO`

The Phase 14 runbook explicitly says the source-only HMAC development signer must be replaced/activated with Google Cloud KMS before production, retaining old public key versions. Do not treat the absence of a live KMS key as a source defect. Production readiness must remain blocked until historical verification across key rotation is proven.

### GS14-ART-003 — PDF/A, preview, thumbnail and QR artifact activation through EAP

**Status:** `PENDING_GOOGLE_STUDIO`

Provision/activate the renderer, QR generator and Phase 05 EAP integration required by the Phase 14 runbook; prove no fabricated asset handles and verify checksum/rendering evidence.

### GS14-EVT-004 — durable CourseCompleted/LearningPathCompleted subscription, retry and DLQ

**Status:** `PENDING_GOOGLE_STUDIO`

After source contract defects such as `P14-PATH-003` and `P14-EVT-008` are corrected, connect the worker to the real event bus/Redis queues and prove duplicate delivery, retry, jitter, DLQ and replay behavior.

### GS14-E2E-005 — complete certificate pilot

**Status:** `PENDING_GOOGLE_STUDIO`

Run one controlled learner/course issuance through sign → render → EAP → QR/public verify → revoke → reissue, preserving both ledger histories.

### GS15-DB-006 — Phase 15 migration/backfill and real projection integrity

**Status:** `PENDING_GOOGLE_STUDIO`

Apply the approved Phase 15/closure migration only after backup/recovery gates; verify workspace uniqueness, default Favorites backfill, Inbox uniqueness, projection rows and `relations lost = 0`.

### GS15-EVT-007 — Inbox worker, Outbox relay and real event-bus delivery

**Status:** `PENDING_GOOGLE_STUDIO`

The Phase 15 runbook intentionally defers the long-running consumer/relay. After source lifecycle/event contract defects are fixed, prove at-least-once delivery, deduplicated Inbox behavior, lag metrics, retry and DLQ.

### GS15-REDIS-008 — student-partitioned Redis cache and cross-device invalidation

**Status:** `PENDING_GOOGLE_STUDIO`

Prove no cross-student key collisions, invalidation after mutations, cache fallback behavior, and SSE/WebSocket cross-device propagation if enabled.

### GS15-LIFE-009 — real suspension/archive runtime proof

**Status:** `PENDING_GOOGLE_STUDIO`

After source lifecycle handlers are corrected, suspend/archive a test workspace and prove the approved read policy, zero forbidden writes, zero projection synchronization, and explicit administrative recovery controls.

### GS16-DB-010 — CMS migration and published-projection consistency

**Status:** `PENDING_GOOGLE_STUDIO`

Apply Phase 16/closure migrations against PostgreSQL and prove localized uniqueness, revision/published projection consistency, no draft leakage, and atomic audit/outbox writes.

### GS16-SCHED-011 — scheduled-worker concurrency/idempotency runtime proof

**Status:** `PENDING_GOOGLE_STUDIO`

After `P16-SCHED-002` is repaired, start multiple worker instances and prove atomic claims, retry after crash, no duplicate publication, correct terminal job status and operator replay behavior.

### GS16-CACHE-012 — Redis/CDN delivery proof

**Status:** `PENDING_GOOGLE_STUDIO`

Prove locale/site cache partitioning, publish/republish/archive invalidation, ETag/304 behavior, no draft/review/scheduled payload leakage, and public canonical delivery through the real runtime origin.

---

# 28. Phase 14–16 rechecks, deferred boundaries and non-duplicate decisions

The following were deliberately **not** counted as additional source findings:

- A live PostgreSQL database, applied migrations, seeds, Redis, KMS, EAP provider, CDN, worker process, or Google Studio pilot is absent by design at this stage. These are runtime evidence/activation items in Section 27.
- Phase 14's current HMAC signer and `AWAITING_EAP_RENDER` state are explicitly described by the Phase 14 Google Studio runbook as pre-production placeholders requiring runtime KMS/artifact activation. The audit therefore did not create a duplicate “KMS is not live” or “PDF worker is not running” source defect. The source-level signed-envelope defect `P14-CRYPTO-001` remains independent and must be fixed regardless of provider.
- The absence of a running Phase 14 queue subscriber and Phase 15 Inbox worker is not by itself counted because both runbooks explicitly defer live worker/event-bus activation. Source contracts that would still fail once those workers are connected (`P14-PATH-003`, `P14-EVT-008`, `P15-LIFE-002`, `P15-SYNC-003`) are counted.
- Phase 16's scheduled worker process is runtime-deferred; `P16-SCHED-002` is counted because the current due-job processor itself lacks safe claim/idempotency semantics and would remain unsafe after merely starting the worker.
- Phase 16 public content is read exclusively from `CmsPublishedContent`; no confirmed generic draft leakage was found in the audited public router.
- Phase 13's previously recorded completion/outbox durability findings are not duplicated here. Phase 14 findings concern the downstream certificate authority/event contract only.
- No claim is made that the full targeted Vitest suite passed in this audit session. A combined targeted invocation did not complete within the audit timeout and is therefore not accepted as passing evidence.

Verification-script observations at this baseline:

```text
node scripts/verify-phase15-source.mjs
→ EXIT 1 only because of the brittle `identity-derived route` text token

node scripts/verify-phase16-source.mjs
→ PASS 22/22
→ EXIT 0

node scripts/verify-phase15-phase16-closure.mjs
→ EXIT 1 only because of the same brittle Phase 15 dashboard-route token
```

---

# 29. Phase 14–16 positive controls observed

Controls worth preserving during remediation:

- Phase 14 issue/revoke/reissue operations are transaction-oriented and couple certificate mutation with ledger/audit/transactional-outbox writes.
- Phase 14 reissue correctly requires the original certificate to be revoked first and retains original/replacement linkage; remediation should fix the replacement payload rather than remove the ledger pattern.
- Phase 14 public verification records a verification log/outbox event and does not expose an issued-certificate delete API.
- Phase 14 template editing correctly locks non-Draft template content; future immutable versioning should preserve that intent.
- Phase 15 normal student BFF routes derive identity from `req.authUserId`; the student cannot choose another workspace ID on the main self-service routes.
- Phase 15 uses `requireWritable()` for many persistent mutations, Inbox `eventId` deduplication, local learning/certificate projections, and per-student cache invalidation hooks.
- Phase 15 search history and recently-viewed recording honor the current privacy flags before writing.
- Phase 16 core localized content has a real review record, maker-checker check, readiness gate, immutable revision capture, published projection, audit and outbox inside transactions.
- Phase 16 public APIs read from the published projection rather than the draft/editing tables.
- Phase 16 uses EAP asset-handle guards for editorial media and protects admin preview with no-store/noindex behavior.
- `scripts/verify-phase16-source.mjs` currently passes all 22 source token checks; remediation should preserve those controls while replacing token-only checks with stronger behavioral evidence where appropriate.

---

# 30. Batch verdict — Phase 14–16

```text
PHASE_14_TO_16_DEEP_AUDIT = COMPLETE
SOURCE_MODIFICATIONS = 0
DATABASE_CONNECTED = NO
MIGRATIONS_APPLIED = 0
GOOGLE_STUDIO_RUNTIME_EXECUTED = NO
NEW_CONFIRMED_OPEN_FINDINGS = 31
CUMULATIVE_CONFIRMED_OPEN_FINDINGS = 108
CRITICAL_NEW = 1
HIGH_NEW = 22
MEDIUM_NEW = 8
LOW_NEW = 0
RUNTIME_DEFERRED_ITEMS_NEW = 12
```

Current cumulative source finding totals after Phase 2–16:

```text
CRITICAL = 6
HIGH = 73
MEDIUM = 28
LOW = 1
TOTAL = 108
```

The register remains in **audit discovery order**. No remediation priority has been finalized and no code/ZIP/database modification has begun. The source has now been deeply audited through Phase 16; only the Phase 17–19 discovery batch remains before global dependency-aware reprioritization.

---

# 31. Next audit batch

```text
NEXT = PHASE 17 → PHASE 19
MODE = FINAL DEEP AUDIT DISCOVERY BATCH
APPEND_TO_THIS_SAME_REGISTER = YES
SOURCE_CHANGES = FORBIDDEN DURING AUDIT
DB/RUNTIME_ONLY_ITEMS = TAG PENDING_GOOGLE_STUDIO
AFTER_THIS_BATCH = GLOBAL ROOT-CAUSE / DEPENDENCY / SEVERITY / BLAST-RADIUS REPRIORITIZATION
```

The final discovery batch must audit the **actual repository definitions** of Phase 17, Phase 18 and Phase 19 at baseline `e57aad8c...`, including cross-phase contracts into the existing Student, CMS, Course, Certificate, Event, Asset, Identity and Finance boundaries. It must not assume stale roadmap names.


---

# 32. Phase 17–19 deep audit — confirmed findings

## Phase 17 — Enterprise AI Platform

### P17-EVAL-001 — deployment gate can certify a prompt version that was never evaluated

**Owner:** Phase 17 — Evaluation / Prompt Governance  
**Type:** DEPLOYMENT-GATE INTEGRITY / AI GOVERNANCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL / P0**

**Problem**

An evaluation run can be created with an arbitrary `promptVersion`, but the run engine does not execute that version. It executes the prompt by key, and the normal orchestrator always resolves the prompt's currently deployed `activeVersion`. The stored evaluation run nevertheless keeps the caller-supplied `promptVersion`. Prompt deployment later searches for a completed evaluation run carrying the requested version and accepts it as gate evidence.

A run labeled for version 2 can therefore actually test version 1 and still authorize deployment of version 2.

**Source evidence**

- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:58-65` — deployment gate calls `findLatestEvaluationRun(evaluation.key, version)`.
- `AIPlatformUseCases.ts:270-271` — evaluation start persists caller-supplied `promptVersion`; run ignores it and invokes the prompt by key.
- `AIPlatformUseCases.ts:110-112,125` — normal execution resolves and records `prompt.activeVersion`, not the evaluation run's requested version.
- `packages/infrastructure/src/ai-platform/PrismaAIPlatformRepository.ts:156-159` — evaluation run persists `promptVersion`, and gate lookup filters on that stored label.

**Impact**

Untested prompt code can pass a production deployment gate. This invalidates the principal safety control intended to prevent unvalidated AI prompt releases.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Bind evaluation execution to an immutable prompt-version record; prohibit a run label that differs from the actually executed version; persist the executed target checksum/version and verify that exact evidence during deployment.

---

### P17-EVAL-002 — five declared evaluator types silently behave as automatic passes

**Owner:** Phase 17 — Evaluation Engine  
**Type:** QUALITY GATE / FALSE PASS  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The domain contract declares `EXACT_MATCH`, `JSON_SCHEMA`, `REGEX`, `LATENCY`, `COST`, and `HUMAN` evaluators. The runtime only implements `EXACT_MATCH`. Every other evaluator evaluates to `true` because the predicate is `evaluator.type !== 'EXACT_MATCH' || ...`.

**Source evidence**

- `packages/domain/src/ai-platform/entities/AIPlatform.ts:241-250` — six evaluator types are part of the contract.
- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:271` — only `EXACT_MATCH` contributes a real condition; all other types pass automatically.

**Impact**

Evaluation scores and deployment evidence can be materially overstated, including schema, latency, cost, regex, and human-review requirements.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Implement each declared evaluator with fail-closed semantics; reject unsupported evaluator types instead of treating them as success.

---

### P17-EVAL-003 — MODEL/ROUTING/WORKFLOW/KNOWLEDGE evaluation targets are not actually targeted

**Owner:** Phase 17 — Evaluation Engine  
**Type:** CONTRACT / TARGET BINDING  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The contract allows evaluations to target `PROMPT`, `MODEL`, `ROUTING`, `WORKFLOW`, or `KNOWLEDGE`. For every non-PROMPT target the implementation simply calls `executeCapability()`. The named target key and stored `modelKey` option are not used to force or prove execution of the requested model/routing/workflow/knowledge asset.

**Source evidence**

- `packages/domain/src/ai-platform/entities/AIPlatform.ts:247-250` — five target types are declared.
- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:270-271` — `modelKey` can be stored, but non-PROMPT evaluation invokes ordinary capability routing.

**Impact**

An evaluation report can claim to assess a named governed asset while exercising a different runtime path.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Provide target-specific evaluation executors and persist immutable evidence of the exact model/routing/workflow/knowledge version evaluated.

---

### P17-ASYNC-004 — worker crash can leave an async AI job permanently RUNNING

**Owner:** Phase 17 — Async Execution  
**Type:** LEASE / RECOVERY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Job claiming only accepts `QUEUED` or `RETRYING` rows and writes `RUNNING`, `lockedAt`, and `lockedBy`. No stale-lock lease timeout or reclaim path exists for a `RUNNING` job whose worker dies after claim.

**Source evidence**

- `packages/infrastructure/src/ai-platform/PrismaAIPlatformRepository.ts:126-132` — claim excludes all `RUNNING` rows regardless of lock age.
- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:216-230` — retry state is written only when the same worker reaches the catch block.

**Impact**

A process crash can permanently strand work and consume queue capacity without reaching retry or dead-letter state.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Introduce expiring leases/heartbeats and atomic reclaim of stale RUNNING jobs, with bounded attempts and observable recovery evidence.

---

### P17-QUOTA-005 — quota enforcement is check-then-act and can overshoot under concurrency

**Owner:** Phase 17 — Consumer Quotas  
**Type:** CONCURRENCY / COST CONTROL  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Request/token/cost quotas are read before an execution row is created and before any usage is reserved. Concurrent requests can all observe the same below-limit counters and then proceed. Token and cost usage are recorded only after provider completion, so even a single large request can push a consumer beyond the budget after passing the pre-check.

**Source evidence**

- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:118-123` — quota check precedes execution creation.
- `AIPlatformUseCases.ts:156-164` — actual usage/cost is persisted only after inference returns.
- `AIPlatformUseCases.ts:259` — quota logic is aggregation followed by independent execution.
- `packages/infrastructure/src/ai-platform/PrismaAIPlatformRepository.ts:152` — usage counters are ordinary aggregate reads, not reservations.

**Impact**

Rate, token, and monetary budgets are advisory under concurrency and can be exceeded materially.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Use an atomic distributed quota/reservation mechanism with rollback/reconciliation, and reserve estimated maximum tokens/cost before provider invocation.

---

### P17-COST-006 — AI monetary budgets and overview add unlike currencies as if they were one currency

**Owner:** Phase 17 — Usage / Cost Governance  
**Type:** MULTI-CURRENCY ACCOUNTING  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Usage records retain a currency per model/provider price, but monthly quota aggregation sums all `cost` values without grouping or conversion. The consumer policy has a `currency` field that is ignored. The admin overview likewise sums all currencies and labels the result `USD`.

**Source evidence**

- `packages/domain/src/ai-platform/entities/AIPlatform.ts:133-145` — consumer budget includes an optional currency.
- `packages/infrastructure/src/ai-platform/PrismaAIPlatformRepository.ts:20,33` — overview sums all cost and hardcodes `currency: 'USD'`.
- `PrismaAIPlatformRepository.ts:147-152` — usage stores currency but `quotaUsage()` aggregates cost without currency grouping.
- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:259` — monthly cost is compared directly with `monthlyCostLimit` without currency handling.

**Impact**

Cost dashboards and hard spending limits become mathematically invalid as soon as more than one billing currency exists.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Budget in one canonical settlement currency using point-in-time conversion, or maintain independent per-currency budgets and totals; never add unlike currencies directly.

---

### P17-GUARD-007 — governed regex patterns can trigger invalid-regex failures or catastrophic backtracking on request threads

**Owner:** Phase 17 — Guardrails  
**Type:** SECURITY / AVAILABILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Configured guardrail patterns are compiled with `new RegExp(pattern, 'iu')` for every request. There is no validation at save time, safe-regex restriction, timeout, or isolation. A malformed expression throws; a catastrophic expression can monopolize the Node.js event loop.

**Source evidence**

- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:302-312` — raw configured regexes are compiled and executed inline.

**Impact**

A configuration mistake or malicious governance change can cause AI endpoint denial of service before provider invocation.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Compile/validate patterns at governance time with a safe-regex policy or bounded regex engine; reject invalid or high-complexity expressions fail-closed.

---

### P17-WORKFLOW-008 — workflow `dependsOn` and `retryLimit` contracts are ignored

**Owner:** Phase 17 — AI Workflows  
**Type:** WORKFLOW SEMANTICS / CONTRACT  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Workflow steps declare dependency edges and retry limits, and the Prisma model even contains step-run records. Runtime execution simply iterates the array sequentially once. It does not validate a dependency graph, honor `dependsOn`, honor `retryLimit`, or persist individual step-run attempts.

**Source evidence**

- `packages/domain/src/ai-platform/entities/AIPlatform.ts:216-224` — step contract contains `dependsOn` and `retryLimit`.
- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:262-266` — execution is a single sequential `for` loop.
- `packages/infrastructure/prisma/schema.prisma:3436-3451` — step-run persistence exists but is not used by the workflow use case.

**Impact**

Configured workflow topology and resilience policies do not describe actual execution behavior.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Validate/freeze a DAG, execute only satisfied dependencies, persist every step attempt, and enforce per-step retry policy with deterministic resume semantics.

---

### P17-WORKFLOW-009 — a queued workflow run is not bound to the workflow version it records

**Owner:** Phase 17 — AI Workflows  
**Type:** VERSIONING / REPRODUCIBILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

`start()` stores `workflowVersion = activeVersion`, but `run()` later reads the current mutable workflow definition by key and executes it. There is no immutable workflow-version table comparable to prompt versions. A governance update between queueing and execution can therefore change the steps while the run still reports the old version.

**Source evidence**

- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:264-265` — start stores a version label; run reloads the current workflow definition.
- `packages/infrastructure/prisma/schema.prisma:3417-3434` — run records a version number, but there is no workflow-definition version relation.
- AI registry resources are mutable configuration records keyed by resource type/key.

**Impact**

Workflow audit evidence is not reproducible and queued executions can silently change behavior after approval.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Persist immutable workflow versions and make every run reference and execute the exact frozen version.

---

### P17-HUMAN-010 — consumer `requireHumanReview` policy is declared but never enforced

**Owner:** Phase 17 — Consumer Governance  
**Type:** SAFETY POLICY / AUTHORIZATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

`AIConsumerPolicy` contains `requireHumanReview`, but the orchestration source never reads the property. A consumer configured to require human review receives completed model output directly like any other consumer.

**Source evidence**

- `packages/domain/src/ai-platform/entities/AIPlatform.ts:133-147` — `requireHumanReview` is part of the governed policy.
- repository-wide search across Phase 17 execution source found no use of `requireHumanReview` outside the type definition.

**Impact**

A declared safety/oversight control can be enabled administratively while having no runtime effect.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Introduce an explicit REVIEW_REQUIRED execution state and release gate, or reject activation of the policy until a governed review workflow is configured.

---

### P17-SCHEMA-011 — structured-output validation implements only a shallow subset of the advertised schema contract

**Owner:** Phase 17 — Output Validation  
**Type:** DATA VALIDATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

The validator checks JSON parsing, top-level object shape, required top-level keys and primitive top-level property types. Nested objects, array item schemas, enums, ranges, formats, `additionalProperties`, unions and other normal schema semantics are not enforced.

**Source evidence**

- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:326-339` — shallow custom validator.
- `phase-17-04-source-implementation-closure.md` claims structured-output validation as a source-closed capability.

**Impact**

Schema-validity guarantees are weaker than the governance surface implies, especially for complex downstream tool contracts.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Use a compiled, versioned JSON Schema validator with explicit supported-dialect policy and fail-closed unsupported features.

---

### P17-PROMPT-012 — capability execution selects the first matching active prompt without a uniqueness invariant

**Owner:** Phase 17 — Prompt Routing  
**Type:** DETERMINISM / GOVERNANCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

`executeCapability()` and its async equivalent list all ACTIVE prompts and choose the first with a matching capability and active version. The registry enforces uniqueness only on resource `key`, not on capability ownership. Multiple active prompts for one capability make selection dependent on repository ordering/update time rather than an explicit routing rule.

**Source evidence**

- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:179-184,210-214` — first matching prompt wins.
- `packages/infrastructure/prisma/schema.prisma:3272-3276` — generic registry uniqueness is `resourceType + key`; `capabilityKey` is only indexed.

**Impact**

A governance edit can unexpectedly change which prompt downstream phases execute without changing the consumer call.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Make capability-to-prompt binding explicit and unique, or include prompt selection in a governed routing policy.

---

### P17-IDEMP-013 — concurrent duplicate AI requests can surface a uniqueness error instead of replaying the first execution

**Owner:** Phase 17 — Execution Idempotency  
**Type:** CONCURRENCY / RETRY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

The orchestrator performs `findExecutionByIdempotency()` and then independently creates the execution. The database unique constraint prevents duplicate rows, but a simultaneous second request can lose the race at create time and receive a persistence error instead of the existing execution response.

**Source evidence**

- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:90-96,123-131` — check and create are separate operations.
- `packages/infrastructure/prisma/schema.prisma:3344` — unique constraint is the last line of defense.
- `packages/infrastructure/src/ai-platform/PrismaAIPlatformRepository.ts:98-108` — create path does not catch a unique conflict and resolve it to replay.

**Impact**

Network retries at exactly the time idempotency is most needed can fail spuriously.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Use insert-or-return-existing semantics or catch the unique conflict and deterministically load the winning execution.

---

### P17-RESIL-014 — retry backoff has no jitter and circuit-breaker state is process-local

**Owner:** Phase 17 — Provider Resilience  
**Type:** RESILIENCE / HORIZONTAL SCALE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

Backoff is deterministic exponential delay without jitter. Circuit-breaker state is held in an in-memory `Map` on each orchestrator process. Multiple API instances therefore retry in synchronized waves and do not share provider failure state.

**Source evidence**

- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:316-323` — in-process circuit state.
- `AIPlatformUseCases.ts:354-355` — deterministic backoff with no jitter.

**Impact**

At scale, provider incidents can cause thundering-herd retries and inconsistent circuit behavior between nodes.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Add bounded jitter and use a shared/partition-aware resilience state where multi-instance behavior requires it.

---

## Phase 18 — Enterprise Student Tools Platform

### P18-RATE-001 — anonymous clients can bypass per-session rate limits by rotating a trusted request header

**Owner:** Phase 18 — Public Execution Boundary  
**Type:** SECURITY / RATE-LIMIT IDENTITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

For anonymous requests the router trusts `x-student-tools-session` directly from the caller and passes it as the session identity. The execution service hashes that value into the limiter key. A caller can choose a fresh header value for each request and obtain a new quota bucket each time.

**Source evidence**

- `apps/api/src/presentation/api/router/StudentToolsPublicRouter.ts:31-39,96-106` — caller-controlled session header becomes anonymous identity.
- `packages/application/src/student-tools/use-cases/StudentToolExecutionUseCases.ts:53-57,77-87` — that identity partitions the rate limiter.

**Impact**

Anonymous rate limits, including limits protecting AI-backed tools and Phase 17 cost budgets, are trivially bypassable even after a production Redis limiter is installed.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Use a server-issued/signed anonymous session identity plus abuse controls based on trusted request attributes; never trust an arbitrary client string as the limiter principal.

---

### P18-RECO-002 — scholarship recommendation silently ignores published candidates after the first result page

**Owner:** Phase 18 — Scholarship Recommendation Tool  
**Type:** CORRECTNESS / PAGINATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The canonical scholarship gateway reads only page 1: at most 50 scholarships per preferred country or 100 globally. Unlike the university comparison gateway, it never traverses `totalPages`.

**Source evidence**

- `packages/infrastructure/src/student-tools/StudentToolGateways.ts:151-164` — one fixed page per country/global search.
- `StudentToolGateways.ts:134-145` — the university gateway demonstrates the intended paginated traversal pattern.

**Impact**

Eligible scholarships can disappear from recommendations solely because of repository ordering, producing incomplete decision support as the catalog grows.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Paginate all relevant published results with safe caps/streaming and apply filters/ranking over the complete candidate set or a purpose-built repository query.

---

### P18-SAVE-003 — saved student-tool result is supplied by the client and is not cryptographically/provenance-bound to the execution

**Owner:** Phase 18 — Phase 15 Handoff  
**Type:** DATA PROVENANCE / INTEGRITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Phase 18 intentionally does not persist transient result bodies. The later Save endpoint therefore accepts a fresh `result` payload from the caller, validates only its schema, and stores that payload in Phase 15. No result hash/reference from the completed execution proves it is the output that Phase 18 actually generated.

**Source evidence**

- `apps/api/src/presentation/api/router/StudentToolsPublicRouter.ts:45-56` — save body contains caller-supplied `result`.
- `packages/application/src/student-tools/use-cases/StudentToolExecutionUseCases.ts:185-203` — schema validation is the only binding before handoff.
- `packages/infrastructure/src/student-tools/StudentToolGateways.ts:88-99` — the supplied private result is persisted in Phase 15 metadata.
- execution records persist no output/result digest.

**Impact**

A student can attach arbitrary schema-valid content to a legitimate execution ID, weakening provenance for saved generated statements, recommendations, or other tool artifacts.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Persist a non-sensitive output digest/reference at completion and require save to prove the exact result, or perform the handoff server-side in the original completion request without retransmitting untrusted content.

---

### P18-VERSION-004 — tool schema/dependency changes can occur under an unchanged semantic version

**Owner:** Phase 18 — Tool Registry  
**Type:** VERSIONING / REPRODUCIBILITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The tool definition stores live input/output schemas and dependencies on the mutable parent row. During official-registry upsert, the parent is updated first. If the same semantic version already exists, immutability validation compares only the schema-version labels and change note—not the actual schema bodies, dependencies, availability, or execution metadata. Those can therefore change while executions continue to report the same `toolVersion`.

**Source evidence**

- `packages/infrastructure/src/student-tools/PrismaStudentToolRegistryRepository.ts:66-103` — parent definition and dependencies are replaced; version check covers only three version-record fields.
- `PrismaStudentToolRegistryRepository.ts:295-332` — schemas live on parent definition; version row stores labels, not schema snapshots.
- `packages/infrastructure/prisma/schema.prisma:3536-3585` — mutable definition row is separate from sparse version metadata.

**Impact**

Historical execution provenance cannot reconstruct the exact tool contract that was in force for a reported semantic version.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Snapshot all versioned behavior/schema/dependency configuration into immutable version records and require a semantic version increment for material changes.

---

### P18-PUBLIC-005 — public catalog/detail exposure is governed mainly by `publicEnabled`, not executable lifecycle state

**Owner:** Phase 18 — Public Registry  
**Type:** PUBLIC GOVERNANCE / DISCOVERY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

`listPublic()` filters only JSON `availability.publicEnabled=true` plus optional UI filters. Public detail also checks only `publicEnabled` and `adminOnly`. They do not require `IMPLEMENTED`, lifecycle `ACTIVE`, visibility `ACTIVE`, global enablement, or non-maintenance state. The execute path correctly enforces those states, so discovery and executability can diverge.

**Source evidence**

- `packages/infrastructure/src/student-tools/PrismaStudentToolRegistryRepository.ts:47-58` — public query lacks execution-state predicates.
- `apps/api/src/presentation/api/router/StudentToolsPublicRouter.ts:59-83` — public detail/availability can expose inactive/planned metadata.
- `packages/application/src/student-tools/use-cases/StudentToolExecutionUseCases.ts:26-52` — execution has stricter checks.

**Impact**

Retired, disabled, maintenance, or accidentally public-enabled planned tools can be advertised publicly even though they cannot run.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Centralize a single `isPubliclyDiscoverable` policy used by list/detail/availability/execute boundaries.

---

### P18-IDEMP-006 — successful idempotent replay cannot return the original transient tool result

**Owner:** Phase 18 — Execution Idempotency  
**Type:** RETRY SEMANTICS  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

When an idempotency key is replayed, the service returns only execution metadata and the warning `IDEMPOTENT_REPLAY_RESULT_NOT_PERSISTED`. The original result is unavailable even if the first response was lost after successful execution.

**Source evidence**

- `packages/application/src/student-tools/use-cases/StudentToolExecutionUseCases.ts:58-75` — duplicate path has no result body.
- Phase 18 runbook explicitly requires idempotent retry behavior to be proven.

**Impact**

A client cannot safely recover from a network failure after a completed transient calculation/generation without choosing between losing the result or running a new execution.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Define a transient, privacy-safe result recovery strategy: short-lived encrypted result cache, signed result reference, or completion handoff that preserves idempotency without turning Phase 18 into the permanent owner.

---

### P18-IDEMP-007 — concurrent identical tool requests can fail on the uniqueness constraint instead of replaying

**Owner:** Phase 18 — Execution Persistence  
**Type:** CONCURRENCY / IDEMPOTENCY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

The execution service first queries by idempotency hash and later inserts a RUNNING execution. The database has a unique `(definitionId,idempotencyKeyHash)` constraint, but the create path does not catch a concurrent unique conflict and load the winning row.

**Source evidence**

- `StudentToolExecutionUseCases.ts:58-76,102-133` — separate read then insert.
- `packages/infrastructure/prisma/schema.prisma:3599-3623` — unique constraint exists.
- `PrismaStudentToolRegistryRepository.ts:170-183` — create path has no conflict-to-replay conversion.

**Impact**

Simultaneous retries can return an internal persistence failure even though exactly one valid execution exists.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Use atomic insert-or-load-existing behavior and return a deterministic replay receipt.

---

### P18-HEALTH-008 — Phase 17 dependency health can report READY for a route that actual execution will reject

**Owner:** Phase 18 — Dependency Health  
**Type:** OPERABILITY / FALSE HEALTH  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

The Phase 17 readiness probe checks active capability/consumer/prompt, a route, production-approved model/provider, and live provider adapter. It does not apply all real route eligibility checks used by Phase 17 execution, such as model capability kind, consumer `allowedModels`, and model/provider data-classification ceilings.

**Source evidence**

- `packages/infrastructure/src/student-tools/StudentToolGateways.ts:231-280` — simplified health predicate.
- `packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts:245-257` — real routing applies additional eligibility constraints.

**Impact**

Admin health can say a tool is READY while live execution fails closed as unroutable or classification-ineligible.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Expose a Phase 17 capability-readiness API that uses the same routing eligibility code as execution rather than reimplementing a partial predicate in Phase 18.

---

## Phase 19 — Enterprise Finance & Payments Platform

### P19-AUTH-001 — manual ledger mutation bypasses the architecture's required ABAC and maker-checker control

**Owner:** Phase 19 — Financial Authorization / Ledger  
**Type:** FINANCIAL SECURITY / SEGREGATION OF DUTIES  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL / P0**

**Problem**

The entire Finance Admin router is mounted behind one RBAC permission, `admin:finance:manage`. That same principal can directly post arbitrary balanced ledger entries and reverse ledger transactions. No Phase 19 action-specific ABAC, approval threshold, or maker-checker check is applied to the manual ledger endpoint.

The Phase 19 architecture explicitly states RBAC is insufficient and manual ledger adjustments require dual control.

**Source evidence**

- `apps/api/src/app.ts:388` — one broad permission guards all Finance Admin routes.
- `apps/api/src/presentation/api/router/FinanceAdminRouter.ts:223-250` — direct ledger post/reverse endpoints.
- `packages/application/src/finance-platform/use-cases/FinancePlatformUseCases.ts:37-50,86-88` — ledger commands go straight to repository.
- `phase-19-01-enterprise-finance-payments-platform-architecture-specification.md:202` — strict ABAC and maker-checker for manual ledger adjustment.
- `phase-19-03-enterprise-finance-payments-platform-implementation-blueprint.md:224-225` — capabilities must be isolated and sensitive actions multi-level approved.

**Impact**

A single compromised or over-privileged finance-admin identity can create accounting movements without the mandatory second-control boundary.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Introduce action-scoped financial authorization and approval policies; manual posting/reversal must be represented as a pending financial action and settled only after eligible independent approval.

---

### P19-TRANSFER-002 — RATE_LOCKED and FEES_CALCULATED are status labels with no rate/fee/target calculation

**Owner:** Phase 19 — Money Transfer  
**Type:** WORKFLOW INTEGRITY / INCOMPLETE ORCHESTRATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

A transfer is created with only source amount/destination. The generic status-transition endpoint can advance it through `VALIDATED`, `RATE_LOCKED`, and `FEES_CALCULATED`, but no code at those transitions computes or stores `rateId`, target amount, or fee amount. These fields remain optional and there is no separate rate-lock/fee command.

**Source evidence**

- `FinancePlatformUseCases.ts:273-293` — transfer request supplies no target/rate/fee.
- `PrismaFinanceRepository.ts:691-719` — optional target/rate/fee are stored only if already supplied.
- `PrismaFinanceRepository.ts:726-820` — state transition logic never populates those values for RATE_LOCKED/FEES_CALCULATED.
- repository-wide search shows no Phase 19 command that sets these transfer fields after creation.

**Impact**

The state machine can claim rate and fees were locked when no auditable financial snapshot exists.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Make rate lock and fee calculation explicit domain commands that atomically persist the effective FX snapshot, target amount, fee breakdown and provenance before transition is allowed.

---

### P19-TRANSFER-003 — transfer can be marked PROCESSING/SETTLED/COMPLETED without any bank/provider execution proof

**Owner:** Phase 19 — Money Transfer / Banking ACL  
**Type:** FINANCIAL INTEGRITY / EXTERNAL SETTLEMENT  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL / P0**

**Problem**

`IBankTransferGateway` exists but is not injected or used anywhere. Finance Admin can drive the transfer status directly. On `SETTLED`, the repository debits the source wallet to an internal clearing account and captures the hold; it does not submit to a bank, validate a provider callback, credit a destination wallet, or store a provider settlement reference. `COMPLETED` is another status-only transition.

**Source evidence**

- `packages/domain/src/finance-platform/contracts/FinanceGateways.ts:43-50` — bank transfer gateway contract exists.
- repository-wide source search finds no application use of `IBankTransferGateway`.
- `apps/api/src/presentation/api/router/FinanceAdminRouter.ts:318-347` — caller chooses the next status.
- `PrismaFinanceRepository.ts:764-803,814-819` — SETTLED posts only source-to-clearing and then updates status.
- Phase 19 architecture lines 157-162 require fee/rate, external processing, settlement and completion semantics.

**Impact**

The Phase 19 SSoT can state that money settled/completed and reduce a user's wallet while no external transfer occurred.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Replace arbitrary status mutation with guarded domain commands/events tied to provider request/response evidence, destination settlement, reconciliation and immutable external references.

---

### P19-TRANSFER-004 — `REVERSED` transfer state does not reverse the settlement ledger

**Owner:** Phase 19 — Money Transfer / Ledger  
**Type:** FINANCIAL INTEGRITY / REVERSAL  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL / P0**

**Problem**

The state machine permits `SETTLED`, `COMPLETED`, and `FAILED` transfers to become `REVERSED`. The transition implementation contains no ledger reversal, wallet re-credit, settlement reference update, or hold repair for `REVERSED`; it simply changes status.

**Source evidence**

- `packages/domain/src/finance-platform/entities/FinancePlatform.ts:219-237` — REVERSED transitions are legal.
- `PrismaFinanceRepository.ts:726-820` — special handling exists for PENDING_APPROVAL, APPROVED, SETTLED, CANCELLED/REJECTED only; REVERSED has no financial action.

**Impact**

The transfer status can say "reversed" while the immutable ledger still reflects the original debit, creating a direct contradiction inside the financial SSoT.

**Preliminary remediation direction — DO NOT EXECUTE YET**

A reversal must create an immutable compensating financial transaction and provider-side reversal/refund evidence before the transfer can enter REVERSED.

---

### P19-TRANSFER-005 — failed transfer retains its active wallet hold indefinitely

**Owner:** Phase 19 — Money Transfer / Wallet  
**Type:** FUNDS AVAILABILITY / FAILURE RECOVERY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

A hold is created at PENDING_APPROVAL. Holds are released only when a transfer becomes CANCELLED or REJECTED, and captured on SETTLED. `PROCESSING -> FAILED` leaves the hold ACTIVE. The only next state from FAILED is REVERSED, which also has no hold release logic.

**Source evidence**

- `FinancePlatform.ts:219-233` — PROCESSING can fail; FAILED can only reverse.
- `PrismaFinanceRepository.ts:731-756` — active hold creation.
- `PrismaFinanceRepository.ts:804-812` — only CANCELLED/REJECTED release holds.

**Impact**

A failed transfer can permanently reduce a wallet's available balance even though no settlement occurred.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Define explicit failure compensation that atomically releases/recreates holds according to retry state and is covered by reconciliation.

---

### P19-APPROVAL-006 — transfer approval is matched only by target ID, not by action, amount, maker, or policy

**Owner:** Phase 19 — Financial Approval  
**Type:** APPROVAL BINDING / AUTHORIZATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

To enter APPROVED, a transfer searches for any APPROVED approval whose `targetReferenceId` equals transfer ID/public ID. `actionType`, approved amount/currency, transfer maker, required policy and intended transition are ignored. The approval creation API accepts arbitrary `actionType` and target references.

**Source evidence**

- `FinancePlatformUseCases.ts:256-270` — application-level approval lookup checks target only.
- `PrismaFinanceRepository.ts:758-763` — repository repeats target/status-only check.
- `FinanceAdminRouter.ts:391-404` — caller supplies arbitrary action type/target/amount.

**Impact**

Approval evidence can be reused or semantically mismatched to authorize a transfer it was not intended to approve.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Bind approval records to an immutable financial-action payload hash including action type, target version, amount/currency, maker, policy and expiry; consume that exact approval once.

---

### P19-PAY-007 — captured-payment endpoint records authorization/capture history without invoking or authenticating a payment gateway

**Owner:** Phase 19 — Payments  
**Type:** PAYMENT INTEGRITY / GATEWAY ACL  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The public domain defines `IPaymentGateway.authorize/capture/refund`, but the payment use case does not depend on a gateway. The Admin endpoint accepts a token plus optional gateway provider/reference, then `recordCapturedPaymentAtomic()` creates synthetic PENDING → AUTHORIZED → CAPTURED attempts and posts the ledger immediately. No provider signature/callback proof or gateway invocation is checked.

**Source evidence**

- `packages/domain/src/finance-platform/contracts/FinanceGateways.ts:3-29` — payment gateway ACL exists.
- repository-wide source search finds no application use of `IPaymentGateway`.
- `FinancePlatformUseCases.ts:167-206` — capture goes directly to repository.
- `PrismaFinanceRepository.ts:237-331` — synthetic attempt history and financial posting are created atomically.
- `FinanceAdminRouter.ts:177-199` — Admin API accepts optional external references.

**Impact**

A finance-admin request can make an invoice financially PAID/CAPTURED without source-level proof that an external provider authorized or captured funds.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Separate provider-initiated callback ingestion from operator commands, validate provider authenticity/idempotency, and bind ledger posting to verified gateway state.

---

### P19-PAY-008 — gateway payment reference is not unique and duplicate external captures are detected only after mutation

**Owner:** Phase 19 — Payments / Idempotency  
**Type:** DUPLICATE PAYMENT PREVENTION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Payments are unique only by MANARATAK idempotency hash. `(gatewayProvider, gatewayReference)` is merely indexed, not unique. The reconciliation job reports duplicate gateway references only after both payment rows and ledger postings already exist.

**Source evidence**

- `packages/infrastructure/prisma/schema.prisma:3656-3677` — gateway reference pair has an index only.
- `PrismaFinanceRepository.ts:242-246` — duplicate prevention uses only internal idempotency hash.
- `PrismaFinanceRepository.ts:1046-1057` — duplicate gateway callback detection is post-hoc reconciliation.

**Impact**

A retried external callback with a new local idempotency key can be recorded twice, especially for partial payments.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Enforce provider-scoped external-reference uniqueness and process callbacks with an atomic provider event/idempotency ledger before financial mutation.

---

### P19-REFUND-009 — refund source lifecycle stops at PENDING_APPROVAL and cannot complete a real refund

**Owner:** Phase 19 — Refunds  
**Type:** FEATURE INTEGRITY / FINANCIAL LIFECYCLE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The domain defines requested/approved/processing/completed refund states and the provider contract exposes `refund()`. Source use cases can only create a `PENDING_APPROVAL` refund and list refunds. There is no command to bind/consume approval, call the gateway, move through processing/completed, update payment status, or create the compensating ledger transaction.

**Source evidence**

- `FinancePlatform.ts:27-34,269-279` — full refund lifecycle exists in domain types.
- `FinanceGateways.ts:24-28` — provider refund contract exists.
- `FinancePlatformUseCases.ts:376-395,485-486` — only create/list are exposed.
- `PrismaFinanceRepository.ts:891-931` — only creation/list persistence exists.

**Impact**

The source can accumulate refund requests but cannot fulfill the architecture's formal financial correction path.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Implement an approval-bound refund state machine with verified provider refund, payment-state transition, immutable compensating ledger, receipt/credit evidence and replay-safe callbacks.

---

### P19-CREDIT-010 — credit notes can over-credit an invoice and do not reduce invoice amountDue/status

**Owner:** Phase 19 — Billing / Credit Notes  
**Type:** FINANCIAL SSoT DIVERGENCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL / P0**

**Problem**

Each credit note is checked only against the invoice's original total. Prior credit notes are not summed, so repeated notes can exceed the invoice total. The operation posts a receivable/revenue reversal but never updates `dueMinorUnits` or invoice status. It also accepts any non-DRAFT invoice, including PAID or VOIDED records.

**Source evidence**

- `PrismaFinanceRepository.ts:334-397` — amount is compared with `totalMinorUnits`; no aggregate-credit check or invoice update occurs.
- `packages/infrastructure/prisma/schema.prisma:3858-3871` — credit notes are document rows; no invariant links aggregate credit to invoice balance.

**Impact**

The operational invoice can still demand money after the ledger says receivable was reduced, and repeated credits can drive accounting beyond the original sale.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Track immutable credit-note aggregate state transactionally, cap cumulative credits at remaining eligible balance, update the invoice read model consistently, and constrain valid invoice states.

---

### P19-FX-011 — automatic rates are selected before manual overrides despite the documented priority

**Owner:** Phase 19 — Exchange Rates  
**Type:** BUSINESS RULE / RATE SELECTION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The implementation orders effective rates by `source ASC`. Lexically `AUTOMATIC_PROVIDER` sorts before `MANUAL_OVERRIDE`, so an overlapping automatic rate is preferred. The blueprint explicitly states Manual Rates are Priority 1 and Automatic Rates Priority 2.

**Source evidence**

- `PrismaFinanceRepository.ts:672-686` — query order is `source: 'asc'`, then newest effective date.
- `phase-19-03-enterprise-finance-payments-platform-implementation-blueprint.md:157-160` — Manual Rates Priority 1, Automatic Rates Priority 2.

**Impact**

Controller-approved corridor overrides may be silently ignored in conversions and estimates.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Encode explicit source priority, not lexical ordering, and add overlapping-rate contract tests.

---

### P19-FX-012 — a single finance admin can create an immediately approved manual FX override, including a zero rate

**Owner:** Phase 19 — Exchange Rates / Governance  
**Type:** FINANCIAL CONTROL / INPUT VALIDATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The Admin API accepts `approved: true` directly. Manual override requires only a textual reason; no independent approval is linked. `rateNumerator` accepts `0`, so an approved 0/x rate can make a conversion output zero.

**Source evidence**

- `FinanceAdminRouter.ts:355-379` — caller supplies `approved` and numerator `^\d+$`.
- `FinancePlatformUseCases.ts:318-342` — manual rate requires reason only; approval flag is passed through.
- `PrismaFinanceRepository.ts:659-670` — zero numerator is allowed; record is saved with caller's approved state.

**Impact**

A single finance identity can activate a materially destructive exchange rate without a governed second-control boundary.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Separate draft rate creation from approval/activation, require positive numerator/denominator, bind approval to rate checksum/effective corridor, and enforce action-scoped authorization.

---

### P19-WALLET-013 — wallet can be bound to an arbitrary/nonexistent/mismatched ledger account

**Owner:** Phase 19 — Wallet / Ledger  
**Type:** RELATIONAL INTEGRITY / MONEY MODEL  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

`createWallet()` accepts account ID, owner, currency and scale independently and performs no account lookup. Prisma stores `accountId` as a unique scalar but has no relation/FK to `FinancialAccountRecord`. It does not enforce owner match, liability account type, currency, scale, or active state.

**Source evidence**

- `FinancePlatformUseCases.ts:76-84` — input is forwarded directly.
- `PrismaFinanceRepository.ts:540-545` — wallet row is created without validation.
- `packages/infrastructure/prisma/schema.prisma:3740-3753` — `accountId` has no relation to the financial account table.

**Impact**

Wallet balances can derive from the wrong account semantics or fail later during settlement, weakening the wallet-as-ledger-projection invariant.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Make wallet/account relation explicit and validate owner, account type, canonical currency/scale, active state and tenancy transactionally at wallet creation.

---

### P19-XCUR-014 — transfer balance checks and settlement can mix source currency with a differently denominated wallet/account

**Owner:** Phase 19 — Transfer / Multi-Currency  
**Type:** CROSS-CURRENCY LEDGER INTEGRITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **CRITICAL / P0**

**Problem**

A transfer request accepts `sourceAmount.currencyCode` independently of its source wallet. At PENDING_APPROVAL the code converts both values to `BigInt` and compares units without asserting same currency/scale. The hold is then stored using the transfer currency. At SETTLED, internal `postWithinTx()` creates ledger entries but, unlike the public ledger method, does not validate the posting currency/scale against account denomination.

**Source evidence**

- `FinancePlatformUseCases.ts:273-293` — no source-wallet currency check at request.
- `PrismaFinanceRepository.ts:731-756` — available balance and transfer amount are compared as raw integers without `assertSameCurrency`.
- `PrismaFinanceRepository.ts:784-798` — settlement posts transfer-denominated amount to wallet account.
- `PrismaFinanceRepository.ts:1243-1276` — internal ledger posting lacks account currency/scale validation present in `postLedgerTransaction()` at lines 475-487.

**Impact**

A numerically compatible but differently denominated transfer can contaminate an account ledger with the wrong currency and corrupt wallet balances.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Enforce wallet/account/currency/scale identity at every transfer stage and centralize one ledger posting primitive that always validates account denomination.

---

### P19-REVERSAL-015 — one ledger transaction can be reversed multiple times

**Owner:** Phase 19 — General Ledger  
**Type:** REVERSAL INTEGRITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

`reverseLedgerTransaction()` creates a new opposite transaction but never checks whether the original already has a reversal. `reversalOfId` is neither unique nor relationally constrained. Different idempotency keys can therefore reverse the same original transaction repeatedly.

**Source evidence**

- `PrismaFinanceRepository.ts:520-537` — no prior-reversal lookup.
- `packages/infrastructure/prisma/schema.prisma:3706-3721` — `reversalOfId` is an unconstrained optional string.
- source verifier's `immutable_reversal` check only checks for the presence of a reversal method/type token, not one-time reversal semantics.

**Impact**

Repeated reversals can create artificial balances and negate more value than the original posting.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Model a proper self-relation/unique reversal link or enforce an equivalent transactional invariant; reconciliation must flag reversal chains and duplicates.

---

### P19-IDEMP-016 — draft-invoice creation does not use the supplied idempotency key

**Owner:** Phase 19 — Billing / Idempotency  
**Type:** RETRY / DUPLICATE BILLING  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The mutation context requires an idempotency key, but `createDraftInvoice()` deduplicates only by `correlationId + originDomain + originReferenceId`. If the API request omits `x-correlation-id`, `context()` generates a fresh UUID on every retry even when the same Idempotency-Key is reused. Invoice schema has no idempotency hash.

**Source evidence**

- `FinancePlatformUseCases.ts:27-31` — blank correlation ID becomes a new UUID.
- `FinanceAdminRouter.ts:31-38,89-94` — idempotency header is not specially bound to invoice creation.
- `PrismaFinanceRepository.ts:81-117` — duplicate query uses correlation+origin only.
- `packages/infrastructure/prisma/schema.prisma:3627-3654` — invoice has no idempotency key/hash.

**Impact**

A normal network retry can create duplicate draft invoices for the same business operation.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Persist an operation-scoped idempotency hash with request fingerprint and return the original invoice on replay.

---

### P19-INSTALL-017 — installment plans can be created for invalid invoice states and for already-paid value

**Owner:** Phase 19 — Installments  
**Type:** BILLING LIFECYCLE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

`createInstallments()` loads any invoice and validates installment total against the invoice's original total, not current `amountDue`. It does not require an issued/unpaid state. A plan can therefore be created for DRAFT, PAID or VOIDED invoice records, or for a partially paid invoice using the full original total. The first due date is also not required to be future.

**Source evidence**

- `FinancePlatformUseCases.ts:397-417` — no state gate; validates against `invoice.totalAmount`.
- `FinancePlatform.ts:314-329` — plan validator checks totals/order only.

**Impact**

Installment schedules can represent obligations that no longer match the collectible invoice balance.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Restrict eligible invoice states and plan against current amount due with future-date policy and explicit re-plan behavior after payments/credits.

---

### P19-COMM-018 — commission accrual does not validate sign, currency, amount ceiling, or policy calculation

**Owner:** Phase 19 — Commissions  
**Type:** FINANCIAL CALCULATION / INTEGRITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The use case calls `assertValidMoneyAmount()`, which permits signed values, and the repository only verifies that the source payment is CAPTURED. It never requires commission amount > 0, same currency/scale as the payment, amount <= payment, or that `policyReference` actually produces the requested amount.

**Source evidence**

- `FinancePlatformUseCases.ts:345-359` — no positive/currency/policy validation.
- `PrismaFinanceRepository.ts:933-954` — only captured-payment status is checked.

**Impact**

A finance actor can accrue negative, cross-currency or arbitrarily oversized commissions against a valid payment.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Calculate commission server-side from a governed immutable policy snapshot and validate positive amount, currency/scale, source-payment ceiling and recipient eligibility.

---

### P19-SYSTEM-019 — generic account creation can poison reserved system-account identities

**Owner:** Phase 19 — Chart of Accounts  
**Type:** INTERNAL NAMESPACE / LEDGER INTEGRITY  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

The generic Finance Admin account endpoint accepts arbitrary `ownerReferenceId`, including names used internally such as `ACCOUNTS_RECEIVABLE` and `PAYMENT_CLEARING`. `systemAccount()` reuses an existing account by owner/type/currency without confirming expected scale/provenance. Internal `postWithinTx()` then does not revalidate account denomination.

**Source evidence**

- `FinanceAdminRouter.ts:207-221` — no reserved-owner restriction.
- `FinancePlatformUseCases.ts:53-74` — generic account creation accepts caller-owned namespace.
- `PrismaFinanceRepository.ts:1219-1241` — internal system account lookup trusts any pre-existing match.
- `PrismaFinanceRepository.ts:1243-1276` — internal ledger helper lacks account denomination validation.

**Impact**

A malformed/malicious account can be reused as a system clearing/receivable/revenue account and corrupt subsequent automatic postings.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Reserve system-account namespace, provision it through controlled code/migration, make system account identity immutable, and validate denomination on every posting path.

---

### P19-REFDATA-020 — financial currencies/scales are syntax-checked, not resolved against Phase 7 canonical currency data

**Owner:** Phase 19 — Currency Reference Boundary  
**Type:** CROSS-PHASE CONTRACT / REFERENCE DATA  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **HIGH / P1**

**Problem**

Phase 19 architecture explicitly consumes canonical currencies from Phase 7. Finance Admin routes generally accept any three uppercase letters and arbitrary scale 0-6; use cases/repository do not resolve the currency or canonical minor-unit scale. Thus nonexistent currency codes or wrong scales can enter accounts, wallets, invoices, rates, transfers and ledger records.

**Source evidence**

- `phase-19-01-enterprise-finance-payments-platform-architecture-specification.md:110-113` — Phase 7 owns canonical currency definitions.
- `FinanceAdminRouter.ts:10-14,210-216,256-263,358-369` — regex/scale bounds only.
- repository-wide Phase 19 source search finds no Phase 7 currency resolver/gateway in financial mutation paths.

**Impact**

The financial SSoT can persist syntactically valid but noncanonical denominations, amplifying the cross-currency/account defects above.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Resolve every monetary currency/scale through the Phase 7 canonical contract at command boundaries and store canonical identity/version evidence where needed.

---

### P19-FX-021 — exchange-rate effective windows can be internally invalid

**Owner:** Phase 19 — Exchange Rates  
**Type:** TEMPORAL VALIDATION  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

The source accepts an optional `effectiveTo` without requiring it to be later than `effectiveFrom`. An approved rate can therefore be born already expired or have a reversed interval.

**Source evidence**

- `FinanceAdminRouter.ts:355-379` — both dates are parsed independently.
- `FinancePlatformUseCases.ts:318-342` and `PrismaFinanceRepository.ts:659-670` — no interval invariant is enforced.

**Impact**

Rate configuration can look approved while never being selectable, complicating audit and corridor governance.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Validate effective intervals and define overlap/supersession rules transactionally.

---

### P19-EST-022 — persisted financial estimates bypass the standard finance mutation audit/outbox context

**Owner:** Phase 19 — Financial Estimation  
**Type:** AUDITABILITY / COMMAND GOVERNANCE  
**Status:** `CONFIRMED_OPEN`  
**Severity:** **MEDIUM / P2**

**Problem**

`generateEstimate()` persists a `FinanceEstimateRecord` but accepts no `FinanceCommandIdentity`, and `saveEstimate()` is not wrapped in `govern()` audit/outbox evidence. The Admin endpoint invokes it without identity despite the Phase 19 blueprint requiring command validation/authorization/audit pipelines for state-changing commands.

**Source evidence**

- `FinancePlatformUseCases.ts:431-473` — persisted estimate has no mutation identity.
- `PrismaFinanceRepository.ts:960-980` — direct create outside finance governance transaction helper.
- `FinanceAdminRouter.ts:459-480` — endpoint calls `generateEstimate(body)` without identity.
- Phase 19 blueprint lines 95-100 require validation/authorization/audit behaviors for commands.

**Impact**

A persisted financial calculation can enter the Finance bounded context without actor/correlation/audit/outbox provenance.

**Preliminary remediation direction — DO NOT EXECUTE YET**

Treat persistent estimate generation as a governed command or make estimates explicitly transient; preserve actor, source, canonical inputs and conversion snapshots.

---

# 33. Phase 17–19 Google Studio / runtime evidence register — not counted as source defects

The following are intentionally **not** included in the 44 source findings. They require a controlled runtime/DB/provider environment. Source defects that affect them must be repaired before final proof.

### GS17-DB-001 — Phase 17 migration and registry integrity

**Status:** `PENDING_GOOGLE_STUDIO`

Apply the Phase 17 schema/migration against the approved Development/Remediation PostgreSQL database only after backup/recovery gates; prove registry uniqueness, prompt-version immutability, execution/outbox relations, async job indexes and rollback evidence.

### GS17-PROVIDER-002 — live provider secret references and real inference

**Status:** `PENDING_GOOGLE_STUDIO`

Configure approved environment secret references and execute controlled provider probes. Prove no secret leakage, timeout handling, real token counts, provider request IDs, fallback and failure redaction.

### GS17-ASYNC-003 — durable async worker/queue runtime

**Status:** `PENDING_GOOGLE_STUDIO`

After `P17-ASYNC-004` is fixed, run multiple worker instances with crash/reclaim, retry, dead-letter, cancellation and encrypted-payload evidence.

### GS17-COST-004 — provider billing reconciliation

**Status:** `PENDING_GOOGLE_STUDIO`

After currency/quota source fixes, reconcile recorded token/cost snapshots with actual provider usage and invoice/billing exports.

### GS17-KNOW-005 — live embedding/indexing provider proof

**Status:** `PENDING_GOOGLE_STUDIO`

Run a controlled canonical-source indexing pilot and prove checksum/version provenance, embedding dimension consistency, privacy handling, reindex behavior and rollback.

### GS18-DB-006 — Phase 18 migration and official 83-tool bootstrap

**Status:** `PENDING_GOOGLE_STUDIO`

Apply the Phase 18 migration and bootstrap; prove 83 official registry rows, exactly the approved implemented subset, no planned tool globally enabled, and no identity/version regeneration.

### GS18-RATE-007 — production distributed rate limiter

**Status:** `PENDING_GOOGLE_STUDIO`

After trusted anonymous identity is fixed, connect the real distributed limiter and prove per-principal isolation, cross-instance limits and reset behavior.

### GS18-AI-008 — controlled Phase 18 → Phase 17 AI integration

**Status:** `PENDING_GOOGLE_STUDIO`

Configure the Phase 18 AI consumer/capabilities/prompts/routes/models and prove motivation-letter and scholarship-ranking safety, trace, cost and failure semantics.

### GS18-CANON-009 — canonical university/scholarship runtime data probes

**Status:** `PENDING_GOOGLE_STUDIO`

Use real published Phase 11/12 records and verify pagination, unpublished-record exclusion, canonical IDs and recommendation completeness after source repair.

### GS18-SAVE-010 — Phase 15 private-result handoff

**Status:** `PENDING_GOOGLE_STUDIO`

After result provenance is fixed, prove authenticated ownership, cross-student isolation, encrypted/private persistence and deletion/privacy controls for saved tool artifacts.

### GS19-DB-011 — Phase 19 migration, constraints and atomic financial transactions

**Status:** `PENDING_GOOGLE_STUDIO`

Apply the Phase 19 schema only to the approved remediation DB after backup/recovery proof; validate transaction isolation, optimistic concurrency, unique constraints, rollback and outbox/audit atomicity.

### GS19-GATEWAY-012 — real payment, FX and bank gateway transports

**Status:** `PENDING_GOOGLE_STUDIO`

Live provider credentials/transports are runtime work. After the source orchestration gaps are repaired, prove authenticated callbacks, authorization/capture/refund, FX feeds, bank transfer dispatch, retries and idempotency.

### GS19-CONC-013 — concurrent payment/wallet/transfer race probes

**Status:** `PENDING_GOOGLE_STUDIO`

Run parallel payment capture, hold, transfer, reversal and approval scenarios against PostgreSQL to prove no double spend, overpayment, lost update or stale-hold leakage.

### GS19-RECON-014 — end-to-end financial reconciliation

**Status:** `PENDING_GOOGLE_STUDIO`

Seed controlled financial flows and reconcile external gateway state, invoices, payment attempts, ledger, wallets, transfers, refunds, commissions and outbox events to zero unexplained variance.

### GS19-SEC-015 — production financial security boundary

**Status:** `PENDING_GOOGLE_STUDIO`

After action-scoped authorization fixes, prove finance role/attribute separation, maker-checker, secret handling, audit immutability, PCI-sensitive-field exclusion and unauthorized-action denial.

---

# 34. Phase 17–19 rechecks, deferred boundaries and non-duplicate decisions

The following were deliberately **not** counted as additional source findings:

- Missing live AI/payment/FX/banking credentials and real provider traffic are runtime activation work, not source defects by themselves. The counted gateway findings concern missing **source orchestration/binding**, which runtime secrets alone cannot repair.
- No live PostgreSQL database was connected, no migration was applied, and no data backfill/reconciliation was attempted.
- Phase 18's process-local limiter is already explicitly called source/development-only by its runtime runbook; that fact is not duplicated as a source finding. `P18-RATE-001` is independent because the anonymous principal itself is caller-controlled and would bypass a Redis-backed limiter too.
- Phase 17 provider `NOT_CONFIGURED` state is expected before Google Studio runtime activation and was not counted.
- Phase 19 provider adapters throwing "runtime transport is pending" are not counted merely because transport is absent. The source findings are where the application never invokes the defined gateway contracts or permits financial state to advance without provider evidence.
- Existing earlier Phase 5 authorization findings are not duplicated generically. `P19-AUTH-001` is Phase 19-specific because the phase explicitly requires stronger financial ABAC/maker-checker controls and currently exposes direct manual ledger mutation behind one broad permission.
- No finding was created merely because Phase 17 source verifier could not execute in the extracted ZIP. It requires `.git` and failed at `git ls-files`; this is a verifier portability/reproducibility limitation of the audit copy, not proof that Phase 17 functional checks failed.
- A combined targeted Vitest invocation for Phase 17–19 did not finish within the audit timeout. It is therefore **not** counted as passing evidence and also not classified as a source defect without an actual failed assertion.

Verification observations at baseline `e57aad8c52a3ee6d686671870e0bf0392ba7417f`:

```text
npm run phase17:verify
→ NOT EXECUTED TO CHECKS
→ verifier aborts because extracted Download-ZIP source has no .git metadata and script calls `git ls-files`

npm run phase18:verify
→ PASS 15/15 source checks
→ PHASE18_SOURCE_VERIFIER=PASS

npm run phase19:verify
→ PASS 19/19 source checks
→ PHASE19_SOURCE_VERIFIER=PASS

Targeted Phase 17–19 Vitest set
→ TIMED OUT during audit window
→ NOT ACCEPTED AS PASS EVIDENCE
```

---

# 35. Phase 17–19 positive controls observed

Controls worth preserving during remediation:

- Phase 17 keeps provider SDK/network ownership behind provider-neutral contracts and prevents raw secret values from being accepted by the AI Admin API.
- Prompt versions are individually immutable/approved in Prisma and deployment retires the previous production deployment transactionally; the evaluation-to-version binding must be repaired without weakening that model.
- AI execution creation couples the received record with a transactional-outbox event; provider/model data-classification checks are fail-closed in the actual routing path.
- Phase 17 async payloads are encrypted/protected and list APIs redact ciphertext/IV/auth tags.
- Phase 18 source verifier passes all 15 checks, including no direct AI-provider import, no prompt/model ownership, canonical dependencies, output validation and no raw result persistence in execution records.
- Phase 18 execution enforces implementation/lifecycle/visibility/global flags before running, validates handler input/output, stores only safe execution metadata, and writes execution outbox events transactionally.
- Phase 18 university comparison already demonstrates full-page canonical traversal; scholarship recommendation should reuse the same completeness principle.
- Phase 19 uses `MoneyAmount` minor-unit strings/BigInt and rejects non-positive ledger postings; public ledger posting validates balanced debits/credits and account denomination.
- Invoice issuance/payment capture/void paths use database transactions and optimistic invoice versions; payment capture couples invoice reduction, ledger posting, receipt, audit and outbox evidence.
- Phase 19 Finance Admin approval decisions derive `checkerId` from the authenticated actor at the router rather than trusting a request-body checker ID, and repository logic prevents maker self-approval/duplicate checker decisions.
- Phase 19 financial reports group monetary totals by currency instead of directly adding unlike currencies.
- `npm run phase19:verify` currently passes all 19 source token checks; remediation must retain these controls while strengthening token checks into behavioral invariants.

---

# 36. Final discovery-batch verdict — Phase 17–19

```text
PHASE_17_TO_19_DEEP_AUDIT = COMPLETE
SOURCE_MODIFICATIONS = 0
DATABASE_CONNECTED = NO
MIGRATIONS_APPLIED = 0
GOOGLE_STUDIO_RUNTIME_EXECUTED = NO
NEW_CONFIRMED_OPEN_FINDINGS = 44
CRITICAL_NEW = 6
HIGH_NEW = 27
MEDIUM_NEW = 11
LOW_NEW = 0
RUNTIME_DEFERRED_ITEMS_NEW = 15
```

New finding distribution by phase:

| Phase | CRITICAL | HIGH | MEDIUM | LOW | Total |
|---|---:|---:|---:|---:|---:|
| **Phase 17** | 1 | 9 | 4 | 0 | **14** |
| **Phase 18** | 0 | 4 | 4 | 0 | **8** |
| **Phase 19** | 5 | 14 | 3 | 0 | **22** |
| **Batch total** | **6** | **27** | **11** | **0** | **44** |

Cumulative discovery totals for **Phase 2–19**:

```text
CRITICAL = 12
HIGH = 100
MEDIUM = 40
LOW = 1
TOTAL = 153
```

---

# 37. Audit discovery closure and next mandatory step

```text
PHASE_2_TO_19_AUDIT_DISCOVERY = COMPLETE
ALL_FINDINGS_STILL_IN_DISCOVERY_ORDER = NO
GLOBAL_REPRIORITIZATION_EXECUTED = YES
REMEDIATION_EXECUTED = NO
ZIP_MODIFIED = NO
DB_MODIFIED = NO
```

The register must **not** now be executed top-to-bottom by phase number or by raw severity count.

The mandatory global dependency-aware consolidation pass across all 153 findings is executed and frozen in Sections 38–45 below. Its governing method is:

```text
1. Identify duplicate symptoms that share one root cause.
2. Map upstream/downstream dependency edges.
3. Determine which fixes invalidate or automatically resolve later findings.
4. Separate source repairs from Google Studio runtime proof.
5. Rank by:
   - production safety / exploitability / financial-data integrity;
   - root-cause leverage;
   - dependency order;
   - blast radius;
   - migration/runtime risk;
   - required verification gates.
6. Convert the discovery register into ordered remediation waves.
7. Only then begin modifying the approved ZIP working copy.
```

That condition is now satisfied by Sections 38–45. Source repair may begin only at **W0**, using the wave closure and regression gates defined below.

---

# 38. Global audit arithmetic reconciliation

The global consolidation pass detected one arithmetic undercount in the earlier discovery summaries. **No new source defect was discovered during reprioritization.**

The Phase 2–4 batch actually contains `1 CRITICAL + 8 HIGH + 8 MEDIUM + 1 LOW = 18`, not 17.

Therefore the authoritative Phase 2–19 source backlog is:

| Severity | Correct count |
|---|---:|
| CRITICAL / P0 | **12** |
| HIGH / P1 | **100** |
| MEDIUM / P2 | **40** |
| LOW / P3 | **1** |
| **TOTAL** | **153** |

Runtime-only `PENDING_GOOGLE_STUDIO` items remain separate and are not included in this count.

# 39. Dependency-aware prioritization rules

The backlog is **not** sorted by phase number and is **not** sorted by severity alone. The frozen ordering uses these rules, in this precedence:

1. **Constitution/contract clarity before implementation.**
2. **Cross-cutting security/composition before domain behavior.**
3. **Canonical identity before consumers.**
4. **P0 at the earliest dependency-valid point.**
5. **Provider before consumer.**
6. **Model/invariant before transport/UI.**
7. **Atomicity/idempotency before concurrency scale.**
8. **No blind breaking changes:** enumerate provider + every direct consumer before changing a shared contract.
9. **Recheck before patching downstream symptoms:** upstream repair may close later findings automatically.
10. **Source closure is not runtime closure:** DB/provider/distributed-system claims remain `RUNTIME_PROOF_REQUIRED` until Google Studio evidence exists.

## 39.1 Non-obvious architectural decisions

- **Phase 19 is intentionally pulled forward to W4.** It contains five financial P0s, depends on core/reference foundations fixed in W1–W3, and Phase 13 paid-enrollment behavior should integrate against a safe finance boundary.
- **P14-CRYPTO-001 is not patched first inside Certificates.** Issuer, validity and immutable template semantics are frozen first so the signature envelope is built once against the final trust model.
- **P17-EVAL-001 is fixed before Phase 18** because Student Tools can consume Phase 17 capabilities and health.
- **CMS is delayed to W14** because it has no P0 and is not upstream of the higher-risk domain/event/AI/tool chains.
- **Stale governance is split:** target-state ambiguity is fixed in W0; historical truth reconciliation is deferred to W15 after source behavior stops moving.

## 39.2 Consolidated root-cause families

The 153 findings are not 153 independent design failures. The ordering above is driven by these repeated root-cause families:

| Root-cause family | Representative findings | Architectural treatment |
|---|---|---|
| **RC-01 — Governance/contract drift** | `GOV-ROADMAP-001`, `P2-API-001`, `P2-ARCH-001`, `P2-DATA-001`, `P4-GOV-002` | Freeze target truth first; do not code against contradictory contracts. |
| **RC-02 — Composition/DI/config drift** | `P3-CONFIG-001`, `P5-SET-003`, `P6-DI-001`, `P4-SEC-001` | Repair composition boundaries before domain services. |
| **RC-03 — Authorization policy not matching declared control model** | `P5-AUTH-001`, `P5-SEC-002`, `P16-NAV-005`, `P16-ANN-006`, `P19-AUTH-001`, `P19-APPROVAL-006` | Fix core auth first, then domain-specific maker-checker/ABAC. |
| **RC-04 — Durability / crash recovery / non-atomic orchestration** | `P5-EVT-004`, `P6-QUEUE-002`, `P8-DAG-002`, `P13-EVT-009`, `P16-SCHED-002`, `P17-ASYNC-004` | Standardize transaction, lease, replay and outbox semantics before load/runtime proof. |
| **RC-05 — Canonical identity lost at compatibility boundaries** | `P7-DATA-001`, `P9-REF-002`, `P9-REL-003`, `P10-TAX-001`, `P11-PUB-001`, `P12-ADM-007`, `P19-REFDATA-020` | Repair canonical Reference/Taxonomy foundations before consumers. |
| **RC-06 — Compatibility/optional JSON can outrank canonical state** | `P9-PUB-001`, `P12-PUB-002` | Establish canonical projection precedence once and reuse it. |
| **RC-07 — Version/immutability semantics are read-then-write or mutable** | `P9-VERS-008`, `P10-VERS-004`, `P12-ARCH-008`, `P13-VERS-010`, `P14-TPL-004`, `P17-WORKFLOW-009`, `P18-VERSION-004` | Freeze identity/version contracts before promotion/deployment logic. |
| **RC-08 — Lifecycle/publication gates diverge from persisted truth** | `P9-PUB-005`, `P10-CAN-002`, `P11-PUB-001`, `P12-PUB-003`, `P13-PUB-002`, `P15-LIFE-002`, `P18-PUBLIC-005` | Make one authoritative lifecycle state drive publication/execution. |
| **RC-09 — Client/provider evidence is trusted without authoritative binding** | `P13-ASMT-008`, `P14-ISSUE-002`, `P18-SAVE-003`, `P19-PAY-007`, `P19-TRANSFER-003` | Bind state transitions to server/provider/event evidence, not caller assertions. |
| **RC-10 — Monetary invariants are incomplete** | `P17-COST-006`, `P19-CREDIT-010`, `P19-XCUR-014`, `P19-FX-012`, `P19-COMM-018` | Currency-aware arithmetic, canonical currency resolution, approval and ledger invariants before financial workflows. |

**Consolidation rule:** when a repair in an earlier wave removes the root cause for later findings, the later findings are re-proven before any patch. This is specifically intended to reduce code churn and prevent duplicated “fixes” of the same architectural defect.

# 40. Frozen remediation waves

| Wave | Objective | Findings | P0 | P1 | P2 | P3 |
|---|---|---:|---:|---:|---:|---:|
| **W0** | Authority freeze + quality-gate readiness | **11** | 0 | 6 | 4 | 1 |
| **W1** | Core security, configuration and composition | **7** | 3 | 4 | 0 | 0 |
| **W2** | Durability + import execution foundation | **9** | 1 | 3 | 5 | 0 |
| **W3** | Canonical Reference Data + Academic Taxonomy foundation | **11** | 0 | 7 | 4 | 0 |
| **W4** | Finance safety core — intentionally pulled forward | **22** | 5 | 14 | 3 | 0 |
| **W5** | International Tests canonical/public integrity | **8** | 1 | 4 | 3 | 0 |
| **W6** | Major Platform identity, taxonomy and versioning | **5** | 0 | 4 | 1 | 0 |
| **W7** | Universities & Institutions relationship integrity | **4** | 0 | 4 | 0 | 0 |
| **W8** | Scholarships architecture + import/publication integrity | **8** | 0 | 6 | 2 | 0 |
| **W9** | Learning Platform / Course lifecycle | **13** | 0 | 13 | 0 | 0 |
| **W10** | Certificates — trust model before issuance | **11** | 1 | 8 | 2 | 0 |
| **W11** | Student Platform lifecycle, consent and projections | **10** | 0 | 8 | 2 | 0 |
| **W12** | AI Platform governance and execution safety | **14** | 1 | 9 | 4 | 0 |
| **W13** | Student Tools / Public Tool Platform | **8** | 0 | 4 | 4 | 0 |
| **W14** | CMS integrity and publishing governance | **10** | 0 | 6 | 4 | 0 |
| **W15** | Governance truth reconciliation / closure | **2** | 0 | 0 | 2 | 0 |
| **TOTAL** |  | **153** | **12** | **100** | **40** | **1** |

## W0 — Authority freeze + quality-gate readiness

**Why this wave is here:** Freeze the target architecture and repair the guardrails that will police every later patch. No domain behavior should be changed while API/data/deployment truth is still ambiguous.

**Exact repair order:**

1. `GOV-ROADMAP-001` — **HIGH** — the authoritative Roadmap v6.0 is internally stale and contradicts the current repository state
2. `P2-ROADMAP-001` — **MEDIUM** — Phase 2 uses obsolete phase numbering (`Phase 4 Lookups`) against Roadmap v6.0
3. `P2-ARCH-001` — **HIGH** — Phase 2 simultaneously mandates current microservice mechanics and approves Modular Monolith execution
4. `P2-DATA-001` — **HIGH** — Phase 2 sealed ARB report preserves an obsolete “no physical FK / string-only reference” doctrine that conflicts with the current canonical relational model
5. `P2-API-001` — **HIGH** — Phase 2 binding API contracts mandate `/v2`, while the approved interface standard and live source implement `/api/v1`
6. `P4-GOV-002` — **HIGH** — Phase 4 “certified implementation baseline” contains multiple mutually incompatible current-state claims
7. `P3-QUALITY-001` — **HIGH** — mandatory acyclic-import and JSX accessibility enforcement described by Phase 3 is absent from the active lint configuration
8. `P3-BUILD-001` — **MEDIUM** — Phase 3 mandates affected-only cached orchestration, but root build/lint/test/typecheck run workspace-wide and do not use the configured Turbo orchestrator
9. `P4-TEST-001` — **MEDIUM** — Phase 4 certifies a dedicated testing package that no longer exists
10. `P4-GIT-001` — **MEDIUM** — Phase 4 certifies commit/branch enforcement hooks that are absent in the current repository
11. `P3-ENV-001` — **LOW** — documented “blocking” Node engine enforcement is not actually strict at package-manager level

**Wave closure gate:** Roadmap/Phase-2/Phase-4 target-state decisions are explicit; lint/typecheck/build/test hooks are trustworthy enough to catch cross-phase regressions.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W1 — Core security, configuration and composition

**Why this wave is here:** Close cross-cutting authorization/composition failures before repairing any downstream admin, import, public, AI or finance behavior.

**Exact repair order:**

1. `P5-AUTH-001` — **CRITICAL** — active conditional RBAC policy evaluation grants every policy unconditionally
2. `P5-SEC-002` — **HIGH** — multiple Phase 5 control-plane mutation routers are mounted outside the protected admin authorization boundary
3. `P3-CONFIG-001` — **HIGH** — direct environment access exists inside Application and Infrastructure despite an explicit frozen configuration-boundary certification
4. `P5-SET-003` — **HIGH** — `ConfigurationResolutionService` is registered incompatibly with PROXY injection and can silently resolve configuration as null
5. `P3-AUTH-001` — **HIGH** — concrete JWT cryptography is implemented in the Application layer despite the frozen authentication boundary requiring it in Infrastructure
6. `P4-SEC-001` — **CRITICAL** — normal production/staging API bootstrap is deterministically blocked by the only wired rate limiter
7. `P6-DI-001` — **CRITICAL** — core Phase 6 source-acquisition adapters are incompatible with the app's Awilix PROXY-mode `asClass` registrations

**Wave closure gate:** Production/staging composition has a production-capable limiter injection path; conditional RBAC denies correctly; protected admin mutations are actually protected; configuration/JWT/DI boundaries compile and pass security tests.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W2 — Durability + import execution foundation

**Why this wave is here:** Establish durable event/import mechanics and remove misleading compatibility infrastructure before domain import pipelines are trusted.

**Exact repair order:**

1. `P5-EVT-004` — **HIGH** — the active Enterprise Event Foundation is process-local and non-durable
2. `P6-SEC-005` — **MEDIUM** — allowed source path prefixes use raw string-prefix matching and permit sibling-prefix escape
3. `P6-RES-006` — **MEDIUM** — caller-supplied response-size and timeout values are not bounded by hard maximums
4. `P6-QUEUE-002` — **CRITICAL** — expired RUNNING import jobs cannot be reclaimed after worker crash
5. `P6-QUEUE-003` — **HIGH** — durable queue/worker machinery is not integrated into the live import execution path
6. `P6-DUR-004` — **HIGH** — raw import snapshots are persisted to node-local filesystem paths in the active acquisition composition
7. `P6-REPLAY-007` — **MEDIUM** — Prisma fresh replay leaves persisted checkpoint/control state behind
8. `P3-INFRA-001` — **MEDIUM** — infrastructure barrel publicly exports 53 empty/constructor-only compatibility classes under implementation-like names
9. `P4-STORAGE-001` — **MEDIUM** — historical File Storage report names concrete implementations that are absent/replaced, while no-op compatibility classes remain exported under those names

**Wave closure gate:** Crash recovery, bounded acquisition, durable queue integration, raw-snapshot storage abstraction, fresh replay semantics and event durability have source-level proofs; compatibility exports are either real, explicitly deprecated, or removed after consumer migration.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W3 — Canonical Reference Data + Academic Taxonomy foundation

**Why this wave is here:** Repair canonical identity, validation, hierarchy and taxonomy first because Phases 9–13 and Finance currency integrity consume these contracts.

**Exact repair order:**

1. `P7-DATA-001` — **HIGH** — active Reference Data admin writes bypass the canonical validation service
2. `P7-DATA-002` — **HIGH** — `ReferenceCity` lacks a canonical uniqueness constraint and its upsert is race/ambiguity-prone
3. `P7-I18N-006` — **MEDIUM** — official Reference Data admin write surfaces cannot persist `nameAr` although the contracts and persistence model support it
4. `P7-API-005` — **MEDIUM** — `activeOnly=false` is not reliably expressible through the admin query parser
5. `P7-API-004` — **MEDIUM** — Reference Data routers collapse non-validation failures into HTTP 400
6. `P7-PERF-003` — **HIGH** — Reference Resolver performs unbounded full-table loads for individual lookups
7. `P8-ARCH-001` — **HIGH** — Phase 8 reimplements DAG/cycle traversal locally instead of consuming the required Phase 7 Generic Hierarchy foundation
8. `P8-DEG-005` — **MEDIUM** — DegreeLevel lifecycle status accepts arbitrary strings through the canonical Admin write surface
9. `P8-DEG-004` — **HIGH** — partial DegreeLevel updates reset omitted `displayRank` and `status`
10. `P8-MAP-003` — **HIGH** — cross-standard mapping validation does not enforce active endpoint nodes, standard consistency, or different source/target standards
11. `P8-DAG-002` — **HIGH** — edge cycle validation and edge persistence are not atomic, allowing concurrent writes to defeat the cycle check

**Wave closure gate:** Canonical writes cannot bypass validation; uniqueness/race semantics are explicit; resolver is bounded; Phase 8 consumes the canonical hierarchy foundation; lifecycle/mapping/DAG writes are validated and atomic at source level.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W4 — Finance safety core — intentionally pulled forward

**Why this wave is here:** Phase 19 is repaired earlier than its phase number suggests because it contains five financial P0 findings, depends on the core security/event/reference foundations fixed in W1–W3, and Phase 13 paid-enrollment logic should consume a safe finance boundary rather than be integrated against a broken one.

**Exact repair order:**

1. `P19-AUTH-001` — **CRITICAL** — manual ledger mutation bypasses the architecture's required ABAC and maker-checker control
2. `P19-SYSTEM-019` — **HIGH** — generic account creation can poison reserved system-account identities
3. `P19-REFDATA-020` — **HIGH** — financial currencies/scales are syntax-checked, not resolved against Phase 7 canonical currency data
4. `P19-FX-021` — **MEDIUM** — exchange-rate effective windows can be internally invalid
5. `P19-FX-012` — **HIGH** — a single finance admin can create an immediately approved manual FX override, including a zero rate
6. `P19-FX-011` — **HIGH** — automatic rates are selected before manual overrides despite the documented priority
7. `P19-WALLET-013` — **HIGH** — wallet can be bound to an arbitrary/nonexistent/mismatched ledger account
8. `P19-XCUR-014` — **CRITICAL** — transfer balance checks and settlement can mix source currency with a differently denominated wallet/account
9. `P19-CREDIT-010` — **CRITICAL** — credit notes can over-credit an invoice and do not reduce invoice amountDue/status
10. `P19-APPROVAL-006` — **HIGH** — transfer approval is matched only by target ID, not by action, amount, maker, or policy
11. `P19-REVERSAL-015` — **HIGH** — one ledger transaction can be reversed multiple times
12. `P19-IDEMP-016` — **HIGH** — draft-invoice creation does not use the supplied idempotency key
13. `P19-PAY-008` — **HIGH** — gateway payment reference is not unique and duplicate external captures are detected only after mutation
14. `P19-PAY-007` — **HIGH** — captured-payment endpoint records authorization/capture history without invoking or authenticating a payment gateway
15. `P19-TRANSFER-002` — **HIGH** — RATE_LOCKED and FEES_CALCULATED are status labels with no rate/fee/target calculation
16. `P19-TRANSFER-003` — **CRITICAL** — transfer can be marked PROCESSING/SETTLED/COMPLETED without any bank/provider execution proof
17. `P19-TRANSFER-004` — **CRITICAL** — `REVERSED` transfer state does not reverse the settlement ledger
18. `P19-TRANSFER-005` — **HIGH** — failed transfer retains its active wallet hold indefinitely
19. `P19-REFUND-009` — **HIGH** — refund source lifecycle stops at PENDING_APPROVAL and cannot complete a real refund
20. `P19-INSTALL-017` — **MEDIUM** — installment plans can be created for invalid invoice states and for already-paid value
21. `P19-COMM-018` — **HIGH** — commission accrual does not validate sign, currency, amount ceiling, or policy calculation
22. `P19-EST-022` — **MEDIUM** — persisted financial estimates bypass the standard finance mutation audit/outbox context

**Wave closure gate:** ABAC/maker-checker is enforced; system accounts/currencies/wallet denomination are invariant; FX governance is valid; provider evidence gates payment/transfer advancement; ledger reversal/holds/credit notes/idempotency are safe; finance mutation audit/outbox context is consistent.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W5 — International Tests canonical/public integrity

**Why this wave is here:** Fix the first downstream canonical domain and establish the safe DTO/public-projection pattern that later Scholarship/Course surfaces can reuse.

**Exact repair order:**

1. `P9-PUB-001` — **CRITICAL** — `optionalFields` can override canonical persisted lifecycle/security fields on read and expose a non-published test through the public slug endpoint
2. `P9-REF-002` — **HIGH** — normalized country/language relationships discard canonical Phase 7 identity and persist only legacy codes
3. `P9-REL-003` — **HIGH** — normal Admin create/update validates canonical relationships but does not persist them into normalized relationship tables
4. `P9-IMP-004` — **HIGH** — import promotion does not fail closed for explicit canonical relationship arrays
5. `P9-PUB-005` — **HIGH** — publication readiness does not enforce the Phase 9 mandatory official-registration URL and score-scale definition
6. `P9-VERS-008` — **MEDIUM** — International Test draft-version numbering is a read-then-insert race under concurrent import requests
7. `P9-COMP-006` — **MEDIUM** — International Test validation can never emit `NEEDS_REVIEW`
8. `P9-PAGE-007` — **MEDIUM** — public International Test pagination accepts negative page/page-size values and can send invalid Prisma pagination

**Wave closure gate:** Compatibility JSON cannot shadow canonical lifecycle fields; normalized references preserve canonical IDs; publication/import/versioning/pagination policies are fail-closed.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W6 — Major Platform identity, taxonomy and versioning

**Why this wave is here:** Freeze the Major identity/dedupe contract before changing resolver/versioning behavior, then repair taxonomy and publication semantics consumed by Universities.

**Exact repair order:**

1. `P10-GOV-005` — **MEDIUM** — active Phase 10 architecture documents and the implemented root/profile identity model disagree on the deduplication key
2. `P10-TAX-001` — **HIGH** — the production DI path constructs the Major taxonomy resolver from static seed definitions that contain no database node IDs
3. `P10-CAN-002` — **HIGH** — Major completeness/publication checks reference presence, not active canonical DegreeLevel/taxonomy validity
4. `P10-CMP-003` — **HIGH** — Major completeness source-identity logic disagrees with the publication policy and can downgrade valid imported majors
5. `P10-VERS-004` — **HIGH** — duplicate Major import selects the oldest version as “previous” and can generate a duplicate version number

**Wave closure gate:** Major identity contract is singular; taxonomy resolver uses canonical IDs; completeness checks active canonical entities; import/version promotion is monotonic and deterministic.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W7 — Universities & Institutions relationship integrity

**Why this wave is here:** University provenance and structural relationships must be trustworthy before Scholarships and public cross-domain discovery depend on them.

**Exact repair order:**

1. `P11-SRC-004` — **HIGH** — University source provenance can remain attached to the wrong University identity
2. `P11-REL-002` — **HIGH** — normalized University replacement can silently discard campus and organization-unit relationships
3. `P11-IMPORT-003` — **HIGH** — Stage 3 accepted-test change plans are structurally non-committable by the paired executor
4. `P11-PUB-001` — **HIGH** — publication readiness still keys major/degree enforcement to stale `status=MATCHED` instead of the normalized mapping state

**Wave closure gate:** Source identity cannot cross-bind; normalized replacement is relation-loss fail-closed; accepted change plans are executable; publication reads the normalized mapping state.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W8 — Scholarships architecture + import/publication integrity

**Why this wave is here:** Repair missing domain model/versioning first, then dedupe and import-decision gates, then public/admin projections. Phase 18 recommendations wait for this wave.

**Exact repair order:**

1. `P12-ARCH-008` — **HIGH** — required Scholarship versioning, Sponsor context, and Application Cycle architecture is absent from the active persistence/domain model
2. `P12-DEDUP-004` — **HIGH** — active Scholarship dedupe identity omits country and official URL required by the architecture
3. `P12-DEC-005` — **HIGH** — durable verification/canonical decisions are visible to Import Center but ignored by the atomic transfer gate
4. `P12-HANDOFF-006` — **HIGH** — atomic transfer ignores canonical screening stored in the canonical `_domainHandoff`
5. `P12-PUB-003` — **HIGH** — Scholarship publication does not require VERIFIED source state or resolved canonical relationships
6. `P12-PUB-002` — **MEDIUM** — public Scholarship DTO can reintroduce hidden or canonical fields from arbitrary `optionalFields`
7. `P12-ADM-007` — **MEDIUM** — admin country filtering still queries legacy compatibility JSON instead of the normalized canonical country reference
8. `P12-PUB-001` — **HIGH** — public Scholarship API accepts filters that the repository silently ignores

**Wave closure gate:** Sponsor/application-cycle/version model is explicit; dedupe identity matches architecture; durable verification/canonical decisions gate transfer; public/admin queries use normalized canonical data and cannot leak hidden fields.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W9 — Learning Platform / Course lifecycle

**Why this wave is here:** Define immutable course/question and Learning Path ownership first; then secure imported-course publication; then enforce curriculum/progress/assessment/enrollment invariants; only expose routes after use cases are safe.

**Exact repair order:**

1. `P13-VERS-010` — **HIGH** — mandatory Course/question versioning and historical immutability have no persistence model
2. `P13-SCOPE-013` — **HIGH** — Learning Path exists as an event contract but not as an owned aggregate/runtime capability
3. `P13-LINK-003` — **HIGH** — `VERIFIED_DIRECT` proves network health and approved domain, not that the URL is a direct course page
4. `P13-URL-004` — **HIGH** — generic Course PATCH can change an imported course URL outside the controlled source-lineage workflow
5. `P13-ELIG-005` — **HIGH** — imported external courses can be reclassified as paid/non-free yet still become public through the free-course publication path
6. `P13-PUB-002` — **HIGH** — generic Course lifecycle endpoints bypass imported-course source/link publication gates
7. `P13-CURR-006` — **HIGH** — curriculum creation/list operations do not enforce same-course ownership of referenced child entities
8. `P13-PROG-007` — **HIGH** — progress and quiz-attempt records can cross-bind to foreign Course children and distort completion
9. `P13-ASMT-008` — **HIGH** — Course completion ignores passing-assessment criteria and quiz score/pass state is caller-controlled
10. `P13-ENR-012` — **HIGH** — enrollment policy does not enforce publication, prerequisites, capacity, eligibility, or paid-course financial clearance
11. `P13-EVT-009` — **HIGH** — Course completion persistence and `CourseCompleted` event publication are a non-atomic dual write
12. `P13-PUBEVT-011` — **HIGH** — Course publication changes status but emits no authoritative `CoursePublished` integration event
13. `P13-API-001` — **HIGH** — enrollment, progress, quiz-attempt, and completion use cases are wired in DI but have no active API route

**Wave closure gate:** Direct-course provenance is controlled; paid/free eligibility is coherent; child entities cannot cross-bind; completion is policy-derived and transactionally evented; CoursePublished exists; API exposure is added last.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W10 — Certificates — trust model before issuance

**Why this wave is here:** The certificate P0 is not patched in isolation: issuer, validity and immutable template/version semantics are frozen first so the cryptographic envelope is designed once against the final trust model.

**Exact repair order:**

1. `P14-ISSUER-006` — **HIGH** — the mandatory accredited Issuer aggregate is reduced to free-form fields
2. `P14-VALIDITY-009` — **HIGH** — Expiring/Renewable certificate lifecycle exists in contracts but normal source issuance can only create Permanent certificates
3. `P14-TPL-004` — **HIGH** — template “versioning” is a mutable column, not an immutable template-version aggregate
4. `P14-TPL-005` — **HIGH** — automatic fallback template creation bypasses the required Draft → Approval → Active governance
5. `P14-GOV-010` — **MEDIUM** — template lifecycle mutations have no actor-specific audit/outbox trail and only one broad permission boundary
6. `P14-DATA-011` — **MEDIUM** — same-domain certificate/template/ledger references have no database-enforced referential integrity
7. `P14-CRYPTO-001` — **CRITICAL** — the certificate signature/hash does not seal issuer, validity, certificate type, or expiration semantics
8. `P14-ISSUE-002` — **HIGH** — a privileged HTTP caller can synthesize a CourseCompleted receipt and issue an initial certificate without the authoritative completion event
9. `P14-PATH-003` — **HIGH** — LearningPathCompleted is declared as a Phase 14 issuance trigger but the source has no learning-path issuance contract
10. `P14-REISSUE-007` — **HIGH** — reissuance copies revocation state into the replacement certificate
11. `P14-EVT-008` — **HIGH** — CertificateIssued outbox payload does not satisfy the Phase 14 event contract or Phase 15 projection needs

**Wave closure gate:** Issuer/template/validity references are governed; signed material seals all trust-critical semantics; issuance is event-authoritative; reissue is clean; CertificateIssued payload satisfies Phase 15 projection contracts.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W11 — Student Platform lifecycle, consent and projections

**Why this wave is here:** Repair the workspace lifecycle before privacy/snapshot/statistics behavior. This wave consumes corrected Phase 14 events and becomes the trusted persistence target for Phase 18 saved results.

**Exact repair order:**

1. `P15-INIT-001` — **HIGH** — normal student GET traffic can synchronously create an ACTIVE workspace and bypass event-driven INITIALIZING
2. `P15-LIFE-002` — **HIGH** — StudentIdentitySuspended / StudentIdentityArchived do not drive the workspace lifecycle
3. `P15-SYNC-003` — **HIGH** — suspended/archived workspaces continue accepting integration-event projections
4. `P15-READ-004` — **HIGH** — Archived workspaces remain available through the normal student read model
5. `P15-CONSENT-007` — **HIGH** — privacy preference changes have no dedicated consent ledger or auditable decision payload
6. `P15-SNAP-005` — **HIGH** — snapshot creation is a write path that bypasses the Suspended/Archived write guard
7. `P15-PRIV-006` — **HIGH** — snapshots can roll privacy/consent preferences backward without a new consent decision
8. `P15-AUDIT-009` — **MEDIUM** — system/event-driven workspace creation is recorded as a USER action by the student
9. `P15-STATS-008` — **HIGH** — dashboard “personal statistics” are computed from capped display windows and become incorrect for larger histories
10. `P15-QG-010` — **MEDIUM** — official Phase 15 source verification fails on the current valid router because it searches formatting, not syntax/semantics

**Wave closure gate:** INITIALIZING/ACTIVE/SUSPENDED/ARCHIVED semantics are consistent across reads/writes/events; consent has an audit ledger; snapshots cannot roll privacy backward; statistics are complete; source verifier is semantic rather than formatting-fragile.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W12 — AI Platform governance and execution safety

**Why this wave is here:** Stabilize prompt identity first, then evaluation correctness and workflow version binding; only then harden quotas, async execution, idempotency and provider resilience. Phase 18 AI tools wait for this wave.

**Exact repair order:**

1. `P17-PROMPT-012` — **MEDIUM** — capability execution selects the first matching active prompt without a uniqueness invariant
2. `P17-EVAL-001` — **CRITICAL** — deployment gate can certify a prompt version that was never evaluated
3. `P17-EVAL-002` — **HIGH** — five declared evaluator types silently behave as automatic passes
4. `P17-EVAL-003` — **HIGH** — MODEL/ROUTING/WORKFLOW/KNOWLEDGE evaluation targets are not actually targeted
5. `P17-WORKFLOW-009` — **HIGH** — a queued workflow run is not bound to the workflow version it records
6. `P17-WORKFLOW-008` — **HIGH** — workflow `dependsOn` and `retryLimit` contracts are ignored
7. `P17-HUMAN-010` — **HIGH** — consumer `requireHumanReview` policy is declared but never enforced
8. `P17-SCHEMA-011` — **MEDIUM** — structured-output validation implements only a shallow subset of the advertised schema contract
9. `P17-GUARD-007` — **HIGH** — governed regex patterns can trigger invalid-regex failures or catastrophic backtracking on request threads
10. `P17-QUOTA-005` — **HIGH** — quota enforcement is check-then-act and can overshoot under concurrency
11. `P17-COST-006` — **HIGH** — AI monetary budgets and overview add unlike currencies as if they were one currency
12. `P17-ASYNC-004` — **HIGH** — worker crash can leave an async AI job permanently RUNNING
13. `P17-IDEMP-013` — **MEDIUM** — concurrent duplicate AI requests can surface a uniqueness error instead of replaying the first execution
14. `P17-RESIL-014` — **MEDIUM** — retry backoff has no jitter and circuit-breaker state is process-local

**Wave closure gate:** Deployment can certify only the exact evaluated version; evaluator types/targets are real; workflow contracts are honored; human review/output guardrails are enforced; quotas/costs are currency-safe; async/idempotency/resilience semantics are bounded.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W13 — Student Tools / Public Tool Platform

**Why this wave is here:** This wave deliberately waits for Scholarships, Student Platform, AI and the production rate-limit foundation. That avoids implementing tools against unstable upstream contracts.

**Exact repair order:**

1. `P18-VERSION-004` — **HIGH** — tool schema/dependency changes can occur under an unchanged semantic version
2. `P18-PUBLIC-005` — **MEDIUM** — public catalog/detail exposure is governed mainly by `publicEnabled`, not executable lifecycle state
3. `P18-HEALTH-008` — **MEDIUM** — Phase 17 dependency health can report READY for a route that actual execution will reject
4. `P18-RATE-001` — **HIGH** — anonymous clients can bypass per-session rate limits by rotating a trusted request header
5. `P18-RECO-002` — **HIGH** — scholarship recommendation silently ignores published candidates after the first result page
6. `P18-SAVE-003` — **HIGH** — saved student-tool result is supplied by the client and is not cryptographically/provenance-bound to the execution
7. `P18-IDEMP-007` — **MEDIUM** — concurrent identical tool requests can fail on the uniqueness constraint instead of replaying
8. `P18-IDEMP-006` — **MEDIUM** — successful idempotent replay cannot return the original transient tool result

**Wave closure gate:** Tool versions change when schemas/dependencies change; public exposure follows executable lifecycle; health matches real execution; anonymous identity is server-derived; recommendations traverse the complete candidate set; saved results are provenance-bound; idempotent replay is deterministic.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W14 — CMS integrity and publishing governance

**Why this wave is here:** CMS has no P0 and is not an upstream dependency of the repaired domain/event/AI chains above, so it is intentionally delayed until higher-risk cross-domain work is stable.

**Exact repair order:**

1. `P16-LOCALE-001` — **HIGH** — locale-specific workflow transitions overwrite one global ContentNode status and destroy independent locale lifecycle truth
2. `P16-NAV-005` — **HIGH** — navigation Maker-Checker can be bypassed because the checker can replace the menu content while publishing it
3. `P16-ANN-006` — **HIGH** — announcement Maker-Checker has the same “edit while approving” bypass
4. `P16-SCHED-002` — **HIGH** — scheduled publishing jobs have no atomic claim/lease and can be double-processed or marked FAILED after publication
5. `P16-SEO-004` — **HIGH** — admin-supplied canonical URLs bypass the architecture's strict canonical-generation rule
6. `P16-SEO-003` — **HIGH** — generated canonical URLs and slug-change redirects hardcode the `/articles/` route for every CMS content type
7. `P16-REDIR-008` — **MEDIUM** — redirect loop prevention detects only A↔B pairs and permits longer cycles
8. `P16-NAV-010` — **MEDIUM** — navigation validation allows orphan parentNodeId references
9. `P16-BLOCK-009` — **MEDIUM** — “schema validation” is shallow and accepts undeclared block fields
10. `P16-TAG-007` — **MEDIUM** — public tag filtering happens after database pagination, producing missing results and false totals

**Wave closure gate:** Locale workflow truth is independent; maker-checker cannot edit while approving; scheduler claim/lease is atomic; canonical routing is content-type aware; redirect/navigation/block validation is graph/schema-safe; pagination totals are correct.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

## W15 — Governance truth reconciliation / closure

**Why this wave is here:** Only after source behavior is repaired should stale historical completion claims be rewritten to match final truth; doing it earlier would create another round of documentation drift.

**Exact repair order:**

1. `P2-GOV-001` — **MEDIUM** — sealed Phase 2 ARB report still says Transactional Outbox source implementation is absent although current source contains it
2. `P4-GOV-001` — **MEDIUM** — Phase 4.21 still declares Transactional Outbox source implementation missing after the source has implemented it

**Wave closure gate:** Current governance reports agree with the repaired source and explicitly distinguish historical claims from active truth.

**Mandatory regression rule:** run wave-targeted unit/contract tests plus full repository typecheck/build/lint and every existing phase source verifier touched by this wave. If a shared contract changed, rerun all known direct-consumer tests before closing the wave.

# 41. Master ordered remediation backlog — 1 → 153

This sequence is the authoritative source repair queue. A sequence number does **not** require a separate patch: if an upstream repair resolves a later finding, re-prove it and close it as `RESOLVED_BY_UPSTREAM_REMEDIATION` instead of making a redundant change.

| Seq | Wave | Finding | Priority | Owner | Short title |
|---:|---|---|---|---|---|
| 1 | W0 | `GOV-ROADMAP-001` | **P1 / HIGH** | Cross-cutting governance | the authoritative Roadmap v6.0 is internally stale and contradicts the current repository state |
| 2 | W0 | `P2-ROADMAP-001` | **P2 / MEDIUM** | Phase 2 / Roadmap consistency | Phase 2 uses obsolete phase numbering (`Phase 4 Lookups`) against Roadmap v6.0 |
| 3 | W0 | `P2-ARCH-001` | **P1 / HIGH** | Phase 2 — Solution Architecture | Phase 2 simultaneously mandates current microservice mechanics and approves Modular Monolith execution |
| 4 | W0 | `P2-DATA-001` | **P1 / HIGH** | Phase 2 — ARB / Data Architecture | Phase 2 sealed ARB report preserves an obsolete “no physical FK / string-only reference” doctrine that conflicts with the current canonical relational model |
| 5 | W0 | `P2-API-001` | **P1 / HIGH** | Phase 2 — Solution Architecture / API | Phase 2 binding API contracts mandate `/v2`, while the approved interface standard and live source implement `/api/v1` |
| 6 | W0 | `P4-GOV-002` | **P1 / HIGH** | Phase 4 — Architecture Governance | Phase 4 “certified implementation baseline” contains multiple mutually incompatible current-state claims |
| 7 | W0 | `P3-QUALITY-001` | **P1 / HIGH** | Phase 3 — Development Foundation | mandatory acyclic-import and JSX accessibility enforcement described by Phase 3 is absent from the active lint configuration |
| 8 | W0 | `P3-BUILD-001` | **P2 / MEDIUM** | Phase 3 — Monorepo / CI foundation | Phase 3 mandates affected-only cached orchestration, but root build/lint/test/typecheck run workspace-wide and do not use the configured Turbo orchestrator |
| 9 | W0 | `P4-TEST-001` | **P2 / MEDIUM** | Phase 4 — Testing Foundation | Phase 4 certifies a dedicated testing package that no longer exists |
| 10 | W0 | `P4-GIT-001` | **P2 / MEDIUM** | Phase 4 — Git Foundation | Phase 4 certifies commit/branch enforcement hooks that are absent in the current repository |
| 11 | W0 | `P3-ENV-001` | **P3 / LOW** | Phase 3 — Development Environment | documented “blocking” Node engine enforcement is not actually strict at package-manager level |
| 12 | W1 | `P5-AUTH-001` | **P0 / CRITICAL** | Phase 5 — Authorization Foundation | active conditional RBAC policy evaluation grants every policy unconditionally |
| 13 | W1 | `P5-SEC-002` | **P1 / HIGH** | Phase 5 — API Composition / Security | multiple Phase 5 control-plane mutation routers are mounted outside the protected admin authorization boundary |
| 14 | W1 | `P3-CONFIG-001` | **P1 / HIGH** | Phase 3/4 — Configuration Foundation | direct environment access exists inside Application and Infrastructure despite an explicit frozen configuration-boundary certification |
| 15 | W1 | `P5-SET-003` | **P1 / HIGH** | Phase 5 — Settings / Configuration | `ConfigurationResolutionService` is registered incompatibly with PROXY injection and can silently resolve configuration as null |
| 16 | W1 | `P3-AUTH-001` | **P1 / HIGH** | Phase 3/4 — Authentication Foundation | concrete JWT cryptography is implemented in the Application layer despite the frozen authentication boundary requiring it in Infrastructure |
| 17 | W1 | `P4-SEC-001` | **P0 / CRITICAL** | Phase 4 — Security / API Composition | normal production/staging API bootstrap is deterministically blocked by the only wired rate limiter |
| 18 | W1 | `P6-DI-001` | **P0 / CRITICAL** | Phase 6 — Import Foundation | core Phase 6 source-acquisition adapters are incompatible with the app's Awilix PROXY-mode `asClass` registrations |
| 19 | W2 | `P5-EVT-004` | **P1 / HIGH** | Phase 5 — Enterprise Events | the active Enterprise Event Foundation is process-local and non-durable |
| 20 | W2 | `P6-SEC-005` | **P2 / MEDIUM** | Phase 6 — Source Network Security | allowed source path prefixes use raw string-prefix matching and permit sibling-prefix escape |
| 21 | W2 | `P6-RES-006` | **P2 / MEDIUM** | Phase 6 — Source Acquisition | caller-supplied response-size and timeout values are not bounded by hard maximums |
| 22 | W2 | `P6-QUEUE-002` | **P0 / CRITICAL** | Phase 6 — Durable Import Queue | expired RUNNING import jobs cannot be reclaimed after worker crash |
| 23 | W2 | `P6-QUEUE-003` | **P1 / HIGH** | Phase 6 — Import Foundation | durable queue/worker machinery is not integrated into the live import execution path |
| 24 | W2 | `P6-DUR-004` | **P1 / HIGH** | Phase 6 — Raw Import Artifact Persistence | raw import snapshots are persisted to node-local filesystem paths in the active acquisition composition |
| 25 | W2 | `P6-REPLAY-007` | **P2 / MEDIUM** | Phase 6 — Durable Import Queue | Prisma fresh replay leaves persisted checkpoint/control state behind |
| 26 | W2 | `P3-INFRA-001` | **P2 / MEDIUM** | Phase 3/4 — Infrastructure Foundation | infrastructure barrel publicly exports 53 empty/constructor-only compatibility classes under implementation-like names |
| 27 | W2 | `P4-STORAGE-001` | **P2 / MEDIUM** | Phase 4 — File Storage / EAP transition | historical File Storage report names concrete implementations that are absent/replaced, while no-op compatibility classes remain exported under those names |
| 28 | W3 | `P7-DATA-001` | **P1 / HIGH** | Phase 7 — Reference Data | active Reference Data admin writes bypass the canonical validation service |
| 29 | W3 | `P7-DATA-002` | **P1 / HIGH** | Phase 7 — Reference Data / Cities | `ReferenceCity` lacks a canonical uniqueness constraint and its upsert is race/ambiguity-prone |
| 30 | W3 | `P7-I18N-006` | **P2 / MEDIUM** | Phase 7 — Reference Data / i18n | official Reference Data admin write surfaces cannot persist `nameAr` although the contracts and persistence model support it |
| 31 | W3 | `P7-API-005` | **P2 / MEDIUM** | Phase 7 — Reference Data Admin API | `activeOnly=false` is not reliably expressible through the admin query parser |
| 32 | W3 | `P7-API-004` | **P2 / MEDIUM** | Phase 7 — Reference Data API | Reference Data routers collapse non-validation failures into HTTP 400 |
| 33 | W3 | `P7-PERF-003` | **P1 / HIGH** | Phase 7 — Reference Resolver | Reference Resolver performs unbounded full-table loads for individual lookups |
| 34 | W3 | `P8-ARCH-001` | **P1 / HIGH** | Phase 8 — Academic Taxonomy | Phase 8 reimplements DAG/cycle traversal locally instead of consuming the required Phase 7 Generic Hierarchy foundation |
| 35 | W3 | `P8-DEG-005` | **P2 / MEDIUM** | Phase 8 — DegreeLevel | DegreeLevel lifecycle status accepts arbitrary strings through the canonical Admin write surface |
| 36 | W3 | `P8-DEG-004` | **P1 / HIGH** | Phase 8 — DegreeLevel | partial DegreeLevel updates reset omitted `displayRank` and `status` |
| 37 | W3 | `P8-MAP-003` | **P1 / HIGH** | Phase 8 — Academic Taxonomy | cross-standard mapping validation does not enforce active endpoint nodes, standard consistency, or different source/target standards |
| 38 | W3 | `P8-DAG-002` | **P1 / HIGH** | Phase 8 — Academic Taxonomy | edge cycle validation and edge persistence are not atomic, allowing concurrent writes to defeat the cycle check |
| 39 | W4 | `P19-AUTH-001` | **P0 / CRITICAL** | Phase 19 — Financial Authorization / Ledger | manual ledger mutation bypasses the architecture's required ABAC and maker-checker control |
| 40 | W4 | `P19-SYSTEM-019` | **P1 / HIGH** | Phase 19 — Chart of Accounts | generic account creation can poison reserved system-account identities |
| 41 | W4 | `P19-REFDATA-020` | **P1 / HIGH** | Phase 19 — Currency Reference Boundary | financial currencies/scales are syntax-checked, not resolved against Phase 7 canonical currency data |
| 42 | W4 | `P19-FX-021` | **P2 / MEDIUM** | Phase 19 — Exchange Rates | exchange-rate effective windows can be internally invalid |
| 43 | W4 | `P19-FX-012` | **P1 / HIGH** | Phase 19 — Exchange Rates / Governance | a single finance admin can create an immediately approved manual FX override, including a zero rate |
| 44 | W4 | `P19-FX-011` | **P1 / HIGH** | Phase 19 — Exchange Rates | automatic rates are selected before manual overrides despite the documented priority |
| 45 | W4 | `P19-WALLET-013` | **P1 / HIGH** | Phase 19 — Wallet / Ledger | wallet can be bound to an arbitrary/nonexistent/mismatched ledger account |
| 46 | W4 | `P19-XCUR-014` | **P0 / CRITICAL** | Phase 19 — Transfer / Multi-Currency | transfer balance checks and settlement can mix source currency with a differently denominated wallet/account |
| 47 | W4 | `P19-CREDIT-010` | **P0 / CRITICAL** | Phase 19 — Billing / Credit Notes | credit notes can over-credit an invoice and do not reduce invoice amountDue/status |
| 48 | W4 | `P19-APPROVAL-006` | **P1 / HIGH** | Phase 19 — Financial Approval | transfer approval is matched only by target ID, not by action, amount, maker, or policy |
| 49 | W4 | `P19-REVERSAL-015` | **P1 / HIGH** | Phase 19 — General Ledger | one ledger transaction can be reversed multiple times |
| 50 | W4 | `P19-IDEMP-016` | **P1 / HIGH** | Phase 19 — Billing / Idempotency | draft-invoice creation does not use the supplied idempotency key |
| 51 | W4 | `P19-PAY-008` | **P1 / HIGH** | Phase 19 — Payments / Idempotency | gateway payment reference is not unique and duplicate external captures are detected only after mutation |
| 52 | W4 | `P19-PAY-007` | **P1 / HIGH** | Phase 19 — Payments | captured-payment endpoint records authorization/capture history without invoking or authenticating a payment gateway |
| 53 | W4 | `P19-TRANSFER-002` | **P1 / HIGH** | Phase 19 — Money Transfer | RATE_LOCKED and FEES_CALCULATED are status labels with no rate/fee/target calculation |
| 54 | W4 | `P19-TRANSFER-003` | **P0 / CRITICAL** | Phase 19 — Money Transfer / Banking ACL | transfer can be marked PROCESSING/SETTLED/COMPLETED without any bank/provider execution proof |
| 55 | W4 | `P19-TRANSFER-004` | **P0 / CRITICAL** | Phase 19 — Money Transfer / Ledger | `REVERSED` transfer state does not reverse the settlement ledger |
| 56 | W4 | `P19-TRANSFER-005` | **P1 / HIGH** | Phase 19 — Money Transfer / Wallet | failed transfer retains its active wallet hold indefinitely |
| 57 | W4 | `P19-REFUND-009` | **P1 / HIGH** | Phase 19 — Refunds | refund source lifecycle stops at PENDING_APPROVAL and cannot complete a real refund |
| 58 | W4 | `P19-INSTALL-017` | **P2 / MEDIUM** | Phase 19 — Installments | installment plans can be created for invalid invoice states and for already-paid value |
| 59 | W4 | `P19-COMM-018` | **P1 / HIGH** | Phase 19 — Commissions | commission accrual does not validate sign, currency, amount ceiling, or policy calculation |
| 60 | W4 | `P19-EST-022` | **P2 / MEDIUM** | Phase 19 — Financial Estimation | persisted financial estimates bypass the standard finance mutation audit/outbox context |
| 61 | W5 | `P9-PUB-001` | **P0 / CRITICAL** | Phase 9 — International Tests | `optionalFields` can override canonical persisted lifecycle/security fields on read and expose a non-published test through the public slug endpoint |
| 62 | W5 | `P9-REF-002` | **P1 / HIGH** | Phase 9 — International Tests / Reference Relationships | normalized country/language relationships discard canonical Phase 7 identity and persist only legacy codes |
| 63 | W5 | `P9-REL-003` | **P1 / HIGH** | Phase 9 — International Tests | normal Admin create/update validates canonical relationships but does not persist them into normalized relationship tables |
| 64 | W5 | `P9-IMP-004` | **P1 / HIGH** | Phase 9 — International Test Import Promotion | import promotion does not fail closed for explicit canonical relationship arrays |
| 65 | W5 | `P9-PUB-005` | **P1 / HIGH** | Phase 9 — International Tests Publication | publication readiness does not enforce the Phase 9 mandatory official-registration URL and score-scale definition |
| 66 | W5 | `P9-VERS-008` | **P2 / MEDIUM** | Phase 9 — International Tests Versioning | International Test draft-version numbering is a read-then-insert race under concurrent import requests |
| 67 | W5 | `P9-COMP-006` | **P2 / MEDIUM** | Phase 9 — International Tests | International Test validation can never emit `NEEDS_REVIEW` |
| 68 | W5 | `P9-PAGE-007` | **P2 / MEDIUM** | Phase 9 — International Tests API | public International Test pagination accepts negative page/page-size values and can send invalid Prisma pagination |
| 69 | W6 | `P10-GOV-005` | **P2 / MEDIUM** | Phase 10 — Major Platform Governance | active Phase 10 architecture documents and the implemented root/profile identity model disagree on the deduplication key |
| 70 | W6 | `P10-TAX-001` | **P1 / HIGH** | Phase 10 — Major Platform / Taxonomy Resolution | the production DI path constructs the Major taxonomy resolver from static seed definitions that contain no database node IDs |
| 71 | W6 | `P10-CAN-002` | **P1 / HIGH** | Phase 10 — Major Platform | Major completeness/publication checks reference presence, not active canonical DegreeLevel/taxonomy validity |
| 72 | W6 | `P10-CMP-003` | **P1 / HIGH** | Phase 10 — Major Platform / Completeness | Major completeness source-identity logic disagrees with the publication policy and can downgrade valid imported majors |
| 73 | W6 | `P10-VERS-004` | **P1 / HIGH** | Phase 10 — Major Import Versioning | duplicate Major import selects the oldest version as “previous” and can generate a duplicate version number |
| 74 | W7 | `P11-SRC-004` | **P1 / HIGH** | Phase 11 — Universities & Institutions | University source provenance can remain attached to the wrong University identity |
| 75 | W7 | `P11-REL-002` | **P1 / HIGH** | Phase 11 — Universities & Institutions | normalized University replacement can silently discard campus and organization-unit relationships |
| 76 | W7 | `P11-IMPORT-003` | **P1 / HIGH** | Phase 11 — Universities & Institutions | Stage 3 accepted-test change plans are structurally non-committable by the paired executor |
| 77 | W7 | `P11-PUB-001` | **P1 / HIGH** | Phase 11 — Universities & Institutions | publication readiness still keys major/degree enforcement to stale `status=MATCHED` instead of the normalized mapping state |
| 78 | W8 | `P12-ARCH-008` | **P1 / HIGH** | Phase 12 — Scholarships | required Scholarship versioning, Sponsor context, and Application Cycle architecture is absent from the active persistence/domain model |
| 79 | W8 | `P12-DEDUP-004` | **P1 / HIGH** | Phase 12 — Scholarships | active Scholarship dedupe identity omits country and official URL required by the architecture |
| 80 | W8 | `P12-DEC-005` | **P1 / HIGH** | Phase 12 — Scholarships | durable verification/canonical decisions are visible to Import Center but ignored by the atomic transfer gate |
| 81 | W8 | `P12-HANDOFF-006` | **P1 / HIGH** | Phase 12 — Scholarships | atomic transfer ignores canonical screening stored in the canonical `_domainHandoff` |
| 82 | W8 | `P12-PUB-003` | **P1 / HIGH** | Phase 12 — Scholarships | Scholarship publication does not require VERIFIED source state or resolved canonical relationships |
| 83 | W8 | `P12-PUB-002` | **P2 / MEDIUM** | Phase 12 — Scholarships | public Scholarship DTO can reintroduce hidden or canonical fields from arbitrary `optionalFields` |
| 84 | W8 | `P12-ADM-007` | **P2 / MEDIUM** | Phase 12 — Scholarships | admin country filtering still queries legacy compatibility JSON instead of the normalized canonical country reference |
| 85 | W8 | `P12-PUB-001` | **P1 / HIGH** | Phase 12 — Scholarships | public Scholarship API accepts filters that the repository silently ignores |
| 86 | W9 | `P13-VERS-010` | **P1 / HIGH** | Phase 13 — Learning Platform | mandatory Course/question versioning and historical immutability have no persistence model |
| 87 | W9 | `P13-SCOPE-013` | **P1 / HIGH** | Phase 13 — Learning Platform | Learning Path exists as an event contract but not as an owned aggregate/runtime capability |
| 88 | W9 | `P13-LINK-003` | **P1 / HIGH** | Phase 13 — Learning Platform | `VERIFIED_DIRECT` proves network health and approved domain, not that the URL is a direct course page |
| 89 | W9 | `P13-URL-004` | **P1 / HIGH** | Phase 13 — Learning Platform | generic Course PATCH can change an imported course URL outside the controlled source-lineage workflow |
| 90 | W9 | `P13-ELIG-005` | **P1 / HIGH** | Phase 13 — Learning Platform | imported external courses can be reclassified as paid/non-free yet still become public through the free-course publication path |
| 91 | W9 | `P13-PUB-002` | **P1 / HIGH** | Phase 13 — Learning Platform | generic Course lifecycle endpoints bypass imported-course source/link publication gates |
| 92 | W9 | `P13-CURR-006` | **P1 / HIGH** | Phase 13 — Learning Platform | curriculum creation/list operations do not enforce same-course ownership of referenced child entities |
| 93 | W9 | `P13-PROG-007` | **P1 / HIGH** | Phase 13 — Learning Platform | progress and quiz-attempt records can cross-bind to foreign Course children and distort completion |
| 94 | W9 | `P13-ASMT-008` | **P1 / HIGH** | Phase 13 — Learning Platform | Course completion ignores passing-assessment criteria and quiz score/pass state is caller-controlled |
| 95 | W9 | `P13-ENR-012` | **P1 / HIGH** | Phase 13 — Learning Platform | enrollment policy does not enforce publication, prerequisites, capacity, eligibility, or paid-course financial clearance |
| 96 | W9 | `P13-EVT-009` | **P1 / HIGH** | Phase 13 — Learning Platform | Course completion persistence and `CourseCompleted` event publication are a non-atomic dual write |
| 97 | W9 | `P13-PUBEVT-011` | **P1 / HIGH** | Phase 13 — Learning Platform | Course publication changes status but emits no authoritative `CoursePublished` integration event |
| 98 | W9 | `P13-API-001` | **P1 / HIGH** | Phase 13 — Learning Platform | enrollment, progress, quiz-attempt, and completion use cases are wired in DI but have no active API route |
| 99 | W10 | `P14-ISSUER-006` | **P1 / HIGH** | Phase 14 — Issuer Management | the mandatory accredited Issuer aggregate is reduced to free-form fields |
| 100 | W10 | `P14-VALIDITY-009` | **P1 / HIGH** | Phase 14 — Validity & Renewal | Expiring/Renewable certificate lifecycle exists in contracts but normal source issuance can only create Permanent certificates |
| 101 | W10 | `P14-TPL-004` | **P1 / HIGH** | Phase 14 — Certificate Templates | template “versioning” is a mutable column, not an immutable template-version aggregate |
| 102 | W10 | `P14-TPL-005` | **P1 / HIGH** | Phase 14 — Certificate Templates | automatic fallback template creation bypasses the required Draft → Approval → Active governance |
| 103 | W10 | `P14-GOV-010` | **P2 / MEDIUM** | Phase 14 — Template Governance | template lifecycle mutations have no actor-specific audit/outbox trail and only one broad permission boundary |
| 104 | W10 | `P14-DATA-011` | **P2 / MEDIUM** | Phase 14 — Persistence | same-domain certificate/template/ledger references have no database-enforced referential integrity |
| 105 | W10 | `P14-CRYPTO-001` | **P0 / CRITICAL** | Phase 14 — Enterprise Certificates Platform | the certificate signature/hash does not seal issuer, validity, certificate type, or expiration semantics |
| 106 | W10 | `P14-ISSUE-002` | **P1 / HIGH** | Phase 14 — Certificate Issuance | a privileged HTTP caller can synthesize a CourseCompleted receipt and issue an initial certificate without the authoritative completion event |
| 107 | W10 | `P14-PATH-003` | **P1 / HIGH** | Phase 14 — Certificate Issuance | LearningPathCompleted is declared as a Phase 14 issuance trigger but the source has no learning-path issuance contract |
| 108 | W10 | `P14-REISSUE-007` | **P1 / HIGH** | Phase 14 — Reissue Workflow | reissuance copies revocation state into the replacement certificate |
| 109 | W10 | `P14-EVT-008` | **P1 / HIGH** | Phase 14 — Integration Events | CertificateIssued outbox payload does not satisfy the Phase 14 event contract or Phase 15 projection needs |
| 110 | W11 | `P15-INIT-001` | **P1 / HIGH** | Phase 15 — Student Workspace Lifecycle | normal student GET traffic can synchronously create an ACTIVE workspace and bypass event-driven INITIALIZING |
| 111 | W11 | `P15-LIFE-002` | **P1 / HIGH** | Phase 15 — Student Workspace Lifecycle | StudentIdentitySuspended / StudentIdentityArchived do not drive the workspace lifecycle |
| 112 | W11 | `P15-SYNC-003` | **P1 / HIGH** | Phase 15 — Inbox / Lifecycle Enforcement | suspended/archived workspaces continue accepting integration-event projections |
| 113 | W11 | `P15-READ-004` | **P1 / HIGH** | Phase 15 — Workspace Access | Archived workspaces remain available through the normal student read model |
| 114 | W11 | `P15-CONSENT-007` | **P1 / HIGH** | Phase 15 — Student Preferences | privacy preference changes have no dedicated consent ledger or auditable decision payload |
| 115 | W11 | `P15-SNAP-005` | **P1 / HIGH** | Phase 15 — Workspace Snapshots | snapshot creation is a write path that bypasses the Suspended/Archived write guard |
| 116 | W11 | `P15-PRIV-006` | **P1 / HIGH** | Phase 15 — Privacy & Snapshots | snapshots can roll privacy/consent preferences backward without a new consent decision |
| 117 | W11 | `P15-AUDIT-009` | **P2 / MEDIUM** | Phase 15 — Audit / Outbox | system/event-driven workspace creation is recorded as a USER action by the student |
| 118 | W11 | `P15-STATS-008` | **P1 / HIGH** | Phase 15 — Dashboard / Personal Statistics | dashboard “personal statistics” are computed from capped display windows and become incorrect for larger histories |
| 119 | W11 | `P15-QG-010` | **P2 / MEDIUM** | Phase 15 — Quality Gate | official Phase 15 source verification fails on the current valid router because it searches formatting, not syntax/semantics |
| 120 | W12 | `P17-PROMPT-012` | **P2 / MEDIUM** | Phase 17 — Prompt Routing | capability execution selects the first matching active prompt without a uniqueness invariant |
| 121 | W12 | `P17-EVAL-001` | **P0 / CRITICAL** | Phase 17 — Evaluation / Prompt Governance | deployment gate can certify a prompt version that was never evaluated |
| 122 | W12 | `P17-EVAL-002` | **P1 / HIGH** | Phase 17 — Evaluation Engine | five declared evaluator types silently behave as automatic passes |
| 123 | W12 | `P17-EVAL-003` | **P1 / HIGH** | Phase 17 — Evaluation Engine | MODEL/ROUTING/WORKFLOW/KNOWLEDGE evaluation targets are not actually targeted |
| 124 | W12 | `P17-WORKFLOW-009` | **P1 / HIGH** | Phase 17 — AI Workflows | a queued workflow run is not bound to the workflow version it records |
| 125 | W12 | `P17-WORKFLOW-008` | **P1 / HIGH** | Phase 17 — AI Workflows | workflow `dependsOn` and `retryLimit` contracts are ignored |
| 126 | W12 | `P17-HUMAN-010` | **P1 / HIGH** | Phase 17 — Consumer Governance | consumer `requireHumanReview` policy is declared but never enforced |
| 127 | W12 | `P17-SCHEMA-011` | **P2 / MEDIUM** | Phase 17 — Output Validation | structured-output validation implements only a shallow subset of the advertised schema contract |
| 128 | W12 | `P17-GUARD-007` | **P1 / HIGH** | Phase 17 — Guardrails | governed regex patterns can trigger invalid-regex failures or catastrophic backtracking on request threads |
| 129 | W12 | `P17-QUOTA-005` | **P1 / HIGH** | Phase 17 — Consumer Quotas | quota enforcement is check-then-act and can overshoot under concurrency |
| 130 | W12 | `P17-COST-006` | **P1 / HIGH** | Phase 17 — Usage / Cost Governance | AI monetary budgets and overview add unlike currencies as if they were one currency |
| 131 | W12 | `P17-ASYNC-004` | **P1 / HIGH** | Phase 17 — Async Execution | worker crash can leave an async AI job permanently RUNNING |
| 132 | W12 | `P17-IDEMP-013` | **P2 / MEDIUM** | Phase 17 — Execution Idempotency | concurrent duplicate AI requests can surface a uniqueness error instead of replaying the first execution |
| 133 | W12 | `P17-RESIL-014` | **P2 / MEDIUM** | Phase 17 — Provider Resilience | retry backoff has no jitter and circuit-breaker state is process-local |
| 134 | W13 | `P18-VERSION-004` | **P1 / HIGH** | Phase 18 — Tool Registry | tool schema/dependency changes can occur under an unchanged semantic version |
| 135 | W13 | `P18-PUBLIC-005` | **P2 / MEDIUM** | Phase 18 — Public Registry | public catalog/detail exposure is governed mainly by `publicEnabled`, not executable lifecycle state |
| 136 | W13 | `P18-HEALTH-008` | **P2 / MEDIUM** | Phase 18 — Dependency Health | Phase 17 dependency health can report READY for a route that actual execution will reject |
| 137 | W13 | `P18-RATE-001` | **P1 / HIGH** | Phase 18 — Public Execution Boundary | anonymous clients can bypass per-session rate limits by rotating a trusted request header |
| 138 | W13 | `P18-RECO-002` | **P1 / HIGH** | Phase 18 — Scholarship Recommendation Tool | scholarship recommendation silently ignores published candidates after the first result page |
| 139 | W13 | `P18-SAVE-003` | **P1 / HIGH** | Phase 18 — Phase 15 Handoff | saved student-tool result is supplied by the client and is not cryptographically/provenance-bound to the execution |
| 140 | W13 | `P18-IDEMP-007` | **P2 / MEDIUM** | Phase 18 — Execution Persistence | concurrent identical tool requests can fail on the uniqueness constraint instead of replaying |
| 141 | W13 | `P18-IDEMP-006` | **P2 / MEDIUM** | Phase 18 — Execution Idempotency | successful idempotent replay cannot return the original transient tool result |
| 142 | W14 | `P16-LOCALE-001` | **P1 / HIGH** | Phase 16 — CMS Localization | locale-specific workflow transitions overwrite one global ContentNode status and destroy independent locale lifecycle truth |
| 143 | W14 | `P16-NAV-005` | **P1 / HIGH** | Phase 16 — Navigation Governance | navigation Maker-Checker can be bypassed because the checker can replace the menu content while publishing it |
| 144 | W14 | `P16-ANN-006` | **P1 / HIGH** | Phase 16 — Announcements | announcement Maker-Checker has the same “edit while approving” bypass |
| 145 | W14 | `P16-SCHED-002` | **P1 / HIGH** | Phase 16 — Scheduled Publishing | scheduled publishing jobs have no atomic claim/lease and can be double-processed or marked FAILED after publication |
| 146 | W14 | `P16-SEO-004` | **P1 / HIGH** | Phase 16 — SEO Governance | admin-supplied canonical URLs bypass the architecture's strict canonical-generation rule |
| 147 | W14 | `P16-SEO-003` | **P1 / HIGH** | Phase 16 — SEO / Routing Metadata | generated canonical URLs and slug-change redirects hardcode the `/articles/` route for every CMS content type |
| 148 | W14 | `P16-REDIR-008` | **P2 / MEDIUM** | Phase 16 — Redirect Governance | redirect loop prevention detects only A↔B pairs and permits longer cycles |
| 149 | W14 | `P16-NAV-010` | **P2 / MEDIUM** | Phase 16 — Navigation | navigation validation allows orphan parentNodeId references |
| 150 | W14 | `P16-BLOCK-009` | **P2 / MEDIUM** | Phase 16 — Content Blocks | “schema validation” is shallow and accepts undeclared block fields |
| 151 | W14 | `P16-TAG-007` | **P2 / MEDIUM** | Phase 16 — Public CMS Query | public tag filtering happens after database pagination, producing missing results and false totals |
| 152 | W15 | `P2-GOV-001` | **P2 / MEDIUM** | Phase 2 — ARB | sealed Phase 2 ARB report still says Transactional Outbox source implementation is absent although current source contains it |
| 153 | W15 | `P4-GOV-001` | **P2 / MEDIUM** | Phase 4 — Final Foundation Baseline | Phase 4.21 still declares Transactional Outbox source implementation missing after the source has implemented it |

# 42. Execution protocol for every wave

```text
A. Reconfirm baseline / no unexpected source drift
B. Re-prove each scheduled finding
C. Enumerate provider + all direct consumers
D. Freeze exact patch scope
E. Apply source changes only
F. Add/strengthen behavioral tests before or with the fix
G. Run targeted tests
H. Run full typecheck + build + lint
I. Run relevant phase source verifiers
J. Run cross-phase integration regressions
K. Recheck later findings sharing the same root cause
L. Update this register:
   - CLOSED_AFTER_REMEDIATION, or
   - RESOLVED_BY_UPSTREAM_REMEDIATION, or
   - RUNTIME_PROOF_REQUIRED
M. Only then move to the next wave
```

## 42.1 Migration boundary

Source remediation may **author** Prisma/schema/migration files when required, but must not apply them to a live database during ZIP repair.

No `migrate deploy`, backfill, destructive cleanup, ID remapping, or data rewrite is allowed until Google Studio has positively identified the Development/Remediation database and completed backup/recovery proof.

## 42.2 Breaking-contract rule

A shared contract change is not complete when only its provider compiles:

```text
Provider contract
→ repository/application implementation
→ API/import/event adapter
→ every downstream consumer
→ compatibility removal
→ regression proof
```

If all consumers cannot be migrated safely in one wave, preserve a temporary compatibility adapter and make its deletion part of that same wave's exit criteria.

# 43. Cross-wave integration gates

| Gate | Runs after | Must prove |
|---|---|---|
| **IG-A** | W0 | Architecture/API/data target is unambiguous; quality gates are trustworthy. |
| **IG-B** | W1 | Auth/config/DI/production security composition is coherent across API + Application + Infrastructure. |
| **IG-C** | W2 | Import acquisition, crash recovery, durable event path and storage abstraction are source-safe. |
| **IG-D** | W3 | Canonical Reference Data + Taxonomy are stable enough for downstream IDs/relationships. |
| **IG-E** | W4 | Finance invariants, authorization, currency/accounting and provider-gated state machines are source-safe. |
| **IG-F** | W5–W8 | Tests → Majors → Universities → Scholarships preserve canonical identity and publication integrity end-to-end. |
| **IG-G** | W9–W11 | Course completion → Certificate issuance → Student projection contracts line up without synthetic or non-atomic shortcuts. |
| **IG-H** | W12–W13 | AI deployment/evaluation and Student Tools execution/health/idempotency agree on executable versions. |
| **IG-I** | W14 | CMS publishing, locale lifecycle, scheduler and public query behavior are internally coherent. |
| **IG-J** | W15 | Governance documents describe repaired repository truth; no stale active completion claims remain. |
| **FINAL-SOURCE-GATE** | all waves | Full source build/typecheck/lint/tests/verifiers pass with no unresolved P0/P1 source finding. |

# 44. Google Studio runtime activation order — after source remediation

```text
R0 — Environment identity / safety
     → Development/Remediation DB only
     → full backup
     → independent schema snapshot
     → restore/recovery proof
     → baseline counters

R1 — Core runtime infrastructure
     → migration status
     → Redis/distributed rate limiting
     → durable outbox/event relay
     → durable import queue
     → object/file storage
     → health/readiness

R2 — Canonical data runtime
     → Phase 7 uniqueness/resolver probes
     → Phase 8 taxonomy/DAG concurrency
     → IDs regenerated = 0
     → relations lost = 0

R3 — Canonical domain migrations/pilots
     → Phase 9 Tests
     → Phase 10 Majors
     → Phase 11 Universities
     → Phase 12 Scholarships
     → controlled pilots before bulk operations

R4 — Finance runtime proof
     → finance migrations/constraints
     → payment/FX/bank gateway transports
     → concurrent wallet/payment/transfer probes
     → reconciliation
     → financial security boundary

R5 — Learning / Certificates / Student / CMS
     → Course event chain
     → KMS historical signing keys
     → certificate artifacts/QR/PDF
     → Student inbox/outbox/Redis/lifecycle
     → CMS scheduler/cache/CDN

R6 — AI / Student Tools
     → real provider secrets + inference
     → durable AI async worker
     → cost reconciliation
     → embeddings/indexing
     → official tool bootstrap
     → Phase 18 ↔ Phase 17 integration
     → save-to-Student handoff

R7 — Full platform closure
     → end-to-end smoke
     → replay/idempotency
     → rollback/restore
     → concurrency
     → security
     → reconciliation
     → final evidence package
```

A source-fixed finding whose safety property depends on PostgreSQL, Redis, KMS, provider gateways, concurrency or recovery remains `RUNTIME_PROOF_REQUIRED` until the corresponding runtime gate passes.

# 45. Reprioritization verdict

```text
PHASE_2_TO_19_DISCOVERY = COMPLETE
AUTHORITATIVE_SOURCE_FINDINGS = 153
CRITICAL_P0 = 12
HIGH_P1 = 100
MEDIUM_P2 = 40
LOW_P3 = 1

GLOBAL_ROOT_CAUSE_CONSOLIDATION = COMPLETE
DEPENDENCY_AWARE_ORDERING = COMPLETE
EXECUTION_WAVES_FROZEN = YES
SOURCE_REMEDIATION_STARTED = NO
ZIP_MODIFIED = NO
DATABASE_MODIFIED = NO
GOOGLE_STUDIO_RUNTIME_STARTED = NO
```

The repository must now be remediated **W0 → W15**, not phase-by-phase and not by raw severity sorting.

No later wave should start before the prior wave's closure gate passes, except read-only analysis needed to enumerate consumers or prove that an upstream change will not break them.


# 46. Remediation execution log — W0

**Execution date:** 2026-08-25  
**Working source:** uploaded `MANARATAK_FINAL-main.zip` matching audited baseline before remediation  
**Database mutations:** none  
**W0 state:** `SOURCE_REMEDIATION_COMPLETE / FULL_DEPENDENCY_REGRESSION_GATE_PENDING`

## 46.1 W0 finding status

| Order | Finding | Execution status |
|---:|---|---|
| 1 | `GOV-ROADMAP-001` | `SOURCE_REMEDIATED` |
| 2 | `P2-ROADMAP-001` | `SOURCE_REMEDIATED` |
| 3 | `P2-ARCH-001` | `SOURCE_REMEDIATED` |
| 4 | `P2-DATA-001` | `SOURCE_REMEDIATED` |
| 5 | `P2-API-001` | `SOURCE_REMEDIATED` |
| 6 | `P4-GOV-002` | `SOURCE_REMEDIATED` |
| 7 | `P3-QUALITY-001` | `SOURCE_REMEDIATED` |
| 8 | `P3-BUILD-001` | `SOURCE_REMEDIATED` |
| 9 | `P4-TEST-001` | `SOURCE_REMEDIATED` |
| 10 | `P4-GIT-001` | `SOURCE_REMEDIATED` |
| 11 | `P3-ENV-001` | `SOURCE_REMEDIATED` |

The discovery sections remain unchanged as historical evidence. This execution log is the authoritative current disposition for W0.

## 46.2 W0 decisions frozen

- Enterprise Modular Monolith is the current physical topology; microservices are future extraction boundaries.
- `/api/v1` is the canonical active REST namespace.
- Phase 7 owns canonical Reference Data; relational canonical IDs/FKs are preferred in the shared relational persistence boundary.
- Source exists through Phase 19, but source remediation and Google Studio runtime/database proof remain required.
- Full-repository correctness gates are authoritative; Turbo is optional cached acceleration.
- Node baseline is pinned to 22.16.0 with strict Node/npm engine enforcement.
- Current Git policy is CI-enforced through maintained validators.
- Historical `@manaratak/testing` and Husky implementation claims are superseded by current source topology.
- Phase 4 containerization is explicitly `DEFERRED`.

## 46.3 Verification

Passed in the ZIP execution environment:

- W0 dedicated verifier: `34/34 PASS`.
- Source-quality gate: `PASS`, with **0 new** cycle/accessibility violations.
- Known baseline debt: one `@manaratak/application <-> @manaratak/infrastructure` package cycle and one clickable-div accessibility item in the scholarship admin preview.
- Git validator positive/negative checks: `PASS`.
- GitHub Actions YAML parse: `PASS`.
- `package.json` / `package-lock.json` root dependency and engine parity: `PASS`.

Dependency-backed regression commands were not runnable because the clean ZIP has no `node_modules` and npm registry artifacts were unavailable in the execution environment (`npm ci` timeout; offline install returned `ENOTCACHED`). This is not classified as a code/test failure.

**W1 transition gate:** run `npm ci && npm run quality:source && npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run w0:verify` in a connected clean environment before declaring W0 fully closed.

# 47. Remediation execution log — W15 / final source-governance reconciliation

**Execution date:** 2026-08-26
**Scope:** governance truth reconciliation only
**Database/runtime mutations:** none
**Runtime boundary:** `PENDING_GOOGLE_STUDIO`

The discovery sections above remain unchanged as historical evidence. This execution log is the authoritative current disposition for W15.

## 47.1 W15 finding status

| Order | Finding | Execution status |
|---:|---|---|
| 152 | `P2-GOV-001` | `CLOSED_AFTER_REMEDIATION` |
| 153 | `P4-GOV-001` | `RESOLVED_BY_UPSTREAM_REMEDIATION` |

`P2-GOV-001` is closed by reconciling the Phase 2 ARB report with the current Transactional Outbox source implementation. `P4-GOV-001` requires no new source edit because W0 already reconciled Phase 4.21; W15 re-proves that upstream closure instead of duplicating it.

## 47.2 Final governance truth

- The current repository source contains the Transactional Outbox model/migration, persistence store, atomic unit-of-work path, audited mutation executor, dispatcher, and API composition wiring.
- Historical pre-implementation statements remain historical context only and do not override active source truth.
- Live migration application, real-database atomicity, dispatcher recovery/concurrency, and production-runtime correctness remain `PENDING_GOOGLE_STUDIO` / `RUNTIME_PROOF_REQUIRED`.
- W15 executes no migration, backfill, live database write, Redis/KMS/provider activation, scheduler mutation, or live AI/provider call.
- The W0→W15 source-remediation program is considered source-closed only when the real repository passes every W0→W15 verifier plus Source Quality, typecheck, lint, build, and unit-test gates.

# 48. Final source closure stage — W16 handoff (not a remediation finding wave)

**Execution date:** 2026-08-26
**Stage label:** `W16 — FINAL_SOURCE_CLOSURE_AND_RUNTIME_HANDOFF`
**Official remediation finding waves:** `W0 → W15`
**Authoritative source findings:** `153`
**New findings introduced by W16:** `0`
**Database/runtime mutations:** none
**Runtime boundary:** `PENDING_GOOGLE_STUDIO`

W16 is a final closure and delivery stage only. It does **not** extend the frozen remediation backlog beyond W15 and does not create finding 154. Its purpose is to execute and record the `FINAL-SOURCE-GATE`, preserve the final source-remediation evidence, and hand the remaining environment-dependent proof to the already-defined Google Studio runtime sequence `R0 → R7`.

## 48.1 Final source closure conditions

The repository may be marked `SOURCE_REMEDIATION_CLOSED` only when the real repository passes all of the following on the same clean source state:

1. every dedicated source verifier `W0 → W15`;
2. W16 final-closure verifier;
3. Source Quality Gate;
4. full typecheck;
5. full lint;
6. full build;
7. unit tests;
8. exact changed-file / patch-integrity checks for the W16 closure kit.

A green W16 does not claim that PostgreSQL migrations were applied, that Redis/KMS/provider integrations are live, or that distributed recovery/concurrency properties are runtime-proven.

## 48.2 Final source disposition

```text
AUTHORITATIVE_SOURCE_FINDINGS = 153
OFFICIAL_REMEDIATION_WAVES = W0_TO_W15
NEW_W16_FINDINGS = 0
FINAL_SOURCE_GATE = REQUIRED_ON_REAL_REPOSITORY
SOURCE_REMEDIATION_STATUS_AFTER_GREEN_W16 = CLOSED
DATABASE_MUTATION_BY_W16 = NONE
RUNTIME_PROOF = PENDING_GOOGLE_STUDIO
NEXT_RUNTIME_SEQUENCE = R0_TO_R7
```

## 48.3 Runtime handoff

The post-source sequence remains exactly the Section 44 activation order:

`R0 Environment identity/safety → R1 core runtime infrastructure → R2 canonical data runtime → R3 canonical domain migrations/pilots → R4 finance runtime proof → R5 Learning/Certificates/Student/CMS → R6 AI/Student Tools → R7 full platform closure`.

Any property that depends on a live database, migration state, Redis, KMS, provider gateway, distributed worker, concurrency, recovery, or end-to-end runtime behavior remains `RUNTIME_PROOF_REQUIRED` until its corresponding Google Studio gate passes.

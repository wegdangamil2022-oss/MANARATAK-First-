# MANARATAK 2.0 — Phase 05 Shared Services Traceability Matrix

**Document ID:** PHASE-05-TRACEABILITY-MATRIX  
**Status:** SOURCE_REBASELINED — RUNTIME_EVIDENCE_PENDING  
**Updated:** 2026-09-07  
**Scope:** current source composition for all 20 Phase 05 foundations. Historical in-memory/no-outbox claims are not active authority.

Completion terminology follows `docs/governance/COMPLETION_STATUS_LIFECYCLE.md`. `DURABLE` below means the canonical source path uses durable persistence or a production-capable boundary; it does not claim that a target database/provider has been runtime-verified.

## Classification vocabulary

| Class | Meaning |
| --- | --- |
| `DURABLE` | Canonical production composition uses persisted owner state / durable repository or source-complete production boundary. |
| `DEVELOPMENT_ONLY` | Capability is intentionally local/dev-only and must not be selected in production-like composition. |
| `UNAVAILABLE_FAIL_CLOSED` | Production-like composition exposes an explicit unavailable capability instead of a mock/success path. |
| `DEFERRED_UNMOUNTED` | Historical/target contract may exist, but there is no active production route/DI adapter claiming execution. |
| `RUNTIME_PROOF_PENDING` | Production-capable source exists, but correctness depends on DB/provider/runtime evidence not executed in source closure. |

## Current 20-foundation matrix

| Foundation | Canonical source composition | Current class | Runtime boundary |
| --- | --- | --- | --- |
| Audit | `PrismaAuditRecordRepository` + atomic audited mutation/outbox coordinator | `DURABLE` | DB/runtime integrity evidence remains environment-bound. |
| Identity | `PrismaIdentityRepository` in Prisma runtime; in-memory fallback is non-production | `DURABLE` | DB/session concurrency runtime evidence remains pending where listed by closure records. |
| Authorization | Prisma role/policy/assignment + emergency-access repositories | `DURABLE` | Runtime permission/DB evidence remains pending. |
| Settings | `PrismaSettingDefinitionRepository` + `PrismaSettingAssignmentRepository` | `DURABLE` | DB runtime evidence pending. |
| Assets (EAP) | Prisma asset metadata/usage plus runtime-selected storage/malware/sanitization providers | `RUNTIME_PROOF_PENDING` | Provider sandbox/storage/security pipeline proof pending; fail-closed when provider capability is unavailable. |
| Notifications | Prisma intent/template/preferences + provider-neutral delivery gateway + durable worker path | `RUNTIME_PROOF_PENDING` | External delivery-provider and scheduler/runtime proof pending. |
| Background Jobs | `PrismaBackgroundJobRepository` + `PrismaBackgroundJobExecutionGateway`; production-like non-Prisma fallback is unavailable | `RUNTIME_PROOF_PENDING` | Disposable PostgreSQL multi-worker/crash/fencing evidence pending. |
| Enterprise Events / Outbox | `PrismaEnterpriseEventRepository`, `PrismaEventPublishingGateway`, `PrismaTransactionalOutboxStore` | `RUNTIME_PROOF_PENDING` | Disposable DB dispatch/retry/crash-window evidence pending. |
| Workflow | `PrismaWorkflowRepository` + `PrismaWorkflowExecutionGateway` | `DURABLE` | DB runtime execution evidence pending; no in-memory production claim. |
| Search | `PrismaSearchRequestRepository` + `PrismaPublicSearchEngineGateway` | `DURABLE` | Deployed performance/search runtime evidence pending. |
| Cache | production composition uses explicit unavailable cache persistence/execution capabilities | `UNAVAILABLE_FAIL_CLOSED` | Cache is optional optimization; production must not silently fall back to process memory. |
| API Foundation | `PrismaApiServiceRepository` + `PrismaApiExposureGateway` | `DURABLE` | Runtime exposure proof remains environment-bound. |
| Security Policy Registry | no active production registry adapter/route authority | `DEFERRED_UNMOUNTED` | Authorization owner paths remain canonical. |
| Configuration | canonical resolution uses persisted Settings via `ConfigurationResolutionService`; legacy registry orchestrator is unmounted | `DURABLE` | Runtime config/secret/provider evidence remains external. |
| Integration Registry | no active production generic registry adapter | `DEFERRED_UNMOUNTED` | Owner-specific integrations/providers are composed directly. |
| Localization Registry | no active DB-driven generic registry adapter; owner/public locale paths are canonical | `DEFERRED_UNMOUNTED` | Locale browser/runtime evidence tracked separately. |
| Shared Components | `PrismaSharedComponentRepository` + `PrismaComponentRenderingGateway` | `DURABLE` | DB/render runtime evidence pending. |
| Organizations / Employers generic foundation | deliberately has no Phase 05 production owner surface | `DEFERRED_UNMOUNTED` | Later owner domains remain authoritative; no generic package is invented. |
| Monitoring | active `MonitoringService` with OTLP/HTTP production-capable provider and HTTP/worker instrumentation | `RUNTIME_PROOF_PENDING` | Real collector export, alert delivery and dashboard evidence pending. |
| Logging | canonical structured runtime logging/correlation path; legacy log-registry orchestrator is not active authority | `RUNTIME_PROOF_PENDING` | Production sink/retention/access evidence depends on runtime platform. |

## Critical DI assertions

The current source authority is `apps/api/src/infrastructure/di/container.ts` plus `RuntimeDependencyPolicy.ts`. W7 source verification enforces at minimum that:

- Notifications, Workflow, Search, API Foundation and Shared Components no longer claim in-memory production persistence when Prisma adapters are composed.
- Background jobs and Enterprise Events/Outbox resolve to Prisma durable adapters when Prisma is available and fail closed in production-like non-Prisma composition.
- Cache production composition is explicitly unavailable rather than process-memory durable by accident.
- Asset provider selection is environment-aware and can fail closed; asset metadata/usage ownership remains Prisma-backed.
- Deferred Security Policy / Integration / Localization registry orchestrators are not registered as production capabilities.
- Monitoring source delegates metrics/traces to the configured provider; provider-side export proof remains runtime evidence.

These assertions are executable in `scripts/verify-w7-documentation-closure.mjs` and `tests/remediation/w7-documentation-closure.test.mjs`.

## Historical claims

Pre-remediation statements such as “Enterprise Events are in-memory only”, “no transactional outbox table exists”, “Background Jobs are process-memory only”, or “Search/Workflow/API/Shared Components use in-memory production adapters” are **historical and superseded**. They must not be used as current implementation-status evidence.

No row in this document certifies the platform as `PRODUCTION_READY`. Runtime-dependent rows remain explicit until DB/provider/deployment evidence is executed against the exact release artifact.

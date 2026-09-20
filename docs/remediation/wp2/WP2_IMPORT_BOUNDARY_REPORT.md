# WP2 Import Foundation Boundary Report

## Audit Findings

| Finding | Classification | Before | After | Owner |
|---|---|---|---|---|
| Major catalog and dossier parsers imported by `ImportAdminUseCases` | DOMAIN_LOGIC_LEAK | Phase 6 parsed Major documents and described Major duplicate/promotion policy | Parsing, preview, and policy text are owned by `MajorImportStagingUseCase`; Foundation receives normalized rows | Majors |
| Generic inline import inferred names including `testName` | DOMAIN_LOGIC_LEAK | Foundation selected a semantic display name and treated it as completeness | Foundation validates only that normalized payload is a non-empty object | Owning domain |
| Generic import deduplicated by inferred entity name | DOMAIN_LOGIC_LEAK | Foundation created a domain-sensitive name key | Foundation uses technical source/domain/row identity; semantic duplicate resolution remains with the domain | Owning domain |
| Prisma read failure fell back to memory | SILENT_FALLBACK | `getRecordById` swallowed Prisma errors and returned memory state | Prisma errors propagate; durable mode refuses construction without Prisma | Infrastructure |
| Prisma repository memory operation | SILENT_FALLBACK | Missing Prisma implicitly selected memory | Memory is reachable only through explicit `DEVELOPMENT_ONLY` mode and is classified as non-durable | Infrastructure |
| In-memory queue and source registry | GENERIC_IMPORT_CAPABILITY | Names disclosed implementation but not durability classification | Both expose `persistenceClassification = DEVELOPMENT_ONLY` | Import Foundation |
| Match/diff proposal value objects | GENERIC_IMPORT_CAPABILITY | Generic candidate comparison produces review proposals | Retained as non-writing review support; `canAutoMerge` and `canAutoPublish` remain false | Import Foundation contracts |
| Match/merge service runtime adoption | DEFERRED | Source tests only; no active composition found | Remains uncomposed; each domain must supply required fields and semantic candidates | Owning domains |
| University importer | DEFERRED | Existing domain promotion use case found outside Foundation | No University import was started or executed | Universities |

## Universal Handoff

The canonical contract is `packages/domain/src/import-foundation/contracts/UniversalImportHandoff.ts`. It carries source/artifact identity, raw artifact reference, normalized payload, provenance, validation state and coded issues, execution context, idempotency and dry-run metadata, plus optional correlation/reference metadata.

Phase 6 owns acquisition, artifact handling, staging, technical normalization, validation transport, pipeline execution, retries, idempotency, dry-run state, and handoff. It does not decide semantic matching, duplicate resolution, merge, promotion, or canonical writes.

## Persistence Truth

`PrismaImportRepository` defaults to `DURABLE`, requires a Prisma client, and propagates persistence failures. Its memory behavior requires explicit `DEVELOPMENT_ONLY` construction. `InMemoryImportQueueGateway` and `InMemorySourceRegistryGateway` are also explicitly classified `DEVELOPMENT_ONLY`.

The active queue remains process-local and is not durable. Replacing it with durable queue persistence and proving execution recovery requires the external database/runtime closure and is recorded as `GOOGLE STUDIO / DB CLOSURE REQUIRED`.

## Verification

- No relative or upward imports from Import Foundation to Majors, Tests, Universities, or Scholarships remain.
- No Major/Test parser or canonical field semantics remain in active Foundation application services.
- No swallowed Prisma-to-memory read fallback remains.
- Prisma schema SHA-256 remained `33FFC508687FA39BDC471E038930EC7B4AB13229D1C5E73171081AEF3D895AEF`.
- Runtime tests and full TypeScript compilation were not available because project dependencies are absent.

`TEST EXECUTION BLOCKED — DEPENDENCIES NOT PRESENT`

# Phase 4.11 — Presentation Validation Baseline (Rebaselined 2026-09-06)

## Authority status

`REBASELINED — SOURCE_VERIFIED / FULL WORKSPACE TYPECHECK PENDING DEPENDENCY RESTORE`

This baseline supersedes the earlier claim that `DtoValidationMiddleware` was the active HTTP validation boundary. The middleware had been constructed historically but was not composed into the canonical application and therefore could not prove transport validation.

## Canonical runtime contract

1. Privileged HTTP routes validate **body, query and path authority at the Presentation boundary** before invoking application use cases.
2. The canonical mechanism is explicit route-local Zod schemas, with shared schemas factored into `apps/api/src/presentation/validation/StrictControlPlaneSchemas.ts`.
3. Object request contracts are closed with `.strict()`; unknown properties are rejected unless a separately documented endpoint intentionally accepts a bounded metadata record.
4. Raw `req.body` must not be forwarded into privileged application use cases.
5. Server-owned fields such as authenticated actor, canonical path resource identifiers, source/provenance and lifecycle authority are derived from trusted request/server context rather than accepted from mutable JSON payloads.
6. Shared metadata maps are size-bounded at the transport edge and remain subject to domain validation after structural validation.
7. Domain invariants remain in Application/Domain services. Zod schemas enforce transport structure and security boundaries only.

## Retired presentation mechanism

`apps/api/src/presentation/validation/DtoValidationMiddleware.ts` has been removed from active source. The generic validation abstractions/providers in Core/Infrastructure are not declared to be the canonical HTTP middleware and may continue to serve non-HTTP validation uses. The historical report under `archive/` is retained as historical evidence and is not runtime authority.

## Source evidence

The remediation sweep covers legacy privileged surfaces including Workflow, API Foundation, Shared Components, Notifications, Cache, Background Jobs, File Management, Authorization, Enterprise Events, Identity, Student Tools, International Tests, Assets, Imports, Reference Data and Scholarship import ingress.

The W1 verifier and `tests/security/strict-edge-validation-remediation-source.test.mjs` are the executable source evidence for this contract. A future route that forwards raw request bodies or reintroduces `.passthrough()` into privileged transport schemas must fail the source gate.

## Verification boundary

Source-level checks can be executed without a database. Full TypeScript/workspace CI remains required before `VERIFIED_CLOSED`. The current environment does not contain the complete installed `@types/*` dependency tree, so a full workspace typecheck cannot yet be used as closure evidence.

## Approval status

Phase 4.11 validation authority is rebaselined to the executable route-local strict-schema model. This does **not** assert production/runtime closure until dependency-backed CI and integration tests pass.

---

### Navigation

- **Previous**: [Phase 4.10 — Error Handling Refined Report](phase-04-10-refined-report.md)
- **Next**: [Phase 4.12 — File Storage Report](phase-04-12-report.md)

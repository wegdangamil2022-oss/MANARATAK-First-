# ADR-028: Shared Relational Persistence Boundary with Enforced Domain Ownership

## 1. ADR Metadata

- **ADR ID:** ADR-028
- **Status:** Accepted for remediation baseline; independent review required before `VERIFIED_CLOSED`
- **Version:** 1.0.0
- **Date:** 2026-09-06
- **Decision Owner:** Project remediation manager under owner-delegated execution authority
- **Finding:** `MNT-AUD-0088`
- **Review note:** This record does **not** claim an independent human ARB review. It is the submitted architecture decision package and current source-remediation authority; independent review remains an explicit closure requirement.

## 2. Context

Phase 02 originally required separate physical/logical PostgreSQL schemas and prohibited cross-schema FKs. The implemented platform later converged on one Prisma schema in one PostgreSQL database. W0 subsequently froze the current physical topology as an Enterprise Modular Monolith and explicitly preferred canonical relational IDs/FKs inside the shared relational persistence boundary. Retrofitting 206 current models into Prisma multi-schema would therefore reintroduce a conflict with the newer authority and create a high-risk migration solely to reproduce a superseded physical partitioning mechanism.

## 3. Decision

Select remediation option **(b)** from `MNT-AUD-0088`: formally supersede Phase 02's mandatory physical/logical PostgreSQL schema partitioning requirement for the current Modular Monolith and replace it with executable ownership controls.

The canonical persistence strategy is:

1. One PostgreSQL database and one physical Prisma schema (`public`) for the current deployable monolith.
2. Every Prisma model has exactly one Domain owner in `docs/architecture/persistence/persistence-ownership.manifest.json`.
3. Direct ORM mutation of another Domain owner's model is forbidden.
4. Cross-context reads are forbidden by default and permitted only through an explicitly registered read-model/reference-lookup adapter.
5. Canonical relational references/FKs are allowed when they preserve a single canonical identity and do not transfer mutation ownership. Compatibility strings may not become a competing SSoT.
6. Cross-context workflows must invoke owner mutation ports, application contracts, transactional handoff ports or domain events. Shared physical transaction scope does not grant one Domain ownership of another Domain's tables.
7. New migrations must declare an owner and ADR-028 metadata. A mixed-owner migration requires explicit `cross_context_approved` scope and architecture review evidence.
8. The physical single-schema choice is not permission for direct cross-domain joins in application/domain code. Prisma remains infrastructure-only and access is policed by the persistence-boundary verifier.

## 4. Superseded Rules

The following rules are superseded **only for the current physical deployment boundary**:

- mandatory separate PostgreSQL logical/physical schemas for every Bounded Context;
- blanket prohibition on relational FKs between context-owned records.

The following remain authoritative:

- Domain ownership and mutation sovereignty;
- Import raw-data isolation;
- no Prisma/ORM leakage into Domain/Application contracts;
- owner APIs/contracts/events for cross-context behavior;
- microservice extraction readiness;
- canonical-reference integrity and provider-neutral identities.

## 5. Enforcement

- Machine-readable model ownership manifest.
- `scripts/architecture/verify-persistence-boundaries.mjs` must report zero direct cross-context ORM mutations.
- Every cross-context ORM read must be listed as an approved read-model path and limited to declared target owners.
- Every new migration after the manifest baseline must contain the ADR-028 owner/scope headers.
- CI/W2/W6 must execute the verifier.

## 6. Migration Consequence

ADR-028 deliberately requires **no database mutation** merely to move existing tables between PostgreSQL schemas. Current table names and migration history remain authoritative. Future extraction can move one owner at a time behind its existing contracts/events, using a reviewed migration program.

## 7. Closure Boundary

`MNT-AUD-0088` may become `SOURCE_VERIFIED` when the manifest, guards, owner-writer refactors and active-document reconciliation pass. It cannot become `VERIFIED_CLOSED` until independent architecture review and the W6 disposable-DB/CI evidence are complete.

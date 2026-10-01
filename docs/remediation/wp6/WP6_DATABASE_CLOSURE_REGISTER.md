# WP6 Database Closure Register

> **Operational supersession notice (2026-09-06):** Any instruction in this historical remediation artifact that requires an “Original Development Database”, a Google Studio recovery gate, or `WP1_RECOVERY_GATE` is superseded by [`docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`](../../operations/GREENFIELD_DATABASE_PROVISIONING.md). This file remains historical/evidence context and is not current database-operation authority.

Status: `DATABASE_VERIFICATION_REQUIRED`

No item in this register was executed locally. Every operation requires the original Development Database, a verified recovery point, before/after counters, and rollback evidence in Google Studio.

| Item | Current state | Exact migration/backfill | Expected invariant | Rollback requirement | Validation counters |
| --- | --- | --- | --- | --- | --- |
| optionalFields collisions | Source mapper now quarantines reserved keys; persisted collisions unknown | Inventory reserved keys in JSON, preserve conflicting values in quarantine evidence, then remove collision keys | Canonical columns always win and JSON contains no reserved key | Backup plus exported collision rows | rows scanned, collisions by key, quarantined, unresolved |
| MajorLevelProfile DegreeLevel | Source contract supports `degreeLevelId`; DB coverage unknown | Resolve compatibility `level` to existing Phase 8 DegreeLevel IDs and populate missing foreign keys | Every publishable profile has one active canonical DegreeLevel | Mapping export and reverse update script | profiles, linked, unresolved, invalid |
| Degree reconciliation | Local MajorLevel is compatibility subset | Compare every profile ID/code with unchanged Phase 8 identities | No independent Major degree SSoT | Pre-change profile snapshot | mismatches by canonical code |
| Taxonomy mappings | Source completeness blocks unresolved taxonomy | Resolve mappings only to existing Phase 8 nodes | Publishable majors have valid owned linkage; no dangling node IDs | Mapping snapshot and inverse operations | linked, gaps, dangling, ambiguous |
| MajorSource integrity | Source writes require an owner | Detect ownerless rows and invalid major/profile combinations; repair through reviewed mapping | Every source has a valid Major or profile owner | Source-row backup | total, ownerless, invalid, repaired |
| MajorRelationship integrity | Source rejects ownerless, self, duplicate batch semantics | Detect dangling endpoints, prohibited self-links, and duplicate semantic tuples; repair after review | Valid endpoints and one semantic relationship per tuple | Relationship export | dangling, self, duplicate, repaired |
| Classification integrity | Source requires owner and taxonomyNodeId | Detect ownerless/dangling/duplicate mappings and reconcile to Phase 8 | Every mapping has valid owner and taxonomy node | Mapping export | ownerless, dangling, duplicates |
| Completeness recalculation | Source policy distinguishes content, degree, taxonomy, source, and mapping gaps | Recalculate after canonical reconciliation | `COMPLETE` never represents free-text-only content | Old status snapshot and restoration mapping | before/after by state and gap code |
| Catalog linkage | Source catalog contains 3,402 structurally valid identities | Reconcile each source code to Major and MajorLevelProfile without regenerating identity | Exactly one `CANONICALLY_LINKED` or explicit review/gap result per source identity | Linkage table/export and inverse mapping | 3,402 total, linked, review, missing, duplicate |
| Orphan detection | DB unavailable | Detect orphan profiles, versions, sections, sources, mappings, and relationships | No unclassified orphan remains | Full affected-row backup | orphan counts by table |
| Before/after evidence | Not available locally | Capture all counters before mutation and repeat after transaction | Counter deltas explained and approved | Recovery restore verification | all counters above plus relation totals |

## Gate

Do not run migrations, backfills, cleanup, completeness recalculation, or linkage writes until `WP-1 DATABASE RECOVERY GATE` is closed against the original Development Database.

## Atomic Major Admin Mutations (2026-08-13)

- Major update, ready-to-review, ready-to-publish, publish, unpublish, reject, and archive operations now share one business/audit/Outbox transaction boundary.
- `PrismaMajorRepository.withTransaction` rejects a missing Prisma transaction context.
- Publication readiness remains evaluated by the Major-owned policy before entering the write boundary.
- Import promotion continues under the separately governed durable import pipeline; no import, backfill, ID regeneration, or database write occurred here.
- Runtime rollback proof remains pending the Development database recovery gate.

## Stage 3 Source Closure (2026-08-13)

- Source verification confirms all 3,402 identities: MJR 843, MAS 1,116, DOC 1,114, and FEL 329.
- No duplicate, malformed, missing-sequence, or catalog-index mismatch was found.
- Direct import, taxonomy linkage, publication, unpublication, and reconciliation scripts now require the Recovery Gate plus explicit mutation approval.
- API import promotion is protected by the same gate. Database linkage, orphan, persistence, and rollback evidence remain pending.

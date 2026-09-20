# W10 Source Remediation Closure — Certificates

**Wave:** W10 — Certificates — trust model before issuance
**Scope:** Source remediation only
**Runtime/DB status:** `PENDING_GOOGLE_STUDIO`
**Database writes performed during remediation:** `0`

## Closure result

All eleven official W10 findings are closed at source level. `scripts/verify-w10-source.mjs` also includes three defense-in-depth guards, for a total result of **14/14 PASS**.

| Finding | Source closure |
|---|---|
| P14-ISSUER-006 | Introduced a first-class, status-governed `CertificateIssuer` aggregate with issuer identity, accreditation metadata, logo asset and issuer-owned signing-key reference. |
| P14-VALIDITY-009 | Added PERMANENT / EXPIRING / RENEWABLE issuance semantics plus expiration and renewal workflows. |
| P14-TPL-004 | Replaced mutable template revision semantics with immutable `CertificateTemplateVersion` rows and explicit certificate → template-version binding. |
| P14-TPL-005 | Removed automatic Active fallback-template issuance. Bootstrap may create Draft only; issuance fails closed without a governed Active template/version. |
| P14-GOV-010 | Template/issuer lifecycle is actor-aware and audited/outboxed; maker/checker separation and fine-grained route permissions are enforced. |
| P14-DATA-011 | Prisma source and gated migration define restrictive same-domain referential integrity for issuer/template/version/certificate/ledger/verification relationships. |
| P14-CRYPTO-001 | Introduced one canonical signed credential envelope v2 sealing issuer, certificate type, achievement, template version, validity/expiration and replacement semantics. |
| P14-ISSUE-002 | Removed synthetic HTTP initial issuance. Initial issuance consumes an authoritative persisted Phase 13 completion event and records an immutable issuance inbox receipt. |
| P14-PATH-003 | Added typed `LearningPathCompleted` issuance and persistence path alongside `CourseCompleted`. |
| P14-REISSUE-007 | Reissue builds a fresh replacement from an allow-list, clears revocation/archive state, and retains the same original academic completion identity. |
| P14-EVT-008 | `CertificateIssued` is a versioned event payload carrying the Phase 14 contract and the fields required by the downstream Phase 15 certificate projection. |

## Additional source guards

- `W10-DB-MUTATION-GUARD`: migration remains source-only and explicitly gated for Google Studio.
- `W10-EVENT-AUTHORITY-GUARD`: completion source domain/type/version fail closed.
- `W10-KEY-OWNERSHIP-GUARD`: configured signer must match the canonical issuer signing-key reference.

## Source verification

- W0: PASS 34/34
- W1: PASS 30/30
- W2: PASS 23/23
- W3: PASS 31/31
- W4: PASS 22/22
- W5: PASS 8/8
- W8: PASS 12/12
- W9: PASS 13/13
- W10: PASS 14/14
- Source Quality Gate: PASS; no new file cycles or quality-baseline violations.
- Changed TypeScript/TSX syntax/transpile: PASS.
- `git diff --check`: PASS.

W6/W7 verifier files are not present in this local W9 fixture and therefore were not claimed as locally executed. The Codex application gate for W10 must rerun W0 through W10, including W6 and W7, on the real repository after W8 and W9 are committed.

The existing Phase 15 verifier still reports only its pre-existing `identity-derived route` formatting check failure. This maps to the later W11 remediation scope and is not a W10 regression.

Full repository `typecheck`, `build`, `lint`, Vitest, Prisma generate/validate and database tests were not claimed because this remediation fixture has no installed `node_modules` / Prisma CLI.

## Google Studio runtime / database / key-management gate

The following work is intentionally deferred and MUST NOT be performed by this source-remediation package:

1. Take approved PostgreSQL backup/recovery checkpoint.
2. Inspect legacy Certificate, CertificateTemplate, ledger and verification rows for orphan/collision conditions.
3. Create/reconcile canonical CertificateIssuer rows and accreditation metadata.
4. Backfill legacy template versions, `currentVersionId`, `issuerId`, certificate `templateVersionId`, and generic achievement/source-event fields.
5. Resolve all legacy reference ambiguities before applying restrictive foreign keys.
6. Apply the W10 migration only through the approved Google Studio runtime gate.
7. Promote nullable compatibility columns to NOT NULL only after zero-unresolved reconciliation is proven.
8. Provision issuer-specific KMS/HSM signing keys and verify runtime key-reference ownership; the source fallback must not be treated as production key custody.
9. Configure the new fine-grained certificate RBAC permissions for production roles.
10. Connect the durable CourseCompleted/LearningPathCompleted outbox consumer to `CertificateCompletionEventConsumer` and prove exactly-once/idempotent issuance behavior against PostgreSQL.
11. Schedule/prove expiry and renewal runtime workers.
12. Validate `CertificateIssued` delivery into the Phase 15 student projection end-to-end.

## Closure gate

W10 is source-closed when the source verifier and regressions pass and the patch applies cleanly over W9. Runtime/database/KMS evidence remains explicitly `PENDING_GOOGLE_STUDIO` and does not reopen a source finding unless runtime proof exposes a new source defect.

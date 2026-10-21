# Post-28 CI preflight repair — 2026-10-16

Status: `FIX_VERIFIED` for the targeted local source checks on Node 22.16.0.
Full GitHub CI on the repair commit remains pending. R00 is incomplete, R01 has
not started, sections 27/28 remain open, and production remains `NO_GO`.

## Stop and reproduction

The R00 stop recorded Enterprise CI run `38824588043` failing on
`b1702289f43d0363d7bbf91f8eba465e4355c53c`. Job metadata identifies failures in
`Cross-cutting source preflight` and `Run node scripts/aistudio/environment.mjs --check`.
Detailed GitHub job logs were unavailable through the environment proxy.

Local reproduction on Node 22.16.0 established:

- The audit inventory builder stopped at
  `ADMIN_ROUTER_BINDING_UNRESOLVED:/admin/translations`: the existing mount uses
  an imported factory rather than the class-based `.create()` form.
- The generated environment inventory was stale. Regeneration discovers 286
  variable names, adding ten names and refreshing source references. Values are
  never read by the generator; preview defaults are preserved.
- After the audit check was repaired, the same preflight exposed eleven existing
  migrations missing from the recovery manifest.

Dependencies were installed with lifecycle scripts disabled. An intermediate
preflight consequently also failed to import the ungenerated Prisma Client;
explicit local `npm run db:generate` corrected this setup condition. No database
connection or migration was needed. That intermediate run had 36 tests, 33
passed and 3 failed (two recovery-manifest assertions and the client setup).
The final development preflight executed all 36 tests with 36 passed, 0 failed,
0 skipped and 0 cancelled.

## Audit inventory source review

The extractor now recognizes directly mounted named factories imported from
their canonical router module. Unimported, mismatched, type-only and nested-only
factory calls do not establish a mounted router owner. Direct named middleware
and finite literal actions passed to permission-prefix helpers retain their
permission candidates and helper source fingerprints. Late, unused and
differently scoped helper declarations are not inherited evidence.

The inventory review adds 12 existing handlers and updates 11 existing contracts.
No handler was removed. Existing route ordering and the documented import route
collision are preserved. The current inventory contains 444 handler definitions
and 443 unique endpoints.

| Added handler group | Count | Source permission/validation review |
| --- | ---: | --- |
| Course, international-test and scholarship localized-description commands | 3 | Mounted owner manage permission and strict body parsing |
| Course learning-path draft update | 1 | Course manage mount and owner update schema |
| Major creation and fellowship-profile creation | 2 | Major manage permission, source hash/URL/reason parsing |
| University draft creation | 1 | University manage permission and source/reason parsing |
| Scholarship reference proposal and approval | 2 | Scholarship manage mount, strict body parsing and owner mutation context |
| Student document open and attest | 2 | Dedicated document-review mount and router permission, UUID/body parsing |
| Translation publication | 1 | Owner-specific university/major permission, strict parsing, authoring-disabled feature gate and owner publication contract |

| Updated contract group | Count | Reason |
| --- | ---: | --- |
| Authorization governance approval | 1 | Existing translation scopes add university/major permission candidates |
| Certificate evidence grant and template transition | 2 | Named middleware permissions and fingerprints are now visible |
| Wallet capture and release | 2 | Existing handlers directly parse required expectedVersion |
| Student support layout reset | 1 | Read and mutate middleware permissions and fingerprints are now visible |
| Study-destination commands | 5 | Existing action-specific edit/verify/publish guards replace the stale reference-data permission entry |

These are source observations. Permission candidate sets are not proof that every
runtime branch authorizes correctly; owner atomic audit/outbox and transaction
proof remain required. Historical review metadata is retained in the inventory.

## Recovery classification review

The eleven missing migrations were read and classified under the existing
`DATABASE_MIGRATION_RECOVERY_POLICY.md` as `BACKUP_RESTORE_REQUIRED`. None has a
sibling rollback SQL file. Each entry names the evidence that recovery must
preserve: certificate delegations, private owner-read observations, translation
receipts, study-destination governance, tracker cycles, search actor ownership,
student-tool/service discovery approvals, document consent/attestation,
scholarship identity/history, or document asset FK/lifecycle guards.

The existing policy requires compatible backup evidence for shared environments
and permits separately authorized disposable reprovisioning. No reverse SQL,
new recovery authority, observed migration application state or successful
restore is asserted. The NOT VALID asset FK still requires the separate orphan
review and validation sequence in the execution plan.

## Verification and handoff

- `node scripts/ci/source-preflight.mjs`: PASS; all 36 tests executed, including
  19 audit inventory contracts (six new regression cases).
- `node scripts/quality/verify-source-quality.mjs`: PASS; no package/file cycles
  or accessibility findings.
- ESLint for the changed verifier and its test file: exit 0.
- `git diff --check`: exit 0.

Commands run under Node 22.16.0. The repair commit must be checked again before
its evidence is attributed to that SHA. Retain the initial failure observations
above; local source success does not replace GitHub CI or runtime acceptance.

Checkpoint: after the user manually returns to Luna, continue the unfinished
R00 baseline/owners/capabilities/scope work on the repair branch, reconcile its
CI evidence, then enter the authorized light part of R01 when prerequisites
are met. Do not skip R00, record a full CI PASS, or start database work from this
repair report.

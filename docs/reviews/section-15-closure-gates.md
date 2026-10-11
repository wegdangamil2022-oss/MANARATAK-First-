# Section 15 — Source closure and deferred runtime gates

**Date:** 2026-10-11
**Branch:** `codex/section-15-student-support`
**Decision:** **CODE_CLOSED — RUNTIME_DEFERRED**
**Source SHA:** `573573525fa6cd3e25bf3efe675270890862312b`

The 9 October amendment controls this decision. Source/security fixes and relevant
lightweight checks passed. Live PostgreSQL, external providers, browser E2E and
worker operation are deferred to the approved post-28 validation phase. They are
not reported as PASS, and they are not a reason to keep repaired source tasks open.
`STU-ADM-026` remains `DEFERRED_AFTER_28`.

## Completed source gates

- [x] Review prior partial tasks against the actual Section 15/15.FG requirements.
- [x] Fix source P0/P1 defects; preserve owner authorization and privacy boundaries.
- [x] Execute 156 focused tests across 22 files, including negative security cases.
- [x] Pass full TypeScript and final affected-project compilation.
- [x] Build Admin; pass source-quality, P15/support verifiers and whitespace check.
- [x] Record lint/build warnings and limits of mocked transaction/SSR evidence.
- [x] Commit implementation, validation receipts, task trace and runtime checklist.

## Runtime evidence to execute after Section 28

- [ ] Verify deployed schema, existing migrations/indexes and worker registrations;
      use an authorized disposable/restorable environment. Do not infer deployment
      readiness from source availability or the local Prisma client.
- [ ] Exercise Identity/student-role provisioning, late assignment and more than
      2,000 owner rows, worker interruption, leases and durable continuation retry.
- [ ] Suspend/reactivate/park/replay/quarantine and archive without duplicate
      projection or resurrection. Verify archived inbox payload retirement and
      canonical receipt/audit retention with the approved operational policy.
- [ ] P14 issuance/revocation/renewal/reissue/expiry/archive/artifact events in
      different orders; verify owner truth, projection ordering and fanout dispatch.
- [ ] PostgreSQL CAS/concurrent reset/consent/tracker operations and rollback on
      audit/outbox failure; verify exactly one successful conflicting edit.
- [ ] Reminder outage/retry, changed deadlines and archive/delete while notifications
      are claimed; verify P15 delivery guard, P23 suppression, backoff and DLQ.
      Legacy unversioned reminders intentionally suppress; review/reschedule them
      only through the current owner workflow in an authorized environment.
- [ ] Validate owner-tab pages/counts under concurrent writes, owner outages and
      production query plans. Incomplete counts remain unknown, not zero.
- [ ] Configure a strong, stable `STUDENT_SUPPORT_CURSOR_SECRET` (or approved JWT
      signing-key fallback), rotation and consistency across runtime replicas.
- [ ] Execute authenticated AR/EN browser, keyboard/mobile and asset/link flows.
      SSR locale tests and a successful bundle are not live browser evidence.
- [ ] Verify support read-audit persistence/access/retention and role revocation in
      the deployed environment; no student impersonation or consent mutation.
- [ ] Complete deployment-specific readiness evidence and final production gates.

No heavy E2E, real migration, live provider, production mutation, merge or deployment
is authorized by this document. `CODE_CLOSED` can advance the source-review campaign;
`RUNTIME_VALIDATED` and production approval require separate, fresh runtime evidence.

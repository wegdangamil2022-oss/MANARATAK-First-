# Audit, student support and assets — approved implementation review

Reviewed 2026-10-28 against clean local `8f21e0e1ad7388924f2bcc976e58dbe87ab7111e`.
Input: `MANARATAK_Admin_Three_Sections_Final_Review_v1.1_2026-10-28.zip`, including the three individual specifications, master and cross-gates. The supplied documents are requirements to assess, not evidence of current runtime readiness.

## Decision

Approve the 4/4/5 navigation and ownership model with these explicit limits:

- Audit remains append-only. Reuse AuditRecord and AuditWorkspaceRecord. Bounded linkage/time checks are not cryptographic tamper verification. Every downloaded page reports its actual scope and coverage; downloaded checksums authenticate export bytes only.
- Student support gets its own bounded case/message/event store: no second student profile, invoice, learning record or service order. Preserve the existing directory, owner-specific reads, provisioning diagnostics and signed cursors. A public reply, private note, committed message and notification delivery are different facts. Duplicate cases may be linked within the same student's scope, never automatically merged.
- EAP remains the owner of asset bytes, processing evidence and rights. Generic administration must exclude private student/support/document assets, including direct-ID paths. Unknown usage blocks destructive actions. No-op security adapters cannot activate files. Owner pages retain reference replacement/publication authority.
- New support permissions are deny-by-default, including existing support-directory users. No role/account changes or MFA bypass. An administrative permission cannot imply student ownership or document consent.
- The original database is not a test target. Prepare and verify any necessary support migration in an attested isolated database; do not apply it to the original database without a separate decision. Report storage readiness honestly.
- Existing notification/storage/security providers remain unchanged. Multichannel inbound mail, automatic replies, advanced routing, new converters, bucket retention rules, cleanup and purge are excluded until a real provider/policy decision exists. Do not add nonfunctional buttons for these items.
- Retain Cairo, compact controls, navy/indigo headers, petrol primary actions and restrained gold navigation/icon accents. Scope styles to these sections; preserve all earlier section layouts.

## Verified inventory and delivery order

| Area | Current evidence | Decision |
|---|---|---|
| Audit records/search/export/integrity | AuditRouter, ManageAuditRecordsUseCase, PrismaAuditRecordRepository, AuditCenterPage | Reuse; strengthen read redaction, access auditing, scope manifests and permission-aware entry |
| Audit investigations/alerts/retention | AuditWorkspaceRouter, AuditWorkspaceUseCases, AuditWorkspaceRecord, AuditWorkspacePanel | Reuse store and CAS; promote to four visible workspace entries |
| Student directory/diagnostics | StudentSupportAdminRouter, PrismaStudentWorkspaceRepository, StudentSupportAdminPage | Preserve contracts and owner guards; separate directory and diagnostics navigation |
| Support tickets/messages | No support case/message owner or model found in current schema/routes | Add isolated support aggregate, API, authorized admin inbox and own-student portal |
| Assets list/lifecycle/rights/renditions | AssetPlatformRouter, PrismaAssetRecordRepository, AssetGovernancePanel, lifecycle use cases | Reuse; enforce private boundary on list and ID paths before UX changes |
| Storage/security providers | Runtime evidence is environment-specific | Show capability limits, never infer READY from a source test |

1. Close proven P0 boundaries and add regression tests.
2. Audit: four permission-aware entries, concise filters, bounded export/evidence scope and existing workflow tools.
3. Support: durable cases/public messages/internal notes/events, atomic CAS/idempotency/audit/outbox, manual eligible assignment, policy snapshot, inbox + student portal. Isolated schema verification and rollback.
4. Assets: five entries, purpose-first upload, details, processing queues, rights and usage, accurate provider boundaries.
5. Focused tests, TypeScript/lint/build, cross-owner denial/failure/concurrency checks. Deploy the verified source to the existing local original-database runtime without schema/data mutation.

## Evidence rules

Use `PASS`, `FAIL`, `BLOCKED` or `RUNTIME_UNVERIFIED` with concrete paths/tests. Source tests do not prove original database/provider readiness, authenticated visual acceptance or complete platform audit coverage. Keep pending checks explicit, including all X-FR cross-domain cases. Existing course follow-up remains outside this task. Staff lifecycle was subsequently added by explicit user instruction.

## Delivery evidence

Implemented the approved navigation: audit four entries, support four entries and assets five entries. Every control is scoped to Cairo with compact typography, indigo/petrol headers and restrained gold selection accents. The existing student directory, diagnosis, owner guards and related sections remain available.

The user separately approved exactly the two migrations / twelve tables on the original database in this conversation. Both were applied in one reviewed transaction with exact SQL checksums and restricted application grants. The existing schema, account, credential, role, assignment and policy fingerprints matched before/after. No acceptance data, backfill, account/MFA change, external provider activation, main merge or push occurred.

- Support: cases, public replies, internal notes, manual eligible assignment, priority/status, same-student follow-up links, paginated immutable history, team/SLA/calendar/saved-reply settings and scoped server metrics. The authenticated student portal uses the same owner with student-only DTOs. A saved message and notification delivery remain separate. Unknown network outcomes retain the frozen command/key and offer status lookup plus exact replay.
- Audit: mandatory audited reads and server CSV/JSON downloads, redaction, bounded export manifests, frozen-window partial linkage/time checks, eligible case assignment, alert-rule preview without sending, retention workflow without destructive cleanup. No whole-platform cryptographic integrity claim.
- Assets: private-owner exclusion on collection/reuse/direct-ID routes; canonical owner pickers before upload grants/replays; actual transport/finalization states, existing processing/rights/renditions/usage flows, and security capability limits. Unknown references block destructive work. Private support attachments remain unavailable; no fabricated scanner/converter results.
- Staff lifecycle: explicit invitation acceptance by the authenticated verified-email owner, stored token hashes only, no HTTP replay storage of secrets, no acceptance on GET, revocation/expiry/single use. Activation/suspension/resumption/transfer/offboarding require independent persisted approval and current snapshot/CAS checks. Incomplete handover blocks the action. A separate admin fence applies to every admin mount and eligible assignee selection. Offboarding removes only exact source-recorded work grants and emergency access, preserving student/unrelated grants, account credentials and MFA. Canonical authorization records new staff grant provenance in the same transaction; existing assignments cannot be adopted.

### Verification and cross-owner gates

PASS: TypeScript for config/domain/application/infrastructure/API/admin/web; Prisma validation and generation; architecture boundaries; source quality (zero package/file cycles or accessibility findings); changed-source ESLint has no errors. Existing warnings remain. Admin/web production builds pass. 253 unit/API/interaction tests passed in 25 focused files; isolated PostgreSQL checks are recorded below. No screenshot or MFA bypass is used.

The attested disposable PostgreSQL support test passed 23 checks and the staff lifecycle test passed 20 checks, with full rollback and zero original database test writes. These cover storage constraints, ownership, replay, stale versions, note isolation, one-use invitations/approvals, mandatory-audit failure rollback, exact grant provenance, student preservation and recovery-admin protection. They do not claim a multi-process race/load test.

| Cross gate | Result / evidence |
|---|---|
| X-FR-001,002 | BLOCKED by unavailable private attachment/scanner capability; upload disabled, not a production feature claim |
| X-FR-003,004 | PASS source/API owner guards: support does not imply certificates/finance access; existing directory interaction tests retained |
| X-FR-005 | PASS audit read sanitizer and required audited-read tests; identity details remain a separate permission boundary |
| X-FR-006 | PASS staff lab: handover precondition and independent approval/admin fence; owner tasks must be reassigned through their own sections |
| X-FR-007 | PASS support/staff lab and notification tests: no private message, invitation token or email in shared audit/outbox payloads |
| X-FR-008 | PASS audit export/read redaction and bounded scope tests |
| X-FR-009 | BLOCKED private attachment removal capability; no support attachment or purge button enabled |
| X-FR-010,011 | PASS asset API/private scope and canonical usage guards; unknown usage cannot authorize deletion |
| X-FR-012 | PASS separate save, outbox and canonical notification state; external delivery remains off |
| X-FR-013 | PASS support transition/reopen/follow-up and stable-command replay tests |
| X-FR-014 | PASS separate AuditWorkspace, support case and staff owner stores; no cross-owner mutation shortcut |
| X-FR-015 | PASS retention/configuration review does not execute purge; no new delete endpoint |
| X-FR-016 | PASS integrity UI and manifest explicitly bound scope/time/coverage; no cryptographic completeness claim |
| X-FR-017 | PASS unavailable/unverified provider capability presentation; no production-provider acceptance claim |
| X-FR-018 | PASS granular deny-by-default support permissions, owner DTOs, MFA/admin-fence checks |
| X-FR-019 | PASS this document, migration proposal, tests and private schema/build/runtime digest evidence |
| X-FR-020 | PASS scoped shared styles and extracted legacy owner components; other section structure preserved |

Global audit inventory is not green: baseline commit already had 54 contract drifts. Reviewed owner entries for this task reduce the remaining unrelated drifts to 50; zero new unreviewed drift was added. This is recorded explicitly rather than waived or presented as complete platform audit coverage. No full CI, provider delivery, authenticated visual acceptance or all-plan production acceptance is claimed.

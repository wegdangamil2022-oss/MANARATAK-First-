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

Use `PASS`, `FAIL`, `BLOCKED` or `RUNTIME_UNVERIFIED` with concrete paths/tests. Source tests do not prove original database/provider readiness, authenticated visual acceptance or complete platform audit coverage. Keep pending checks explicit, including all X-FR cross-domain cases. Existing course and staff follow-up work remains outside this task.

## Delivery evidence

Pending implementation and verification. No original schema/data changes, external activation, main merge or push are part of this approval.

# Completed administration sections: main integration, 2026-10-28

## Reviewed scope

The user authorized completion and integration of all previously completed administration sections into `main`, followed by a verified push and local operation against the existing original database. The integration starts from remote `main` at `53326470`, with the accumulated implementation at `cf69d64b`.

| Section | Integration |
|---|---|
| AI governance and student tools | Scoped administrative workspaces, protected read models, versioned policies, audited emergency stop, compact Cairo/indigo/petrol/gold presentation |
| Certificates and health/readiness | Preserve the existing merged certificate workspace; include its typography adjustment and the later health navigation/evidence improvements |
| Careers and academic taxonomy | Record-scoped workflows, employer verification, canonical geography and preserved taxonomy-to-major relationships |
| Institution services and finance | Catalog/operations/requests and ledger/register workspaces, scoped searches and invoice submission guards |
| Employees, identities and authorization | Separated workspaces, persisted approvals, verified-owner invitations, activation, handover, suspension, resumption, transfer and offboarding |
| Audit, student support and assets | Four/four/five workspace entries, mandatory audited reads, private-owner isolation, durable support cases/messages/history and eligible assignment |

CMS (#49), import operations (#50), notifications (#51), the certificate base and the health base already belong to remote `main`. All local section branch tips belong to the accumulated implementation except `feat/cms-imports-preview-20261027`: its `4ab8d4b0` patch is equivalent to the already included import implementation (`git cherry HEAD <branch>` marks it `-`). No content is missing from that alternate branch. All remote branch tips are ancestors of the accumulated implementation. Older recovery branches do not require another merge.

## Closure corrections

- Review the 50 outstanding audit contracts rather than suppressing the guard. Fingerprint inline permission middleware and actually invoked, lexically scoped evaluator helpers. Nine existing student-tool/document-review handlers gain the same evidence. Preserve global audit/authentication/idempotency boundaries and separately reviewed route collisions. Inventory: **PASS**, 487 handlers / 486 endpoints. This is source evidence, not an owner atomicity certification.
- Update finance/careers/P9 source verifiers to follow the actual extracted editor, record-panel and shared navigation/style components. Preserve canonical country/city/language payload assertions, authenticated student routing, accessible status/error/empty states and employer verification requirements. No product layout or colors change during this integration.
- Update three asset HTTP test fixtures with explicit shared owner/classification metadata required by the private-owner fence. Add a regression showing private support usage remains hidden even without a usage registry. Do not weaken production asset guards.

## Verification

- Expanded Vitest run: 158 files passed initially; the three asset fixture files were corrected and rerun successfully (16 tests). Combined result: **161 files / 1425 tests passed**, including the additional private-usage regression. The initial failures and successful recheck are retained in private integration logs.
- Audit inventory regression suite: **22/22 passed**, including unused/unrelated/late policy rejection and policy-change detection.
- TypeScript: config/domain/application/infrastructure/API/admin/web passed.
- Source architecture and quality gates passed; zero package/file dependency cycles and accessibility findings.
- Source closures: AI/tools **65/65**, certificates **94/94**, finance **150/150**, careers **68/68**, P9 canonical relationships **97/97**, health semantic/security contracts and degree/taxonomy verification passed.
- Existing isolated PostgreSQL support/staff evidence remains 23/20 checks with rollback and zero original acceptance-data writes. No database tests or additional migrations are executed by this integration.

## Original runtime and retained limits

Preserve the existing original Neon connection, restricted application role and local MFA key binding. The two expressly approved support/staff migrations (12 tables) were already applied and verified; do not replay them or deploy other schema changes. Database fingerprints and SQL checksums remain subject to the existing startup checks. No accounts, roles, credentials or MFA configuration are edited.

After integration, seal the API and admin/public assets against the final clean `main` commit, stage startup on port 3002, verify actual response/asset digests and original storage readiness, then serve on port 3000. Compare the pushed commit with `refs/heads/main` from the remote independently. Runtime and push attestations are private machine-specific evidence, not committed credentials or fabricated authenticated UI acceptance.

Private support attachments/scanning, external delivery, automated SLA actions and destructive retention remain outside the approved current release. No provider or worker activation, production deployment or authenticated visual acceptance is claimed. Existing retired Vercel deployment disabling is retained.

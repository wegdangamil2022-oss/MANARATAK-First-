# Section 10 — Universities & Educational Institutions (P11) — Source Remediation

Date: 2026-10-10. Source branch: `codex/section-10-universities` (from `codex/section-09-majors` at `37ef04c9bc8cb9440fea18483f23a52de95d6355`). No main merge or deployment.

## Repository grounding and scope

The implementation was based on the actual Phase 11 architecture, domain and implementation guides in `docs/phases/phase-11-universities-institutions/`, the Section 09 Major implementation and check log, the existing P11 owner APIs, Prisma schema, and the Phase 11 remediation contracts. No `AGENTS.md` or original `MANARATAK_ADMIN_REVIEW_CODEX.md` was found in the recursively inspected source tree on the base branch; therefore neither is represented as reviewed.

Section **10** is the remediation section; **P11** is the platform phase. The pre-existing Section 09 Major candidate governance remains the canonical owner. This work does not merge Section 09 into main.

## Source changes

1. **Administrative write integrity**: Admin mutations require an authenticated actor, nonempty review reason and conditional `If-Match` revision. The repository locks the owner record inside the audited-outbox transaction, rejects stale revisions, advances the owner revision and reports the new revision to the UI. The API responds 409 for stale and 428 for missing revisions. Unauthorized routes remain protected by `admin:universities:manage` in `apps/api/src/app.ts`. Failed mutations roll back with their Audit/Outbox record.
2. **Publication lifecycle**: No root/content mutations on published/archived/rejected institutions. Only allowed review/publish transitions; updating a publishable draft demotes it to review. An ACTIVE public program requires a real DegreeLevel and a P10 Major with a published owner; unmatched source names remain in the Section 09 candidate list and never auto-create majors. Public fields, programs, admissions and approved accreditations use a strict public-field allowlist, excluding internal IDs, metadata and evidence.
3. **Institution hierarchy**: Campus and organization unit (faculty/school/college/department) creation/editing are wired to the owner normalized-details endpoint. Source identifiers and existing child IDs are preserved through upserts. Editing one section no longer deletes unrelated children; cyclic, cross-university or incompatible campus-parent links are rejected. New faculty/department parent and campus assignments are selectable. Archived programs keep their IDs. The schema adds a unique university/source-reference constraint for organization units, with an unapplied SQL migration.
4. **Canonical relationships**: Country/region/city are validated against P7 owners and hierarchy; referenced DegreeLevel/P10 Major/P9 Tests are validated rather than copied. Admission score ranges and duplicate test requirements are checked. Fee and housing currencies are validated against active canonical P7 currency records, and the admin form now selects canonical currencies.
5. **Admissions, rankings and accreditations**: Existing official-link/admission/fee/ranking UI routes remain live and reason-audited. Accreditation drafts must carry organization/name, HTTPS evidence and review state; only explicitly APPROVED entries are projected publicly. Unresolved/insufficient evidence stays internal.
6. **Import safety**: The existing Phase 6 dry-run / explicit approval / recovery-gate design was retained; the executor now rejects mutation of published or inactive owners, refuses ambiguous organization identity matching, verifies canonical currency identities and checks source identity drift. Stage 3/4 enrichment can reuse the previously established INS-* university name without inventing an identity. New university-origin major labels remain review candidates in the existing Section 09 `New Majors` workflow, with university identity, degree, program label and official-source evidence.

## Deliberate limits and runtime handoff

- Source-only remediation; **no database connection, query, import, seed, migration execution, Prisma generation, E2E, full build or deployment** was performed.
- The source SQL migration `20261010170000_p11_unit_source_identity` requires duplicate-preflight review and approved application in the target environment. Do not apply before existing source IDs are reconciled.
- Database/runtime evidence is still required for transactional locking, concurrent edits, permissions/CSRF, canonical reference lookups, candidate review/linking, import approvals/rollback, public projections and end-to-end admin forms. Mark these `RUNTIME_VERIFICATION_DEFERRED`, not `PASSED`.
- No university import or publication was performed and no major was automatically approved.
- The old Phase 11 “Original Development DB / Google Studio recovery” text is historical; operational DB authority is `docs/operations/GREENFIELD_DATABASE_PROVISIONING.md` as its supersession notice states.

This file records source changes, not operational sign-off.

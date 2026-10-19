# ABSHEER — source-only handoff (2026-10-19)

## Preserved
Public website, admin control panel, API, domain and application logic, Prisma schema and structural migrations, student tools framework, CMS, authorization, certificates, scholarships, courses, universities, cities/countries, jobs, payment/notification adapter architecture, and generic import infrastructure.

## Removed / neutralized
- `workspace/` (source spreadsheets, country/city/university/course/scholarship datasets, reports and import artifacts)
- Historical `release-artifacts/`, `evidence/`, large remediation/review/governance archives and organization-specific one-time importer scripts
- Organization-owned brand images, poster and certificate logo (replace with ABSHEER brand assets)
- Hardcoded front-end catalog/demo records, countries, courses, universities, scholarship examples, preview articles, services and FAQs, student notification/tracker samples, homepage sample records, demo course lessons
- Academic taxonomy seed data, external provider seed data, degree-level initial data and provider-specific SQL seed migration
- Environment configuration values: only blank key-name templates should remain

## Before ABSHEER deployment
1. Never copy Manaratak's accounts, contacts, production database, file bucket, JWT/CSRF keys, admin passwords, TOTP secrets, finance keys, OAuth, SMTP, monitoring tokens or certificate-signing secrets.
2. Rebuild fresh DB and provider configurations; add new owner-approved imports through the admin tools.
3. Consistently rebrand `@manaratak/*` npm dependencies and paths, hostname settings, public copy, email sender, certificates, logos and CSS variables. Some internal identifiers still say Manaratak for dependency compatibility.
4. Verify search and public API return zero owner-published records before importing ABSHEER material; verify no automatic seed populates source catalog records.
5. Verified by GitHub Actions on 2026-10-19: `npm ci`, `npm run db:generate`, `npm run typecheck`, and web/admin Vite builds passed. The custom source audit and 4 dedicated handoff tests also passed. Full `npm test`, database integration tests, end-to-end/browser smoke tests and production deployment validation have NOT been completed.
6. Run a full secret scanner before deployment. Historical Git commits remain accessible in the original repository; deliver this as a source ZIP without Git history, never hand over the original Git history.

## Compatibility limitations
The study-room content-heavy demo was replaced with a neutral empty-state screen. Some tests contain synthetic fixtures; no tests were purged. Dataset-specific tools may refer to files intentionally removed and need adaptation. A clean archive of source code does not export live databases or erase secrets held by external providers.


## Verification round 2 — 2026-10-19
- Student public homepage route `/:locale?` now uses an unbranded, intentionally empty `EmptyStudentHomepage`. The original 12KB homepage JSX content has been removed from the public template's render tree.
- Other public section routes, student services, the administration dashboard, API, and domain/database schema remain present so the ABSHEER team can reuse them.
- A second legacy scholarship FAQ dataset (in `components/scholarshipFaqData.ts`) was emptied.
- The old default bootstrap admin address was removed; `ADMIN_BOOTSTRAP_EMAIL` must be supplied by the new owner.
- Previously removed logos are no longer referenced by the admin header or the shared public logo component; these components use temporary letter placeholders.
- Embedded **test-only** CI secret/password values were replaced with references to deployment-managed `ABSHEER_CI_*` GitHub Actions secrets (must be configured for legacy CI jobs).
- `.env.compose.example` now lists the required PostgreSQL/Redis variable names without supplying passwords.
- Automated source scanning and regression tests are provided in `scripts/security/verify-absheer-handoff.mjs`, `tests/handoff/absheer-handoff.test.mjs`, and `.github/workflows/absheer-handoff-audit.yml`.
- GitHub Actions handoff workflow [run 39322274492](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39322274492) completed successfully: 3,226 tracked files scanned against configured high-confidence patterns (0 findings), all 4 handoff tests passed, TypeScript checking and web/admin builds passed. This is NOT a comprehensive credentials provenance audit nor a production-readiness certificate.
- Reference documentation, unit-test fixtures, old namespace aliases and generic provider integration code remain in the source for compatibility and must still be reviewed during actual ABSHEER branding and deployment.
- **Security boundary:** secrets stored in an external deployment, private database, cloud provider, GitHub repo settings or past Git history are not erased by this source-only branch. Revoke/rotate any previously exposed credentials and hand over only the ZIP snapshot (not Git history).

## Interpretation of clean-source checks
- The scanner detects common key/token signatures and dangerous included file types; it cannot prove that every proprietary datum, fixture, infrastructure identifier or low-entropy secret is absent.
- The student homepage route is blank; retained subpage code is intentional to make integration with a future ABSHEER public design possible.
- Keep the existing Manaratak main branch isolated from the handoff branch and transfer the source as ZIP rather than including inherited `.git` history.

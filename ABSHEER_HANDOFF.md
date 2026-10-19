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
5. In a clean runtime execute `npm ci`, `npm run db:generate`, `npm run typecheck`, `npm run build`, `npm test`, and manual web/admin smoke tests. They have **not** been run for this branch.
6. Run a full secret scanner before deployment. Historical Git commits remain accessible in the original repository; deliver this as a source ZIP without Git history, never hand over the original Git history.

## Compatibility limitations
The study-room content-heavy demo was replaced with a neutral empty-state screen. Some tests contain synthetic fixtures; no tests were purged. Dataset-specific tools may refer to files intentionally removed and need adaptation. A clean archive of source code does not export live databases or erase secrets held by external providers.

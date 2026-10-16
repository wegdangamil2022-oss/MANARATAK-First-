# POST28 continuation handoff — 2026-10-16

> آخر استكمال:149 حالة PostgreSQL مختلفة؛ R06 PARTIAL وR05 BLOCKED. أُصلح تجاوز صلاحية المنح عند replay، وأضيف دليل Admin/DB والقراءة العامة. [التقرير والأدلة](POST28_R06_SCHOLARSHIP_ADMIN_REPLAY_2026-10-16.md).

> أحدث استكمال:127 حالة PostgreSQL مختلفة ناجحة؛ R06 PARTIAL وR05 BLOCKED. تفاصيل العلاقات وHTTP واستهلاك الاعتماد وحدود التشغيل في [تقرير الاستكمال](POST28_R06_OWNER_RELATIONS_HTTP_FINANCE_2026-10-16.md). لا تجمع إعادة الحالات7 أو الاستبعادات13 مع العدد.

## Repository and environment
- Repository: https://github.com/wegdangamil2022-oss/MANARATAK-First-
- Branch: `fix/post28-ci-environment-inventory-20261016`.
- Previous verified source commit: `15cf903313fe6f4702e183702c03a00dc09bae2e`.
- This handoff commit preserves subsequent R02 preparation as work in progress, including a known failing regression. It is not database acceptance.
- Old session is a temporary Codex cloud workspace at `/workspace/MANARATAK-First-`. No reusable environment display name is available. Another account must select this repository and branch in its own Codex environment. Old scratch files, installed binaries, Docker images and dependencies are not guaranteed to transfer.

## User direction
Continue checking and repairing autonomously. Earlier stop-on-error/Luna handoff instructions were superseded. No model switch is required. Database is independent of Google Studio. Intended future deployment providers include Vercel and Render; no deployment has occurred. PostgreSQL 16 is the local rehearsal baseline, not an owner-confirmed production provider/version. Do not invent markets, teaching languages, owner signatures, DEC approvals or runtime acceptance.

## Completed
- R01 source repair committed at 15cf9033: official source manifest 33/33 SOURCE gates passed on clean source. Two declared RUNTIME gates remained unexecuted.
- Targeted Section20/B13/B12/postclosure tests: 153 passed; source Section28 tests passed in manifest; preflight 36/36.
- R02 preparation includes target declarations/live identity/read-only checks, loopback disposable roles, separation of DB-G/DB-S, catalog validity checks, restore-target rejection before imports, profile discovery and strict case counts, private Prisma argument dispatch, parity wrappers and a fresh Docker PostgreSQL lab creator.
- No database container or actual DB was created. No migration, restore, runtime database suite or deployment was performed.

## Immediate known failure — start here
`npx --yes --package=node@22.16.0 node --test tests/database/post28-isolation.test.mjs tests/database/greenfield-migration-parity-source.test.mjs`
Last result: **39 passed, 1 failed (40 total)**. The final inert Vitest roundtrip fails `POST28_DATABASE_CASE_SET_CHANGED` at post28-isolation.test.mjs around line 139 and post28-suite-policy.mjs around line 30. Inspect actual Vitest list `.name` versus JSON assertion `.fullName` conventions, repair consistent identity normalization without weakening exact file/case matching, and keep negative tests. No real DB is needed for this repair.
Latest tooling ESLint passed; shared mutation gate tests 7/7 passed. Some final shared-gate edits were made after other checks, so re-run affected checks on a clean committed SHA. Copied evidence is under `docs/reviews/evidence/post28-handoff-20261016`; original absolute scratch paths in metadata are historical and may be unavailable.

## Next steps
1. Read original execution plan beside this file, R01 report, R02 core preparation report, and `docs/operations/POST28_LOCAL_DATABASE_VALIDATION.md`. Read applicable AGENTS.md instructions in the new environment.
2. Install locked dependencies with Node 22.16/npm >=10 (`npm ci --ignore-scripts` was used previously), generate the existing Prisma 5.22 client as needed. Do not change lockfile unnecessarily. Recreate missing tools; host psql/nginx were absent in old environment. Docker was available there, but check the new environment.
3. Fix the known Vitest identity regression. Run targeted Node tests, affected ESLint, source architecture, W2 and source preflight. Discover all four DB profiles; prior static counts: assets32, leases2, sections12312. Persistence expected4 still needs its discovery proof. Static definitions are not executed runtime cases; parameterized cases may expand.
4. Commit repairs, verify clean source, and record exact SHA evidence. R02 coverage and remote CI/CodeQL remain pending. Do not call the entire plan complete based on source checks.
5. R03: on clean committed source, use the documented Node22 `NODE_ENV=test POST28_LOCAL_LAB_CREATE=YES ... node scripts/database/create-post28-lab.mjs` to create ONLY fresh disposable local PG16 DB-G/DB-S. Pinned image: postgres@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d. Read creator first; preserve private env outside Git, never log passwords or put authenticated URLs in OS arguments. Require empty live identity/role preflight before migrations.
6. R04: follow plan prerequisites and run `scripts/database/verify-greenfield-migration-parity.sh` against only this fresh disposable pair. Host psql is required; obtain a compatible client securely or provide a private scratch Docker client wrapper bound to the exact new container. Do not use credentials in command arguments. Source parity runner uses private JS argv and overrides DATABASE_URL/DIRECT_URL to DB-G. Historical migrations must not be edited to hide failures. Source fixes change SHA and require appropriate new frozen evidence/target rehearsal.
7. Continue later phases in dependency order. DB-T suites require validated catalog and purpose maintenance. DB-R is protected and must never receive destructive fixture cleanup. Restore independent verification/authorization requirements remain open; no restore has occurred.

## Boundaries
All previous commits and this checkpoint are on the dedicated branch. Do not merge main or deploy without user direction. Production remains NO_GO; sections27/28 and owner/DEC/market/backup/provider proof remain open. Never turn absent tests, skips, static discovery or source assertions into runtime acceptance.

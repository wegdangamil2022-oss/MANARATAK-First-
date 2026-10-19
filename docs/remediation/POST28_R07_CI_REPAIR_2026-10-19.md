# R07 CI repair and Linux review continuation

Implementation candidate: `950261cf7c5d515367ba502e531d8dcc3a24ec1c` on `feat/post28-r07-artifact-preparation`. Draft review: https://github.com/wegdangamil2022-oss/MANARATAK-First-/pull/34 . No merge or production deployment is authorized by this report.

## Concrete changes

- Corrected stale publication fixtures to require an active canonical country and the current published-owner lookup. Added negative country cases; production publication guards remain unchanged.
- Corrected the Prisma JSON-null roundtrip fixture: writing `Prisma.DbNull` produces SQL NULL and reading it produces JavaScript null. Invalid historical evidence remains rejected.
- Updated the canonical CMS eligibility fixture while preserving denial of missing owners.
- Scoped browser execution to the explicitly authorized Linux review job. Source-only jobs still reject browser commands. Negative boundary tests cover removed dependencies, missing authorization, and commands outside the review job.
- Preserved the exact canonical `npm run test:unit` execution and exit code while emitting bounded, escaped CI failure annotations.
- Added an isolated Linux image/PG16/HTTPS browser diagnostic using actual retrieved API, Web and Admin units, restricted application credentials, disabled workers/providers and owned-resource cleanup. This is executable preparation, not proof that the runtime has passed.
- Repaired the three Node failures identified in the complete CI log: retain the exact reviewed 110-migration prefix checksum and assert the exact approved 111th migration; explicitly provide the real `node:crypto` module to the existing restricted VM fixture; replace fixed negative-diagnostic credentials with random one-use credentials and redact them from retained logs.

## Targeted verification

- Publication, localization, CMS, canonical lookup and asset evidence suites: 67 passed after the fixture corrections. The pre-fix run had 11 failures.
- P12 source closure: 195 passed after retaining the canonical command.
- W7 boundary plus child-process diagnostics tests: 7 passed.
- Three affected Node test files after the final repair: 13 passed, zero failures, zero skips. This includes the historical checksum assertions, in-use asset deletion prevention, and unchanged repository credential scanner.
- Syntax, targeted ESLint and whitespace validation passed. PowerShell initially rejected the `npx.ps1` launcher; the unchanged tool ran successfully through `npx.cmd`.

## Runtime acceptance

Authoritative candidate run: https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39307051969 . At the initial observation this run was still executing; no full CI, artifact retrieval or Linux runtime PASS is claimed here. Subsequent evidence must identify this exact SHA and run, and retain failures rather than relabel an earlier successful run.

R05 historical acceptance and R06 documented exceptions remain unchanged. Existing R07 local browser proof remains bound to its original source SHA. Formal R07 acceptance and release/promotion remain open until their actual evidence and release gates are satisfied.

The three unfinished R08 concurrent-refresh files remain outside these commits. They are not represented as verified or completed by this R07 work.

## Subsequent observation: stale artifact failure invalidates the reported artifact PASS

Run `39307051969` completed application build, Vitest, and all 1025 Node tests successfully. However, the source job's green artifact step and its generated `SOURCE_CI_CLOSURE.json` are **not trustworthy evidence of artifact construction**: the actual job log shows `RELEASE_FRESH_OUTPUT_REQUIRED`. A tracked legacy `release-artifacts` directory already existed. Bash ignored the first failure in an `&&` list because a following `echo` succeeded. The upload therefore retained legacy `SOURCE_SHA_UNAVAILABLE` artifacts. Retrieval also masked the manifest verifier's nonzero status through a `tee` pipeline without `pipefail`. Linux failed before unpacking or starting any API/database.

The correction builds into a fresh runner-temporary directory outside the checkout, passes that exact directory to verification and upload, uses separate build/verify commands, and explicitly enables `set -euo pipefail` and Bash for both affected steps. Historical tracked files are not used or deleted. A behavioral regression executes the actual extracted workflow bodies with injected build/verifier failures and proves exit statuses 73/74 stop all subsequent commands; the affected CI regression file passes 9/9 locally. The failed run and its legacy artifact receipts must not be presented as R07 acceptance.

# R07 CI repair and Linux review continuation

Current outcome: source `1349371f29902857be7444cf89457e90a1d4b25d` passed all six push jobs, all eight PR workflows and 23 check runs, including the separate CodeQL result. Actual fresh Linux PG16/HTTPS browser proof is retained in the [current Linux report](POST28_R07_LINUX_REVIEW_PROOF_2026-10-19.md). The sections below retain earlier failures and repairs at their original sources.

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

## Follow-up: actual GitHub notification failures

The owner confirmed the emails are GitHub failure notifications. Latest inspected source was `6dfae89cf3278678a0c50a49fd9c9f4bf37e2e8a`.

- Enterprise PR run `39309962264`, job `118256678463`, failed on the existing subject `merge(r07): integrate tested R06 fixes while retaining artifact tooling`. Inspection of the complete branch history also found two published `config(post28)` subjects. The policy now explicitly recognizes configuration and merge categories, retaining required delimiter, scope syntax, subject length and rejection of arbitrary categories. All 291 existing subjects validate locally; no published commits were rewritten.
- Imported Courses PR run `39309962183`, job `118256678278`, failed one Node test: `git rev-parse --verify 23897bda^{commit}` could not resolve the historical R05 predecessor because checkout was shallow. The workflow now fetches full history. The predecessor/checksum assertions remain intact. The raw compressed job log was inspected rather than treating the truncated tail as a diagnosis.
- Both workflows cancel superseded PR executions within their own workflow/event/branch group. Push runs use a different group and are not cancelled by this setting; new Linux diagnostic work is not displaced by a PR event. Checks remain enabled.
- The active imported-course workflow no longer assigns future execution to Google Studio; it explicitly requires an authorized isolated runtime lab and makes no runtime-acceptance claim.

Targeted verification: 10 CI regression tests and 6 directly affected workflow-boundary tests passed; environment inventory is current at 320 variable names; targeted ESLint and whitespace checks passed. No full local build or unrelated suites were repeated. The prior R08 concurrent-refresh changes remain excluded.

At the time of these repairs, push run `39309948873` was still executing. Its eventual result must be read independently; a correction for PR metadata/history is not evidence that artifact/Linux runtime gates passed.

## Verified follow-up and retired preview configuration

The completed `6dfae89` push run `39309948873` passed all six jobs, including actual immutable-artifact retrieval and the Linux PG16/HTTPS/browser runtime. The [retained Linux proof](POST28_R07_LINUX_REVIEW_PROOF_2026-10-19.md) records its exact source and limits. At corrected source `5879c610bc0527db89a4d29ccb46934aa251864d`, all eight PR workflows succeeded, including Enterprise `39311717939` and Imported Courses `39311718192`; the latter now passes the unchanged historical-predecessor/checksum test. This confirms the two reported PR failure causes were repaired.

The owner confirmed the inaccessible Vercel project `manaratak-2-preview-2026` is old and unused. Commit `6f9cae73dfad7a2886bb0f4225ca49cb256e6d05` disables automatic Git deployment for this remediation branch using the supported root `vercel.json` configuration, without changing other branches or notification preferences. GitHub CI and deployment-configuration validation remain enabled. The organization verifier explicitly registers the new configuration filename; all seven affected organization tests and the repository organization check pass. No production deployment, project deletion or fabricated green status occurred. Subsequent CI/status observations must remain bound to this new SHA.

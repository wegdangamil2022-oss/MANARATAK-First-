# POST28 R01 source gate repair and continuation

Parent: `b361f4a96f17bf671c6ccc416c72180ce0dc998d` on `fix/post28-ci-environment-inventory-20261016`.

The user superseded the manual Luna/Sol stop cycle: continue authorized checks and repair failures within the validation plan. Database hosting is external to Google AI Studio; Vercel/Render are intended application deployment targets. PostgreSQL 16 is selected for an isolated development rehearsal, matching repository CI; production compatibility still requires the selected service configuration.

## Corrections

- Section20 was invoked without its source-alias config. Use `node node_modules/vitest/vitest.mjs run --config .section20-finance-vitest.config.ts` with the three affected Section20 files. The resulting 63-pass/1-fail run exposed a wallet fixture without `ownerReferenceId`: consent rejection prevented the intended changed-intent assertion. Supply the authenticated fixture owner and assert zero command receipt/outbox as well as zero audit. All 64 affected tests then passed.
- Repository organization now enumerates the existing B-package/section validation configs explicitly. Unknown hidden configs and a root evidence directory still fail; regression fixtures verify both. Three historical section26 logs were moved byte-for-byte under `docs/reviews/evidence/section-26-initial-20261014`; references were updated and historical outcomes retained.
- Baseline manifest v2 requires counters for all 281 persistence-owned models, adding 15 missing models from the ownership authority. The source guard now compares exact keys and every owner, preventing a same-count substitution. Existing snapshot versions are not relabeled. No SQL or schema changed.
- Roadmap validation follows the scoped P01–P24 checkpoint and its explicit incomplete-runtime boundary. Retention checks follow APPLIED-only terminal lookup; the retry fixture no longer treats SKIPPED as terminal.
- Source contracts follow current MFA composition, array-spread drain, multiline read-only guard, localized prototype/roadmap/error copy, slug-only public relationship policy, paginated canonical country-major reads, and shared canonical scholarship filters. Worker checks trace server → RegisterRecurringJobs/PollingWorkerRuntime → actual job registration and success/failure signals. Installment checks retain use-case money validation and inspect replay/state/balance/date checks in the persistence owner.
- The strict body-read policy recognizes only exact bounded credential-key helpers and destructuring whose discarded fields are unused and whose sole rest-binding use is a schema parser. Negative cases reject unbounded extraction, raw forwarding, reuse after parse and use of discarded fields. No application authorization or request-body implementation was changed.
- CI execution reports include the actual source manifest SHA-256, source gate IDs, configured unit command and current runtime-pending authority. The existing unsigned report remains BLOCKED when steps are missing; tests assert the provenance fields and conservative outcome.

## Checks and evidence

Node 22.16.0 is used for source/test execution. Diagnostic results include Section20 64/64, postclosure 10/10, alumni consent/directory/HTTP 16/16, source-policy/lifecycle 12/12, organization regression 6/6 and baseline/retention 8/8. B13 63/63 was already verified on the parent commit. The seven required verifiers, closure, quality, preflight, source typecheck, secrets, action pins and production dependency audit passed during this continuation. The production dependency audit reported zero advisories.

The authoritative 35-gate manifest contains 33 SOURCE and 2 RUNTIME gates. Its full source-only execution is verified after commit; raw results and source digests are stored under `/workspace/scratch/post28/<commit>/R01-final/`. The two runtime gates remain explicitly unexecuted in that command. This source manifest is not the complete remote CI workflow (global build/unit/artifacts and CodeQL remain separate obligations).

Nginx 1.26.3 was extracted into scratch from the Debian package after SHA-256 verification; no system installation succeeded. The CMS Nginx contract passed seven checks with a mock owner. PostgreSQL image `postgres:16` was pulled at digest `sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d`; no database was started or migrated in R01.

Diagnostic logs are under the parent SHA's `R01-continuation/`. An early scratch runner reused some log names; the checks ledger retains their historical exit codes and hashes, but overwritten earlier raw files are not presented as intact evidence. Available files were snapshotted and subsequent runs use unique timestamps. Final evidence uses immutable per-run files.

## Next prerequisites

Continue R02-core: explicit suite discovery (including asset PostgreSQL suites), preflight identity/schema/role/sentinel checks, expected/executed/skip output, shadow target uniqueness, NOT VALID handling and separation of restore measurements from destructive suites. DB-G/DB-S must have distinct disposable identities before migrations. R02 coverage decisions, launch markets/languages, independent signing/recovery authorities and full remote CI remain open. Sections27/28 remain open, production NO_GO; no deployment, provider call, restore or production mutation is claimed.

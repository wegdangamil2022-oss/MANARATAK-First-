# Google AI Studio update regression repair — 2026-10-02

## Scope and decision

- Incoming commit: `89aa7202d788c533e24ebd8fe66909c27746adff`, based on `4324b27a51b7fd5f0771420eab4fce9b6707feb1`.
- The incoming commit changes 107 files. It removes required implementations and previously verified security, import and operational controls. This repair reverses that commit in a new commit; it does not rewrite history.
- All 107 affected files are restored from the preceding verified revision. No independent addition was retained: the additions extend access-token lifetime, revive retired diagnostics or duplicate older logic while deleting its current implementation and tests.
- Existing unrelated untracked local files are excluded.

## Regressions addressed

| Area | Incoming change and repair |
| --- | --- |
| Authentication | Restore the 15-minute maximum access-token TTL and launcher default, verified-email and active-identity bootstrap checks, owner-role permission validation, and read-only owner preflight. |
| Legacy diagnostics | Restore fail-closed retirement of direct administrator promotion and credential/hash/email diagnostics. No restored or incoming diagnostic is executed. |
| Administrative navigation | Restore the shared canonical path policy, reference-data section permission and unsafe-path rejection. |
| Regions and cities | Restore region lifecycle/version fields, audited transactional region authoring, scoped pagination/counting, and the typed university country/region/city validator. |
| Governed relationships | Restore provider mapping transactions and concurrency checks, reviewed major taxonomy mapping, course taxonomy resolution, international-test graph locking and governed import writer. |
| Import preparation | Restore source QC, hash-bound reviewed URL decisions, scholarship section evidence, quarantine outputs, pilot evidence contracts and their negative tests. These remain source preparation, not proof of live imports. |
| Migration policy | Restore the deleted region migration and recovery entry, historical metadata sidecar policy, portable rollback inventory and nonzero failure status. No historical migration SQL or checksum is modified. |
| Runtime composition | Restore separate Admin asset routing, API-unavailable JSON behavior, injected SMTP public URL, launcher failure handling, environment inventory and current worker/shutdown tests. |
| Source gates | Restore registered QC verification and checks targeting current auth, worker, public UI and deployment configuration code. |

## Failures reproduced before repair

- Root `tsc -b`: failed with five infrastructure type errors (missing course and reference-data contract methods and incomplete region DTOs).
- Persistence boundary verifier: failed with eight migration metadata violations.
- SMTP loopback delivery test: failed because the incoming expectation no longer matched the actual message format.
- A W3 source assertion also reported failure when initially invoked through Vitest. Native `node:test` files are verified with Node's test runner after restoration; Vitest's suite summary is not used as evidence for those assertions.

## Verification after repair

- Root `tsc -b`: PASS.
- Vercel TypeScript context verification: PASS, zero diagnostics.
- Full workspace build (API, Admin, Web and packages): PASS.
- Full Vitest source/unit suite: 437 files passed, three skipped; 2,463 tests passed, seven skipped. Skipped cases are not runtime proof.
- Focused native Node tests with the existing `tsx` loader: 40/40 passed across bootstrap, owner preflight, client authority policy, worker composition, recovery exit status, migration metadata, retired diagnostics, launcher failures and shutdown drain.
- Initial native bootstrap invocation without the TypeScript loader failed to resolve an extensionless workspace import. Re-running with `node --import tsx --test --test-reporter=tap` passed; no test assertion was relaxed.
- Authoritative source closure manifest: all 28 source gates PASS; connected database integration and browser E2E remain pending.
- Full ESLint, secret scan and environment inventory check: PASS (240 variable names).
- The restored migration and all other incoming-commit paths match `4324b27` exactly; the only additional artifact is this report.

GitHub CI is evaluated on the pushed repair commit before merge. Local results do not establish Google AI Studio or live database readiness.

## Connected-environment follow-up — RUNTIME_UNTESTED

No database connection, migration, seed, import, deployment or Google AI Studio operation is performed in this repair.

After pulling the repaired `main` into the connected environment:

1. Confirm the checkout revision and generate the Prisma client from the restored schema. Review migration status read-only before any governed migration operation; restoration of a migration file does not establish whether it was applied there.
2. Run `auth:owner:preflight` in read-only mode against the verified persisted identity and inspect existing assignments and audit records. Do not infer the stable identity ID from email alone or paste secrets into chat.
3. Verify owner/student browser reuse, old administrative return paths, direct Admin navigation and a staff account restricted to one section, including forbidden administrative API requests.
4. Verify live CSRF/refresh retry behavior, region/city writes and relationships, and provider/major/test transactions and audit evidence.
5. Verify worker lifecycle, shutdown, SMTP links and source/QC integrity in the actual environment before any pilot/import approval.

The incoming scripts might have been executed elsewhere, but there is no evidence of that in this source review. Restoring source cannot reverse previously persisted grants, tokens or database changes. Check actual assignments and sessions read-only and follow the existing governed revocation/recovery procedure if a discrepancy is found.

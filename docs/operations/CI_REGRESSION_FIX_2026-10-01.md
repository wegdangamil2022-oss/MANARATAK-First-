# M10-A CI regression repairs — 2026-10-01

Base: `21a1fd0b8662240fed2799cdfdba6df334fae531`. Follow-up branch: `fix/m10-a-ci-regressions`.

This records source repairs prompted by failing GitHub checks. It does not reopen M0–M9 or certify M10 runtime completion.

## Failures reproduced and repairs

- Architecture: a static public prototype import reached the live hook; the hook now uses an explicit dynamic import, defaults unknown modes to API, and obeys the production capability define. A negative guard test rejects static imports even alongside a dynamic branch.
- Student account change: old personal browser cache is deleted by a cleanup helper; server data remains authoritative. Tests cover account change without logout, old administrative return paths, and restricted browser storage.
- CI manifest: the dataset source verifier is explicitly registered; existing source and runtime classifications are preserved.
- Environment inventory: generated files were stale. Inventory reads tracked sources and variable names only; local scratch files and environment values are not collected.
- Auth: refresh/logout accept only the protected refresh cookie, and remember-me lifetime comes from the protected cookie. Request-body token/flag overrides are rejected or ignored. Login failures use generic text.
- Cookies: ordinary sessions use SameSite Strict; staging/production always require Secure. Only explicitly enabled, non-production Google AI Studio iframe previews use Secure, HttpOnly, partitioned SameSite None cookies. CSRF/session verification remains required.
- Privileged identity queries reject unknown keys and normalize only their declared pagination forms.
- SMTP links use configuration injected by the API composition root, with no infrastructure environment fallback.
- Polling workers remove the captured completed promise from the in-flight set. Shutdown includes polling drain in its deadline, so a stuck worker cannot indefinitely delay HTTP stop or resource cleanup.
- Existing source guards now check the current authentication, shared permission mapping, redirect helper, polling runtime, inherited Cairo font and accessible error markup. Node test reporters are explicitly TAP where a verifier parses TAP counts.
- Student status colors use the existing semantic light/dark tokens; the inverse hero context is restored. The documented local topology includes Mailpit.
- Three existing M7 migrations lacked recovery classifications. They now conservatively require backup restore; no historical SQL or checksum is changed, and no reverse SQL safety is claimed.

## Explicit operational tooling review

The architecture boundary continues to reject unclassified direct Prisma scripts. No directory wildcard was added.

| Classification | Files | Review |
| --- | --- | --- |
| Read diagnostics | `check_outbox.ts`, `find-failures.ts`, `inspect_audit_logs.ts`, `inspect_db_roles.ts`, `inspect_db.ts`, `inspect_workspaces.ts`, `inspect-owner.ts`, `show-audit.ts`, `test-validator.ts`, `test-verifier.ts` | Existing read operations; explicitly classified, never executed in this task. Live output needs operator review for sensitive audit/identity data. |
| Gated administration | `rbac-baseline-provision.mjs`, `rotate-application-role.mjs` | Existing database mutation approval and purpose-specific confirmations precede Prisma construction. Negative tests prove missing approval stops execution before a database client is constructed. |
| Retired diagnostics | `inspect_hash_format.ts`, `show-hash-format.ts`, `simulate_full_flow.ts`, `test-resend.ts`, `verify_credentials.ts` | Credential/hash exposure or ungoverned authentication changes; replaced by fail-closed tombstones. |
| Retired launchers | `run-show-hash-format.js`, `run-test-resend.js` | Fail before loading credentials or spawning tools. |

Use governed authenticated routes or `auth:owner:preflight` for future owner investigations. The retired files' historical contents are not proof that any credential is currently valid.

## Evidence and remaining live verification

Source evidence is reported with the delivery commit/check results. Relevant behavioral suites use isolated adapters, mocks, in-memory repositories and a local test SMTP socket; no live email was sent.

**RUNTIME_UNTESTED:** connected database owner assignments and audit records, real browser cookie persistence inside Google AI Studio, authenticated CSRF/refresh/retry across real sessions, and production worker shutdown/telemetry under load. Test these in the authorized connected environment without sharing credentials in chat.

No database connection, migration, seed, import, deployment, dependency download, or Google AI Studio access was performed for these repairs.

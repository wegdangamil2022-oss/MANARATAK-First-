# Section 22 handoff

The expedited P21 code pass is on `fix/codex-section-22-careers`, based on section-21 merge `e5efbbe2`. See [implementation](section-22-implementation.md) and [validation disposition](section-22-validation.json).

Existing tables and JSON columns are reused. `_career` governance is server controlled. Publishing/editing, employer evidence, CV/application/alumni privacy, API/DI, basic Admin/Student screens and paged public search are prepared. Career maintenance is registered but defaults disabled. Legacy records need independent re-attestation; fine-grained IAM assignments must be configured before use.

No tests, compiler, syntax or lint checks were run, per the user. No database/provider calls, migrations, main merge or deployment. Source preparation is not a final build/production certificate. Operational acceptance is deferred after section 28. Do not infer that old test results validate these edits.

Scope limits: a full recruitment ATS/analytics suite, advanced ranked or skill/salary search, runtime delivery, historical dedup/retention policy and full browser/accessibility/locale acceptance remain outstanding operational or enhancement work. Do not report those as implemented or verified. Continue to section 23 (Notifications) only if requested; do not merge this branch automatically.

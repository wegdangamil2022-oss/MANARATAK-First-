# MNT-AUD-0115 — Boolean Environment Coercion Can Invert Security Controls

- **Discovered:** 2026-09-06 during remediation of MNT-AUD-0043
- **Wave:** W1 / W6
- **Severity:** P1 — HIGH
- **Category:** CONFIG / SECURITY / TYPE_COERCION / READINESS
- **Status:** SOURCE_VERIFIED / RUNTIME_PENDING

## Evidence

The canonical `AppConfigSchema` used `z.coerce.boolean()` for security-sensitive environment values. JavaScript boolean coercion is truthiness-based, so a non-empty string such as `"false"` evaluates to `true`. A deployment operator could therefore explicitly configure a control as false while the typed runtime observes true.

Security-sensitive examples include `SECURE_COOKIE`, `SECURITY_CSP_ENABLED`, and worker enablement flags.

## Remediation executed

1. Replaced truthiness coercion with an explicit environment boolean parser accepting only `true/false/1/0`.
2. Production/staging security booleans are no longer silently supplied by schema defaults; missing values fail the canonical production contract.
3. `ProductionReadinessValidator` now consumes normalized `AppConfig` values rather than independently interpreting raw `process.env` strings.
4. The certificate completion worker now consumes typed `ConfigurationRegistry` values.
5. Added source tests and a mechanical environment-contract verifier.

## Closure evidence still required

- Full dependency-backed config/Vitest suite after the workspace dependency installation is healthy.
- Staging startup proof with explicit `false` values demonstrating fail-closed behavior.
- CI evidence from the canonical pipeline.

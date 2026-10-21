# Actual Linux review evidence

Source: `6dfae89cf3278678a0c50a49fd9c9f4bf37e2e8a`.
Actions push run: https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39309948873 . All six jobs succeeded.

The Linux proof archive (artifact 12216716217) was downloaded through authenticated GitHub Actions retrieval; its ZIP SHA256 was verified against the API digest: `390aad71a28de119d1f338de4b627005cccdd42bc594f90e4eb624447eedf4e3`. Retained runtime files were extracted without modification; `.log` names were changed to `.txt` to retain readable receipts. TLS private keys, environment files and lab credentials were not included. This directory is marked binary for Git line-ending conversion so its byte digests remain portable.

`artifact-retrieval.txt` comes from separate retrieval artifact 12216220995, whose ZIP SHA256 is `471c372f6f0d85a1db192aa78db4d19c54156c4e28cda072fc1b8eb9ded0e84e`. `SOURCE_CI_CLOSURE.json` comes from source artifact 12215279361, ZIP SHA256 `c17d61a22702c8454549ab5f035853cea0e7f50aeed00373e6c5522a2cbc5fb5`. `github-run.json` is the separately queried final run receipt. `dependency-audit.json` is a local production-dependency audit of the same unchanged lockfile with zero reported vulnerabilities, normalized from PowerShell UTF-16 output to UTF-8 JSON; it is not a Linux runtime observation.

`initialize.txt` retains the initializer's historical authorization string `R05: BLOCKED_USER_AUTHORIZED_SCOPED_R06`. It records scoped synthetic setup, not the current R05 acceptance state. Current R05 local closure remains bound to its independent evidence; this old string was not rewritten. Application tests use the restricted `post28_app` role; the separate migrator is used only for reviewed fresh-schema and synthetic-fixture setup.

This is a diagnostic acceptance proof. Its `formalR07Acceptance`, `productionAcceptance`, and `promotionAuthorized` values remain false. The 32 browser console errors are preserved: expected access-denial responses and isolated-policy blocked external image requests. There were zero page errors and zero HTTP 5xx responses. See the current remediation report for boundaries and the separate latest-candidate CI state.

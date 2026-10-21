# Exact-source CI and security closure evidence

Source `1349371f29902857be7444cf89457e90a1d4b25d`. Push run 39315368366 and all eight PR workflows succeeded. `github-checks.json` retains 23 completed successful check runs, no failures/pending checks and no Vercel deployment status. Its `combinedStatus: pending` is the separate legacy commit-status endpoint with an empty `statuses` array; it does not aggregate check runs. The check-run states and individual workflow receipts are authoritative for the stated CI observation.

`codeql-result.json` is the actual separate CodeQL result: no new alerts in the PR diff, zero annotations. `security-final-attempt.json` retains the successful workflow. The first attempt failed during result upload after queries and SARIF export; its receipt, bounded upload excerpt and original full-log digest remain separate. `codeql-rerun-request.json` records the exact single-job rerun request. The attempt-2 job metadata retained the original 19:58 UTC execution timestamps for secret-scan/dependency-review/dependency-audit, while CodeQL started at 20:07 UTC; successful jobs were reused, not re-executed. No query or severity policy was disabled.

The five specific reviewed alert dispositions belong to the preceding 6f9cae7 evidence directory. The three actual ReDoS defects were repaired in source rather than dismissed. Earlier repository findings remain outside this PR-specific closure; no repository-wide vulnerability-free claim is made.

`renderer-compatibility.json` records one synthetic real-renderer-to-validator check of the PDF, PREVIEW and QR artifacts, without DB or provider calls. The persistent security regression tests are in the two source-pinned affected Vitest files. The actual Linux image/PG16/HTTPS/browser receipts are in the neighboring `r07-linux-runtime` directory.

This proof is not rebound to the later documentation commit. Production, formal release promotion and prior R06 comprehensive exceptions remain separate gates. The three original unfinished R08 working-copy files are not included as completed source.

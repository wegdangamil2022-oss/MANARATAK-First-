# Staging — actual certificate and financial worker replay

Two selected domain cases passed in separate new PostgreSQL16 clusters with the ordinary `post28_app` role. Both clusters were stopped; no existing database was touched. This is additional implementation evidence, not full worker, staging or production acceptance.

## Financial repair

The real financial background handler exposed a reproducible invoice reconciliation failure: PostgreSQL folds the unquoted alias `walletPaid` to `walletpaid`, while `PrismaFinanceRepository` reads `walletPaid`. Converting that missing value to BigInt failed the job after its financial effect. Commit `5a22e1b4a0d36fe23a0646d08f7f4b056dbf0aed` quotes the alias. No migration, amount calculation or acceptance assertion was changed.

The new test uses the signed HTTP loopback provider, real finance use cases, persisted queue and reconciliation handler. A provider capture commits before its HTTP acknowledgement is lost. The test waits for the natural reconciliation deadline. After the actual handler completes, an injected acknowledgement failure schedules the same job again. A new Prisma connection, use-case instance and worker retry that job with its original idempotency key. Assertions require one provider capture, one transaction with two balanced entries, one receipt, unchanged financial snapshots after replay, a completed job and failed/succeeded execution history without a dead letter. The pre-fix failed-job inspection records the BigInt error and both SQL alias names.

The optional `--r08-provider-fixtures` setup now grants its synthetic application role DML on the existing payment-attempt and two reconciliation tables required by that handler. These grants remain outside the default fixture; DDL and migration-ledger write access remain denied.

Evidence: [financial index](../reviews/evidence/post28/5a22e1b4a0d36fe23a0646d08f7f4b056dbf0aed/staging-worker-domain/index.json), [selected result](../reviews/evidence/post28/5a22e1b4a0d36fe23a0646d08f7f4b056dbf0aed/staging-worker-domain/summary.json), [pre-fix read-only inspection](../reviews/evidence/post28/5a22e1b4a0d36fe23a0646d08f7f4b056dbf0aed/staging-worker-domain/pre-fix-read-only-inspection.json).

## Certificate delivery

The new certificate case emits a real course-completion event and invokes the real issuance use case through `CertificateCompletionOutboxWorker` and its delivery gateway. An injected acknowledgement failure occurs after issuance. The persisted delivery is `FAILED`, unclaimed and retryable. A new Prisma connection and worker replay the same event. Certificate, issuance inbox, ledger and audit counts remain unchanged; the outbox becomes `PROCESSED` and the next poll is empty. The initial test expectation incorrectly used `PENDING`; it was corrected to the existing storage contract, without changing runtime state transitions.

Evidence: [certificate index](../reviews/evidence/post28/f55c4afeb49f59dd24d67ebf9b5323005ab9b482/staging-worker-domain/index.json), [selected result](../reviews/evidence/post28/f55c4afeb49f59dd24d67ebf9b5323005ab9b482/staging-worker-domain/summary.json).

Each local execution selected exactly one case. Discovery found five finance cases and fifteen certificate cases; the unselected cases were not executed or counted as passed. The generated setup receipts preserve their original scoped laboratory authorization metadata; they do not redefine the latest R05/R06 acceptance decisions.

## CI and release consequences

The existing Linux provider lab now runs the new financial worker case alongside its two retained provider cases. A second fresh lab selects the certificate worker case. Both use restricted PG16 fixtures and retain only sanitized observations and cleanup. The job budget increases from ten to fifteen minutes for the additional provisioning and natural provider deadline. Their observed Linux result is recorded below, separately from the still-pending general CI result.

The financial repair changes actual application bytes. The old staging plan still identifies historical candidate `aaf932e17c10e71d37d7f69a50dfe1c20e7c4b1b`; `prepare-staging-review.mjs` correctly rejects its reuse with `STAGING_REVIEW_RUNTIME_CHANGED_REQUIRES_NEW_CANDIDATE`. Fresh immutable artifacts, CI and source-bound evidence are required before replacing that plan.

The pinned old rollback pair also lacks the repair. CI now records `BLOCKED_RUNTIME_COMPATIBILITY_REVIEW_REQUIRED` before retrieving or starting that pair, retains the blocked receipt and continues independent diagnostics. `assertRollbackPair` and its rejection tests are unchanged. A successful pipeline does not establish rollback acceptance when its rollback receipt is blocked. A newly reviewed compatible artifact pair remains required; the earlier successful same-implementation rollback evidence applies only to its recorded source SHA.

Validation for this orchestration change: the four existing rollback safety tests and ten CI runtime regression contracts passed; scoped ESLint passed. The new preflight was actually invoked and recorded exactly the financial repository as a changed runtime path, with `rollbackExecuted=false`, `rollbackPassed=false` and formal acceptance false. The two successful local database cases were not repeated after documentation/orchestration edits.

## Remaining worker scope

These cases inject a failure after a committed effect in one process, then construct fresh clients/workers. They do not kill an operating-system process, prove all lease-expiry races, use Redis scheduling, render a certificate PDF or validate a real asset/payment provider. Historical synthetic certificate fixture setup remains explicit. Existing worker flags remain disabled in the staging review plan until the required enabled routes, renderer/assets, scheduler, recovery and readiness configuration have evidence. Actual hosting, TLS, provider backups, trust approvals and production promotion remain blocked as previously documented.

## Observed Linux result

Actions [39661105241](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39661105241) completed its isolated worker diagnostic job successfully on `8e001c92a97e0e2f865adce90fc4b3bc6d3b5514`. All three selected financial/provider cases and the selected certificate worker case passed. Both separate PostgreSQL16 databases and their networks were removed; neither lab touched an existing database. Redis isolation and Linux signal checks in that same job also succeeded. Artifact downloads were verified against GitHub's SHA256 digests before retaining selected JSON evidence. No private lab files or credentials were retained.

Retained evidence: [financial Linux index](../reviews/evidence/post28/8e001c92a97e0e2f865adce90fc4b3bc6d3b5514/staging-worker-linux/finance/index.json), [certificate Linux index](../reviews/evidence/post28/8e001c92a97e0e2f865adce90fc4b3bc6d3b5514/staging-worker-linux/certificate/index.json). At this observation the general source job was still running, with Prisma validation/client generation and workspace typechecking already successful. This worker result does not claim all six CI jobs or the blocked rollback pair passed.

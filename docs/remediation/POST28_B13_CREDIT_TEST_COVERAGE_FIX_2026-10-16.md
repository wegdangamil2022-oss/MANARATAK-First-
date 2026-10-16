# POST28 R01 B13 credit acceptance coverage repair

Parent candidate: `8828043f9af1d8903b1962bc06abc30d87c57d91`.

Luna stopped with BLOCKED because the passing B13 suite did not exercise the original credit owner/use case and lacked an oversized request-key HTTP case. This is a coverage repair; no application, schema, migration or historical result was changed.

`B13CreditNote.spec.ts` uses the actual FinanceAdminRouter, FinancePlatformUseCases and PrismaFinanceRepository with explicit in-memory persistence delegates. It covers full-credit replay after CREDITED, changed reason/amount/version under the same key, ledger debit/credit amounts, authenticated actor, single document/ledger/command receipt/audit/outbox/invoice mutation, amount/balance/currency/scale validation, missing/zero/stale versions, reason bounds and pending payment/hold reservations. Owner currency/scale checks are also invoked directly so application validation cannot hide an owner regression. Existing `.b13-vitest.config.ts` discovers this file without configuration changes.

`B13CommandBoundary.spec.ts` retains missing-key validation and adds a 201-character key; both require HTTP 400 and zero use-case dispatch. Its existing capture-without-expectedVersion case still requires HTTP 400 and no dispatch.

During fixture development, the first run failed 17 cases at constructor validation because required unused provider dependencies were omitted (44 other tests passed). Explicit provider doubles were supplied; they throw if called. The next run passed 61/61; two additional direct owner currency/scale cases were then added. Final verification is bound to the resulting commit in `/workspace/scratch/post28/<commit>/R01-b13-coverage-fix/summary.json` with raw logs and SHA-256 digests. Historical failures remain unchanged.

Limits: delegate doubles do not establish PostgreSQL transaction atomicity, rollback, isolation or concurrency. R04/R06 database evidence, full GitHub CI, R00 owner/scope decisions and production acceptance remain pending. Sections 27/28 remain open and production remains NO_GO.

After FIX_VERIFIED, the user manually returns to Luna. Continue R01 from remaining reversal/receipt/alumni follow-up cases and required source gates; do not repeat B13 on this candidate without a new reason. The existing section28 63/63 result belongs to the parent SHA and is not relabeled as evidence for this commit; final candidate gates remain subject to the execution plan.

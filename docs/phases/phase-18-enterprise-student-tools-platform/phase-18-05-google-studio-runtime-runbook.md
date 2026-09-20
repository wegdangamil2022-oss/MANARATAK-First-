# Phase 18 Google Studio Runtime Runbook

Run these steps only in the approved Google Studio runtime after backups and environment validation.

1. Pull the Phase 18 commit and install the locked dependencies.
2. Configure `DATABASE_URL`, Redis/rate-limit production dependency, authentication secrets, Asset Platform references if used, and Phase 17 provider secrets as environment secrets. Never store provider keys in Prisma.
3. Apply the additive Phase 18 migration with the production migration workflow. Do not use `db push`.
4. Run `npm run db:generate` and validate the deployed schema.
5. Run `npx tsx scripts/bootstrap-phase18-student-tools.ts` once. Verify `PHASE18_REGISTRY_INSTALLED=83`, exactly four `IMPLEMENTED`, and no planned record is globally enabled.
6. In Phase 17, register/activate consumer `phase18-student-tools`, capabilities `student-tools.motivation-letter.generate` and `student-tools.scholarship-recommendation.rank`, their reviewed prompt deployments, permitted models, routing, quotas, budgets, and guardrails.
7. Configure real production rate limiting. Process-local limiting is source/development-only.
8. Verify authenticated and anonymous access matrices, lifecycle/feature flags, Audit and Transactional Outbox delivery.
9. Execute deterministic probes for GPA and University Comparison against published canonical data.
10. Execute controlled AI probes for the motivation letter and scholarship ranking. Confirm provider traces, safety decisions, token/cost records, circuit breakers, and that Phase 18 stores only the Phase 17 execution reference.
11. Test NOT_CONFIGURED, provider failure, quota exhaustion, rate limiting, maintenance, unpublished canonical records, invalid IDs, and idempotent retry behavior.
12. Capture database counts, API responses with private content redacted, admin screenshots, traces, Outbox evidence, and rollback evidence.

Do not enable a fifth tool in runtime. A fifth tool requires the onboarding guide and a separate reviewed source change.

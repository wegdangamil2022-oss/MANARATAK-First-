# R10 independent operational recovery review

Reviewer: `/root/r10_independent_review`, continuing the owner's explicitly delegated independent review. This review is not a production authority signature. No implementation changes, tests, database connections, or restores were performed by this reviewer.

## Initial source inspection

Reviewed source: `e711aab` (full SHA to be pinned for the final target review). Files inspected: `scripts/recovery/OperationalRecoveryMetrics.mjs`, `tests/release/recovery-operational-metrics.test.mjs`, the recovery classification in `scripts/architecture/operational-tooling-boundary.json`, and the corrected recovery assertions in `tests/remediation/w6-reliability-contract.test.mjs`.

The metric rejects missing service checks, invalid clocks/objectives, empty or duplicate event identities, changed recovered payload digests, unknown recovered events, and a non-prefix recovery with a hole. It calculates loss from the last recovered committed-event watermark and elapsed service recovery from incident to final verification; it does not substitute backup age. Zero missing observed events yields zero observed loss. Those calculations are appropriate for a trusted, explicitly bounded event set.

The CI corrections are appropriate: the operational tooling classification identifies a specific guarded restore entry point with required source safety markers, while the reliability test replaces an assertion demanding the destructive database suite with assertions for snapshot verification, post-restore sentinel checks, absence of that destructive suite, and read-only transaction measurement. This does not weaken the restore safety objective.

Required before interpreting new operational evidence:

1. SHA-256 validation currently uses `/^\w{64}$/`, which admits non-hexadecimal values. Use strict lowercase hexadecimal validation and a focused negative case.
2. Two synthetic outbox probes establish recovery/loss of **those observed probes**. They do not establish recovery of every durable event in the application or regional-loss RPO. Record that limited measurement scope explicitly in the output/report.
3. `committedAt` must come from actual post-commit observation, not from a preassigned payload timestamp or merely `createdAt`. Preserve the producer's ordering evidence and compare actual stored payload identity at source/restored target. Do not move timestamps to satisfy a threshold.
4. The incident clock must precede target restore and service startup. Final service verification must follow real API readiness, Web/Admin browser probes, and authenticated reads on the same restored database and source SHA. An already-running old source service cannot provide recovered-service evidence.
5. New lab/target and exact source SHA require their own reviewed authorization. The earlier approval is limited to the earlier exact target/source and cannot be reused.

Disposition at this point: metric design and narrow CI corrections are reasonable; exact-target operational execution remains **PENDING REVIEW**. No destructive restore is approved by this preliminary source inspection. The actual harness, fresh cluster/target evidence, input identity and TLS/role guards must be reviewed before that decision.

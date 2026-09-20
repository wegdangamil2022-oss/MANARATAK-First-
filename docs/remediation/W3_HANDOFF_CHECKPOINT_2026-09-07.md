> **SUPERSEDED:** This intermediate handoff is superseded by `W3_CLOSED_2026-09-07.md`. Do not use it as the current W3 status.

# MANARATAK — W3 Handoff Checkpoint — 2026-09-07

## Authority
- Canonical starting checkpoint: `MANARATAK_FINAL_W2_SOURCE_COMPLETE_2026-09-06.zip`.
- Remediation order authority: `MANARATAK_REMEDIATION_EXECUTION_REGISTER_v0.68_ORDERED.md`.
- This archive is an **intermediate W3 checkpoint**, not W3 closure evidence.

## Current Wave
- Wave: **W3 — Providers, Events, Workers, Integration**.
- Continue according to the dependency/order graph in the remediation register.

## Work already present in this checkpoint
The source contains W3 work for durable PostgreSQL-backed background jobs / lease fencing, provider-backed asset and raw import snapshot boundaries, finance provider transport work, worker runtime/handler wiring, notification/event-foundation work, and owner-domain event integration work. Inspect the code and verifiers before changing or reimplementing anything.

Cards previously treated as source-verified in the working session:
- `MNT-AUD-0007` — Background worker foundation — source-level evidence only; DB runtime remains pending unless independently executed.
- `MNT-AUD-0068` — Transactional outbox lease fencing — source-level evidence only; DB runtime remains pending unless independently executed.
- `MNT-AUD-0011` — Asset production provider boundary — source-level evidence only; provider sandbox remains pending.
- `MNT-AUD-0012` — Durable raw import snapshot provider — source-level evidence only; provider/runtime evidence remains pending.

Additional W3 cards have partial/in-progress source changes in this checkpoint. **Do not assume they are closed.** Re-run the canonical W3 verifier and inspect current implementations before assigning status.

## Evidence discipline
- Do not claim `W3 CLOSED` from source-only verification.
- PostgreSQL/Docker runtime tests, provider sandboxes, and other external/runtime proofs remain pending unless actually executed in the new environment.
- Do not use `prisma db push` or destructive/dev DB mutation against staging/production.
- Use only authorized disposable PostgreSQL for migration/concurrency runtime tests.
- Preserve bounded-context ownership, outbox/inbox idempotency, lease fencing, audit, RBAC, retention, and production fail-closed behavior.

## Immediate continuation
1. Read the W3 table and all addenda for the current cards in the remediation register.
2. Inspect current W3 changes before implementing anything again.
3. Resume from the first W3 card that is not genuinely source-verified in the current archive; the working session had advanced into the provider/event/worker chain after `0012`, with `0018` and later event/worker cards having partial work.
4. Run lightweight source/type/syntax checks during implementation; defer only genuinely unavailable DB/provider proofs and mark them explicitly pending.
5. At W3 source completion, run W3 verifier + W0/W1/W2 relevant regressions + Source Quality, then create a new full ZIP + SHA-256 checkpoint.

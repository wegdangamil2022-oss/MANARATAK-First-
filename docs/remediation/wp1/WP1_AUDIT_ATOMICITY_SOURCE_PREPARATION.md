# WP1 Audit Atomicity Source Preparation

Status date: 2026-08-13

## Truthful Current State

The HTTP mutation middleware records a required intent before critical requests and a best-effort outcome after the response. This is durable request evidence when the repository is available, but it is not atomic with the business mutation. Its metadata now states `atomicity = REQUEST_OUTCOME_ONLY` and flags critical routes that require owner-level atomic adoption.

## Delivered in Codex

- `ITransactionalAuditRecordRepository.saveInTransaction` contract.
- Prisma Audit repository support for the same transaction client used by a business repository.
- `AtomicAuditedMutationExecutor`, which runs the business callback first and the success Audit write second inside one `IAtomicPersistenceUnitOfWork` callback.
- Audit record factory shared by regular and atomic creation paths.
- Fail-closed behavior when an atomic Audit save lacks a real transaction context.
- Tests proving:
  - business and Audit receive one persistence context;
  - business failure prevents a false success Audit row;
  - Audit failure propagates and causes the surrounding Prisma transaction to roll back;
  - secret sanitization remains active in transactional persistence.

## Adoption Gate

A critical Domain may adopt this executor only when its owning repository can write through the supplied `AtomicPersistenceContext`. Wrapping a non-transactional repository call inside the callback is prohibited because it would falsely claim atomicity.

Required owner-by-owner sequence:

1. Add transaction-aware mutation method to the owning repository.
2. Call it through `AtomicAuditedMutationExecutor`.
3. Test business failure, Audit failure, and successful commit.
4. Run the same tests against the approved Development DB.
5. Only then classify that mutation as `ATOMIC_AUDIT_CLOSED`.

## Verification

| Check | Result |
|---|---|
| TypeScript | PASS |
| Focused Audit tests | 26/26 PASS |
| Database connection | NONE |
| Database writes | 0 |
| Middleware atomicity claim | NONE; explicitly request/outcome only |
| Active Domain atomic adoption | PENDING |

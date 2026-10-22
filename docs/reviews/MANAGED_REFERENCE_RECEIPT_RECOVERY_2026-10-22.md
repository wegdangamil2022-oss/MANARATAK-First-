# Managed reference receipt transaction recovery

The independent development bootstrap stopped on `87622e1e10d80ca288f0b894712eddf979518a1a` while accepting the next screening receipt. Prisma reported P2028 at commit: the receipt store's explicit 15,000 ms transaction budget expired after 16,488 ms. That explicit option overrides the operator client's existing 30,000 ms budget.

The read-only probe at `2026-10-22T14:25:08Z` established 168 currencies, 75 languages, 243 applied owner reviews, zero pending reviews, and 737 records in each of Audit and Outbox (`243 × 3 + 8` existing language-alias commands). The subsequent same-role activity probe found no abandoned advisory locks. The failed receipt is not assumed committed. Recovery must inspect and bind the actual live snapshot and preserved checkpoint before resuming the same run.

`PrismaImportScreeningReceiptStore` now accepts an explicit transaction budget. Its default remains 15 seconds for existing callers. Only the managed reference operator supplies `maxWait: 10_000, timeout: 30_000`, matching its existing owner transaction budget. Screening, advisory lock, identity/content checks and receipt creation remain in one transaction. No automatic retry, direct canonical insert, review bypass, migration change or permission grant was added.

Validation: three focused receipt-store tests passed, covering the configured budget and atomic callback, unchanged default and receipt reuse across retry attempts, content conflicts, and propagation of transaction failure without automatic retry. Targeted ESLint passed. Infrastructure compilation is checked separately before the resumed operator uses its built package. CI and the resumed database operation must be assessed on the resulting commit; previous green CI does not establish this revision's result.

The concurrent browser diagnostic used a separate application client restricted to one read-only connection. Initial fan-out exposed transaction acquisition failures with that diagnostic client's default two-second max-wait; browser success is not claimed. The corrected diagnostic must preserve read-only enforcement on every pooled connection and record real API responses. No authenticated student/admin flow or production readiness follows from this recovery.

The only database target remains project `hidden-smoke-02928871`, branch `br-sweet-king-b9pem1dg`, database `neondb`, OID `16395`. Existing checkpoints, source packets, review decisions and failure history remain preserved. The old Neon project and production are excluded.

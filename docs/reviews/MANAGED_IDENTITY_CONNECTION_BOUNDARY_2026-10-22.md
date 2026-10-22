# Managed database identity connection boundary

The reference operator stopped before writes with `POST28_IDENTITY_READ_FAILED`
on 2026-10-22. The previous wrapper intentionally discarded all driver details,
so that failure does not establish a specific network or server cause.

Establish the authenticated connection explicitly before the identity transaction.
Default callers retain the existing 15-second transaction budget and 10-second
acquisition budget. An explicit bounded override admits at most 60 and 30
seconds respectively; invalid/unbounded budgets fail before opening a client.
The source-bound managed reference operator selects that override. Its 20-second
connection timeout must fit within acquisition time. Its private serial runner
also uses one connection; this does not establish a network root cause.
Keep the 10-second statement timeout, READ ONLY mode, exact identity SQL, role
checks and unconditional disconnect.
Expose only an enumerated phase and a Prisma `Pdddd` code on the stable redacted
error; neither the driver message nor its cause is retained. The reference
operator includes that phase in its private failure evidence.

At 523 applied rows, a new transaction failed to start (`P2028`), followed by
`P2028` in the identity probe's transaction phase before any new writes. A fresh
read-only snapshot established 168 currencies, 260 languages, 95 countries,
523 applied reviews and receipts, 1,589 Audit and Outbox records each, and
unchanged protected fingerprints. There were no pending reviews, orphan
receipts or advisory locks. Resume still needs a newly bound snapshot.

Validation: two new focused budget tests failed before implementation. Nine
focused identity/budget/replay checks then passed, including original default
budgets, connection failure redaction and disconnect cleanup. Strict operator
TypeScript, targeted ESLint and diff checks passed. Unaffected suites were not
repeated under the owner's requested scope.
This is not evidence that a remote connection succeeded or that reference
bootstrap completed. Recovery still requires a fresh identity and bound snapshot.

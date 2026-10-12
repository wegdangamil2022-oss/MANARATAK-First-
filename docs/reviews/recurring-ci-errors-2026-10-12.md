# Recurring CI failures — root causes and repairs

Base: `6e844d82488fa0e65aae8d1009c7d7177d7f147d` (main). Section 24 work is paused in a separate working tree and is excluded from this change.

The latest main runs were inspected: Enterprise CI `38196013978`, architecture `38196013971`, and imported courses `38196013964`; certificate PR source run `38196001332`. Imported-course CI passed TypeScript, lint and all-workspace builds before failing its unit suite. The failures were therefore not all build failures.

| Root cause | Repair and regression protection |
|---|---|
| Translation scanner recognized only double-quoted keys at a fixed indentation. Valid Service dictionary entries looked absent. | Parse actual TypeScript dictionary properties; reject dynamic, duplicate and blank values. Quote-style/formatting negative tests added. |
| Audit scanner rejected finite Service/Career route loops, hiding downstream inventory drift. | Resolve only immutable literal action arrays and lexical const dispatch maps. Reject unknown/dynamic/mutable/escaped registries; added-route, permission and negative tests retained. Reviewed 31 changed Service/Career rows; 404 handlers, 403 endpoints, existing collision unchanged. |
| DI registry still called completed Service/Career composition deferred. | Reconcile 374 source-reachable registrations, including nine newly registered names; retain rejection of deferred foundation controls. Updated source contracts reflect completed owners. Source reachability is not runtime proof. |
| Migration recovery, ownership and database baseline inventories omitted later changes. | Register three Finance/Service recovery artifacts and six owner models (266 total). Add checksum-bound sidecar ownership metadata, preserving every committed migration SQL byte. No migration execution. |
| Environment inventories and API example drifted. | Regenerate name-only Studio inventory; mirror seven missing safety keys in API example with disabled/default/empty secret values. No secret provisioned. |
| Old Career tests lacked current independent verification, deadlines and hashed canonical identities. | Deterministic clock and valid owner evidence fixtures; verify canonical geography changes hash identity, reject unverified employers and missing verification evidence. Updated W2/P8/P9/Jobs/Finance contracts to actual owner helpers/pickers rather than retired symbols or formatting. |
| Application publish path omitted its workflow state gate. | Require READY_TO_PUBLISH before publication, before owner persistence. Negative test confirms no mutation from review state. |
| Service envelopes stripped unparsed reason before schema validation; Finance identity read an unparsed revision. | Strictly parse complete Service reason envelopes before stripping; validate optional numeric Finance revision. Invalid/unknown delivery fields fail before commands. |
| Native W2 fixtures omitted new safety dependencies and transactional authority. | Load real local safety/cursor modules and supply request, outbox, actor, verification and CAS fixtures; retain stale-write, capacity, discount and student-owned CV assertions. No live database or provider. |
| Vercel traces API tests that the normal src-only build excludes; two router fixtures lacked the new Career dependencies. | Supply the engagement repository/use-case doubles; keep full traced test compilation enabled. |
| Notification preview test included cold module loading inside its five-second behavior budget. | Move real middleware imports to suite initialization; keep every preview/audit/idempotency assertion and timeout unchanged. |
| Repository check treated a valid worktree .git file as unexpected; Nginx fixture depended on system temp directories. | Support .git worktree metadata and direct all proxy/FastCGI/uWSGI/SCGI temp directories to its isolated fixture root. |

`npm run ci:preflight` now runs architecture, DI, audit, environment freshness and negative source contracts early in Enterprise CI, before the full closure matrix. It fails closed instead of regenerating approved inventories in CI. When owner composition changes, review the corresponding manifests and run this preflight before opening a PR.

Runtime/provider/DB/browser acceptance remains deferred after section 28. No database writes, migration application, deployment, live provider contact or section 24 feature work is included. Detailed final source validation is recorded in the companion validation JSON.

# Section 05 — additional implementation session

Branch `codex/section-01-iam-rbac`; starts at `ffe77c1`. This session implements the eight operational areas requested after the three-session allocation. It does **not** assert closure of every original Section 05 finding or production readiness.

## Delivered execution paths

| Area | Implemented behavior | Boundary |
| --- | --- | --- |
| Receipts/reconciliation | Durable, batch-bound screening receipt; sorted semantic hash survives JSONB ordering/date serialization; PostgreSQL advisory lock serializes acceptance; exact matching receipt repairs uncertainty without re-invocation. Audited CAS reconciliation can acknowledge expired stranded stops only when every uncertainty has proof. | These are **screening** receipts, owned by the import control plane. Mutating owner consumers remain forbidden. A receipt is not fabricated when absent. Future canonical writes still require an owner-controlled inbox in the same transaction as the side effect. |
| Access governance | Ed25519 signed server approvals bound to source revision, classification, origin, allowed paths, policy reference and expiry. Account credentials are selected only from server bindings. Actual pinned-DNS robots fetch and rule check precede each target/redirect. | Default restricted access is denied. A trusted authority must provision real approvals/credentials; Admin metadata cannot grant access. Positive crawl-delay remains denied pending a compatible policy. HTTP 401/403 cannot stage bytes. |
| Acquisition efficiency | Server snapshot validators produce conditional headers. A 304 reuses only an unexpired, same-source/connector/URL snapshot after byte-size and SHA256 verification. Fleet, origin and source budgets are reserved together in PostgreSQL; native transport budgets every HTTP request including robots and redirects. | Default fleet 120/min; origin at most 60/min plus stricter configured source limits. Backlogs over 30s return retryable capacity failure. Real provider/network/DB contention remains deferred. |
| Drift/fallback | Full parsed-stream field/type union (bounded 256 fields) compared to durable source baseline before queue visibility; change is persisted and blocks finalization. Audited version-pinned accept/reject. Audited revision-bound fallback registration and explicit run selection, with actual fallback provenance. | No automatic switch, browser bypass or caller target URL. Approved fallback is one hop and must remain active/unchanged; normal access gates apply. |
| Mapping | Immutable provider/domain profiles with aliases, required fields and types; version CAS and definition hash; saved-profile sample preview and UI rule diff; profile selected in artifact preflight/stage and source run. Original rows and profile provenance retained in controlled fields. Batch comparison projects bounded mapping hashes and explicitly marks missing/different normalization evidence. | Generic target fields prepare owner screening; they do not authorize canonical publication. Historical records without profile evidence remain unknown. |
| Reviewer assignment | Durable assignment/due date/version; active identity and real imports + owner IAM permissions required; exact assignee claims, renews or releases 15-minute lease. Assignment/claim mutations use atomic audit/outbox. Import queue UI links from the central review page and into owner workspaces. Scholarship verification/canonical review decisions honor the lease inside their persistence transaction. | Other owner decision/promotion pathways still need adoption of the shared review lease contract. Assignment never grants owner permissions or performs an owner decision. |
| Counters/retention/errors | Received/skipped/invalid counts persist for finalized inline intake and in the atomic stream finalization; finalized source revision is locked alongside queue visibility. Counter endpoint uses repeatable-read, reports actual status groups and explicitly unknown historical input counts. New inline/streamed raw records get one-year retention; audited history assignment never shortens existing expiry/holds. Purge preserves uncertainty and compares observed payload inside terminal-parent/hold fences. New operational errors have bounded codes/status/retryability and helpful UI messages. | Historical counts are not invented. Entire legacy API envelope/counter/memory reconciliation is still broader than these new paths. |
| Recovery/cleanup | Existing recurring import sweep now recovers expired staging even when idle. Audited legacy CREATED recovery requires exact version/count and known pending owner envelopes, or explicit evidence-preserving rejection. Marked dead-process spools older than 24h are swept in bounded rotating pages; live/unmarked/foreign-host files remain intact. | No timeout substitutes for an owner result. Fleet filesystem quotas remain a deployment responsibility. |

## Verification

| Check | Final result |
| --- | --- |
| Focused tests | PASS — 320 tests / 32 files; 20.79s |
| TypeScript | PASS |
| Source quality / React review | PASS — 0 package/file cycles, 0 a11y findings; state/request guards reviewed |
| Admin audit inventory | PASS — 338 handlers / 337 unique endpoints |
| Scoped lint | PASS — 0 errors / 223 warnings |
| W2 | 82/84; same two inherited blockers |
| Persistence ownership | Same 18 inherited historical metadata violations; no new violations |
| Secrets / whitespace | PASS — secrets.log; git diff --check |

Final results are recorded in adjacent logs. Focused suite is exactly the 32 files in `.github/workflows/import-section-05-source.yml`, with a 60-second command budget. Tests use inert providers, mocked Prisma transactions and private temporary files; they are not PostgreSQL/provider/browser runtime proof.

The initial child-process variant of spool cleanup verification exceeded its budget and was removed from the focused suite. The final bounded test checks a nonexistent PID with signal 0 and private marked directories. Real process-death/restart behavior is deferred, as requested, rather than blocking source fixes.

Inherited global blockers remain separate: W2 asset purge evidence/migration recovery authority, and 18 metadata violations in six previously committed Section 03/04 migrations. New model ownership, baseline counters and migration recovery authority are declared; historical SQL is unchanged.

## Activation and remaining original scope

Migration `20261009070000_import_governance_receipts` is source-only and **UNAPPLIED**. Generate the Prisma client before build; apply the reviewed migration through the existing database deployment/recovery procedure before using the new Prisma-backed paths. No DB connection, migration application, deployment, merge, live source request or browser session occurred here.

Restricted-source execution requires server `IMPORT_SOURCE_APPROVAL_PUBLIC_KEY` (Ed25519 public PEM) and `IMPORT_SOURCE_SIGNED_APPROVALS` (array of signed tokens). Token format is `base64url(JSON claims).base64url(Ed25519 signature over the encoded claims segment)`; claims are `audience: MANARATAK_IMPORT`, sourceId, exact sourceRevision ISO timestamp, classification, origin, pathPrefixes, policyReference, expiresAt, and an optional credentialBinding. AUTHORIZED_ACCOUNT requires `IMPORT_SOURCE_CREDENTIAL_<NAME>` selected by that binding. No private signing key or credential is accepted through the API, stored in source metadata, logged, or supplied in the repository. Source edits/status changes invalidate old revision-bound approvals and mappings; the authority must reissue approval against the actual persisted revision. PUBLIC_ALLOWED/manual sources do not need signed grants.

Original gaps still include mutating owning-domain inbox/receipt adoption; owner review lease adoption beyond Scholarship decision ports; broader format support beyond CSV/NDJSON; full historical normalization/counter reconciliation and legacy error/timeline parity. Connected DB races/rollback, cross-process budgets/recovery, native provider behavior, browser/RBAC flows and load remain POST-28 runtime evidence. Section 05 remains **IN PROGRESS** until those original obligations are resolved; this session closes neither source gaps by labeling them tests nor runtime gates by mocked results.

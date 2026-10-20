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

## Exact-target decision — 2026-10-20T15:15:32Z

**APPROVE_LOCAL_SYNTHETIC_RESTORE** for execution source `978a0db95d89c5e65aceb012dd082b9111fa3327` and target fingerprint `ce4a9e898053a1ff6bddf397d142a791c8ac9f9528cc82dd8a676037586544cc`, under the separate local authority contract and the conditions below. No production or regional-loss acceptance is given.

The source now uses strict hexadecimal SHA-256 validation with a negative `g` digest case. The reviewed source differs from `a355480` only in this review document. I inspected the external preparation, execution, and recovered-service probe harnesses without running them. I identified an unquoted CamelCase table in the fresh-before-probe query before execution; the operator corrected it to `public."TransactionalOutboxRecord"`. This was a pre-execution review correction, not a failed restore or weakened assertion.

I independently verified offline:

- The creation envelope's Ed25519 signature, matching actual retained creator state, known producer hash, PostgreSQL executable hash, resolved data directory identity, CA hash, and exact target fingerprint. It was unexpired at this review.
- The 282-table initial snapshot identity and six physical asset backup hashes, target role/sentinel results through the corrected validator, and safely stopped preparation state. The source-clone evidence identifies the previously verified synthetic dump and limited `post28_tx_migrator`; the old suites were not relabeled as new runs.
- SHA-256 and size identity of all three newly built release archives and SBOM through the release-manifest verifier for the exact execution source. Runtime evidence will still need actual new boot results; a local build is not hosted release provenance.

| Identity | Approved value |
| --- | --- |
| Host/port | `127.0.0.1:50958` |
| Target database | `manaratak_restore_f857130eecb0bcf998b0513da157aa36` |
| Role | `manaratak_restore_runner` |
| Source fingerprint | `c0ed4df26b9aab07deef5c32c8b9886735cc3e24158fa8bbf8744029b021a61a` |
| Server system identifier | `7698767505733816892` |
| Creator run ID | `c13d2cc0-34bf-43f0-964d-ba91659d57c4` |
| Lab | `C:/Users/HP/Documents/Codex/2026-10-17/files-pasted-by-the-user-17/work/native-pg16-gcSoOA` |
| TLS root hash | `8cf0f90ef841efc487971351a21344701818422e89849a0af9384f4609f20a60` |
| Bootstrap public-key file hash | `5d697ecdeb7bb1e115bada54b483ccd720d2c361d51bae4c3720a45c3d201c92` |
| Initial source snapshot digest | `070ada481dde35e8e52db7bab8a661e998527ffcaea06610e7ec980f219d1cf4` |

The reviewed execution sequence is bounded and appropriate: assert initial source identity; append a fresh before-backup probe and observe its commit after the autocommit response; snapshot and take a real fresh dump; append one after-backup probe and observe its commit; preserve the forensic source identity; start the incident clock before denying source application CONNECT and proving it unavailable; run the signed guarded CLI restore; verify snapshot/asset/sentinel parity and only the before-backup probe present; then grant the target application only runtime read plus Session mutation/Audit insertion, excluding the migration ledger. Boot freshly unpacked exact-source API/Web/Admin, check readiness/source identity, render the Admin login page, log the synthetic learner in through the Web browser, read its authenticated dashboard, and prove Admin API denial. Final browser verification time closes the local RTO interval. Source snapshot remains unchanged after the incident.

Approval conditions: exact reviewed target and execution code only; actual fresh dump/manifest and snapshot signatures; pinned independent decision and owner-delegate evidence; no timestamp relabeling; preserve all TLS/role/sentinel/input guards; recheck actual lab identity before restart and refresh an expired attestation only from actual identity checks. The two planned synthetic probe insertions are expressly within this approval; historical financial/certificate/binding rows must remain untouched. Any failed guard or different execution code/target requires renewed review.

Interpretation limits remain explicit: RPO is measured for `TWO_SYNTHETIC_COMMITTED_OUTBOX_PROBES`, not an exhaustive application event stream or regional loss. Admin browser proof is login-page boot plus denied student access, not full privileged MFA/editorial recovery. Local Node22/Windows x64 and the same disposable PostgreSQL16 cluster do not establish Linux-hosting or cross-region recovery. No PITR/WORM/KMS/provider audit/retention, fresh EAP scan, or production deployment is approved. A successful outcome is local integrated diagnostic evidence with these recorded bounds; it is not unconditional formal R10 acceptance. No restore has yet been performed by this reviewer.

Final pre-execution operator inspection confirmed the corrected quoted table and URL database access via `pathname.slice(1)`. Reviewed external harness SHA-256 values: preparation `09e31db4be59946adea3968079a5f3d790a842a54ea837f0f16dc896083b3e55`; execution `09ab3987f292e3675b982becae6290aebfef9174fa9d4a86955bf5e2df1a83b2`; service probe `f1c847cd0432f5f76b8a950e62dbc4f18e4d200803b73f32d698a991ff102439`. The uncommitted independent CI verifier correction in `scripts/verify-w6-plan-closure.mjs` replaces the same obsolete destructive-suite requirement with snapshot/sentinel/read-only checks and explicit absence of `test:database`; it does not alter the approved runtime/recovery source or artifacts. That verification-only correction is acceptable and does not rebind this execution proof to a future commit.

### Reviewed operator retry correction

The first operator invocation stopped before probe creation or restore because the known creator application URL contained `?schema=public`, which the strict recovery URL builder rejects. Recorded cleanup has `restoreInvoked=false`, `stopped=true`, and no unrelated existing database touched. The operator now parses each known application URL, clears its query, then applies the unchanged `recoveryPrismaUrl` pinned strict TLS configuration. Host, port, role, database, execution source, target and all production/runtime guards remain unchanged. I inspected those corrected lines offline and **approve retry for the same exact source/target under the existing approval conditions**. Corrected execution harness SHA-256: `1c514b213bde2d638338a4561a5fd5fe6917dd6b72446814048a767be88fc592`. Recheck original source snapshot before writing, preserve genuine creation timestamps, and refresh an expired creation attestation only after actual identity verification. The original approval JSON is unchanged; this addendum records the specific reviewed operator correction rather than pretending the initial invocation succeeded.

## Post-execution independent evidence review

**LOCAL INTEGRATED DIAGNOSTIC RECOVERY VERIFIED WITH THE STATED LIMITS.** Actual execution source remains `978a0db95d89c5e65aceb012dd082b9111fa3327` on the exact approved target. The later `6e4b58d` changes only the independent W6 source verifier; the runtime evidence is not relabeled to that commit.

I reviewed retained results offline and independently checked the restore authorization signature with its retained public key, dump and manifest hashes, unchanged independent approval hash binding, validated database snapshot identity, and all six restored physical asset hashes. I recomputed the operational metrics from the recorded committed/recovered event sets and clocks. No tests or database operations were repeated by this reviewer.

- Full scoped parity: **282 public tables**, six assets, database snapshot digest `cfac10a45f1967bcc84033b8f5f1af48ba1702bb0dbcd27e6e655e7651962271`. The original before-backup historical financial/certificate/binding/withdrawal facts remain intact; restored outbox count is 51, while the forensic source after the intentionally excluded probe contains 52. Source remained unchanged after the incident.
- The before-backup probe `172908d9-5bf2-408b-af43-277be9576ded` and its payload digest are recovered; the actual committed after-backup probe `29c148b0-5f2e-44f5-bccf-d03aaa384d95` is absent. Both commit observations follow autocommit response according to the reviewed producer. This gives **observed two-probe RPO 3.443 seconds**, not exhaustive application/event-stream RPO.
- Incident time `15:34:40.313Z` precedes restore and confirmed source application denial; final authenticated browser verification is `15:34:57.313Z`, giving **local integrated diagnostic RTO 17 seconds**. API/Web/Admin build/readiness observations all report the exact execution SHA. Runtime identity is the ordinary `post28_app` on the restored target with elevated role flags false.
- I visually inspected the Admin login and recovered student dashboard screenshots. They establish actual Admin login-page rendering and authenticated synthetic learner display. Retained API logs include dashboard 200 and student Admin API denial 403, matching the service result; page-error list is empty. A blocked Unsplash image origin is recorded, not silently treated as a successful external dependency.
- **Visible limitation:** the student screenshot includes a warning that live `majors` data could not load. The API log records `/api/v1/public/majors?locale=ar&limit=20` as HTTP 200; the precise client warning cause is not established by these files. Therefore this review does not certify every dashboard dependency or an entirely warning-free interface. That warning warrants a narrow follow-up; it does not invalidate the independently verified authenticated dashboard, identity, denied Admin access, or deliberately scoped metrics.
- Cleanup records `stopped=true`, `restoreInvoked=true`, and no unrelated existing database touched. The earlier prewrite failure remains historical; its cleanup must not be presented as this successful run's cleanup.

| Evidence file in `native-pg16-gcSoOA` | SHA-256 |
| --- | --- |
| `operational-recovery-result.json` | `8f4b18b0e5f4e629bd1df0a912b97bd13441146cab8a9904dc46b4655349a0b6` |
| `reviewed-restore-verification.json` | `7d4e3253d50217139bc44983fadf9ff94497c1b38d7a21d9af0af28efa06e1aa` |
| `integrated-service-proof/result.json` | `15e98f48e0fdbfe826557d1b68d171b90bfa6fa3d049d208b9f1fb095d7a5ab3` |
| `reviewed-restore-cleanup.json` | `e0bc2859b5488bdf0754f2ccc739bd466f7b624fb8000cfc614d5fb4d296ece2` |

The measured local service diagnostic has advanced beyond the earlier structural-only drill. It still does not establish full Admin MFA/editorial operations, every background worker or dependency, actual regional loss, production RPO/RTO, PITR, KMS/WORM/retention/audit/cross-region provider controls, or fresh EAP. Keep `formalR10Acceptance=false`, `regionalLossMeasured=false`, and `productionAcceptance=false`; record practical local progress separately from those unproven scopes. The signed approval JSON is unchanged by this retrospective review.

# Section 23 handoff

Source work continues from the section-22 merge `ce02ec29` on `fix/codex-section-23-notifications`. See [implementation and all 29 task dispositions](section-23-implementation.md), [validation](section-23-validation.json) and [migration/recovery](section-23-migration-recovery.md).

Status: **CODE_CLOSED — RUNTIME_DEFERRED_AFTER_SECTION_28**, at the notification source boundary. P05 owns immutable templates/intents/channel outcomes; P15 owns current student eligibility, preferences and inbox projection; P23 is a guarded control plane. No DB migration/provider activation/main merge/deployment was performed. The repository-wide audit inventory still has its reproduced pre-existing ServiceAdminRouter parser blocker; do not describe that gate as passed.

Deploy prerequisites after section 28: reviewed migration/backup rehearsal; dedicated NOTIFICATION_PAYLOAD_KEY/keyring; separately provisioned notification IAM grants (including existing platform access); approved provider GET reconciliation + one-channel POST contracts; worker/cadence activation; historical collision/locale/retention inspection and actual concurrent DB/provider acceptance tests. The repository is NOT_RUNTIME_SAFE for this new code against an unmigrated schema. No synthetic delivery is a substitute for these proofs.

Default payload retention is 30 days from intent creation, configurable within 1–90 days. Retired uncertain/dead-letter payloads cannot be manually reopened. Minimum operational IDs, replay fingerprints and audit/channel receipts survive erasure; P15 inbox retention remains independent. Legacy operator text is preserved and does not acquire an unsupported English-translation claim.

Next: **24 — Review Queue**, only on the user's request. Do not automatically merge this branch. Keep runtime verification deferred until after section 28.

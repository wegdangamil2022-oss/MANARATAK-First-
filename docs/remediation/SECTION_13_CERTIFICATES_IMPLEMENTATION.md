# Section 13 — Enterprise Certificates Platform (P14)

Date: 2026-10-10. Branch: `codex/section-13-certificates`. Base: `ab1f7b4` (preserves Section 11/12 work).
Status: source repairs implemented; selected lightweight verification recorded; runtime acceptance deferred.

## Plan and ownership

Reviewed the P14 enterprise architecture, domain contracts and implementation guide, certificate use cases, trusted completion consumer, rendering boundary, repository, admin/public routes and admin workflow. The original consolidated admin review attachment is not available in this checkout; this record maps to the repository's P14 plan, not certification of every item in an unavailable checklist. P13 remains the owner of learning completion; P14 owns certificate issuance, signatures, lifecycle, ledger and document artifacts. The user deferred the custom visual template; no generated certificate artwork was integrated or approved.

## Source repairs

1. **Trusted completion and historical identity.** Validate source domain/version/authority, IDs, eligibility type and dates before issuance. Course completions require the registered `courseVersion`; issuance reads that immutable learning version rather than the latest renamed/disabled course. Learning-path completion contracts and producers carry the enrollment's `learningPathVersion`, and certificate issuance reads that version. Existing native-course issuance policy is preserved; no public/manual completion-fact issuance endpoint was added.
2. **Replay and collision safety.** Application checks event payload/type/version against a replayed certificate. Completion collisions cannot return another student's certificate. PostgreSQL transaction advisory locks serialize event and completion identities before inbox/issuance reads. Issuance/inbox/ledger/audit/outbox remain in one existing repository transaction.
3. **Signed identity and verification.** New signed envelopes bind serial and verification code as well as recipient, achievement, timestamps, validity, issuer, template and academic metadata. Verification compares persisted signed fields, validates malformed dates without crashing, and preserves revoked/reissued/archived status precedence over expired status. Signature comparison is constant time. Verification URL configuration rejects credentials, query/fragment, unsupported protocols and non-HTTPS production origins.
4. **Governed templates and issuers.** Template/issuer updates and template transitions acquire owner row locks. Template PATCH/transition require a caller `If-Match` of `"currentVersionId:status"`; stale versions/states fail 409 and missing conditions fail 428. Admin captures the edit-screen condition and sends it for saves/transition without automatic retry. Semantic template versions must advance. Returning to draft/review clears approval; maker/checker remains enforced. Partial issuer updates validate the merged authority rather than only one supplied field. Issuance locks template/issuer and checks the selected current active version/number and signing key.
5. **Certificate lifecycle.** Revoke/reissue/archive serialize on the original certificate before state checks. Repeated archive does not append another mutation. Existing renewal and replacement rules remain. Readiness checks require a template and its own issuer to be active, not an unrelated active issuer.
6. **Artifact boundary.** PDF attachment accepts `application/pdf`, while image roles use image MIME types. Attached asset IDs are immutable; repeated same attachments return without another mutation. Attachment after non-active lifecycle is rejected, and incomplete attachment metadata is marked PARTIAL. Rendering validates exact template version, artifact uniqueness, MIME, nonempty bounded bytes and renderer identity before storage. Replayed revoked/inactive issuance skips new rendering. Rendering/EAP operations were only exercised with source doubles.
7. **Administrative API.** List query uses bounded integer page/page size and bounded search. Lifecycle reason/name input sizes are bounded. Unexpected internal errors are sanitized as 500; source permission evaluation and server-derived actor identity remain in place.

## Verification and activation limits

Selected light tests ran in separate, nonrepeated files; details and raw observations are in SECTION_13_CHECK_LOG.md. These do not certify real PostgreSQL locks, concurrent worker delivery, actual KMS/key custody, EAP upload/scanning/grants, PDF/font/browser rendering, or real role/session/CSRF behavior. The selected noEmit semantic check reported zero diagnostics before the subsequent template-condition/UI/readiness/consumer follow-up; it is not a whole-project or final-tree semantic certificate.

No database call, migration application, Prisma generation, seed/import, full build, E2E, external provider execution, deployment or main merge occurred. No schema migration was needed for this source round. Inherited Section 12's assessment migration remains unapplied.

Versionless legacy completion events now fail closed before issuance and need explicit historical reconciliation during activation; no queue/database backfill was attempted. Older signed v2 envelopes without serial/code bindings retain compatibility for their originally sealed fields; full new identity binding requires governed reissue, not silent resigning. Custom artwork remains deferred by the user, and runtime template approval/activation was not performed.


## 2026-10-10 — original attached plan follow-up

The original review attachment is now available and was used to map all 35 certificate tasks. See [the dated plan report](SECTION_13_CERTIFICATES_PLAN_2026-10-10.md) for source changes, final verification, proposed unapplied migration, and production blockers. Earlier unavailability and check statements above describe the earlier commit only; they do not describe this follow-up. Production signing remains blocked until approved non-exportable custody is provisioned; no live database or storage mutations occurred.

# R06 actual opted-in LearningPath certificate issuance and replay

Source 0f81149fd46344b14b5e932be5828e1e6de952cc; run 61808724-2b49-4cc2-a354-c20e782a50a2; PostgreSQL postgres (PostgreSQL) 16.15, system 7698099028595782684.

Two new actual PostgreSQL identities close the previously missing successful path credential branch. The setup creates a synthetic issuer and expiring template through existing maker/checker commands; it rejects self-approval and uses an ephemeral local HMAC signing key with productionLike:false. Completion comes from actual CourseProgressUseCases, then actual path create/review/publish/enroll/refresh with explicit opted-in policy. The real CertificateCompletionEventConsumer consumes the persisted LearningPathCompleted record. No completion facts are accepted from an HTTP request or rewritten from an old event.

One case proves LEARNING_PATH type, pinned path/completion identity, actual HMAC signature, one certificate/inbox/ISSUED ledger/audit and render-request event. Actual public HTTP verification returns200 without student identity. A second case uses two independent Prisma-backed consumers and repeated delivery: both return the same certificate ID and only one inbox/ledger/audit persists. Existing8 certificate issuance/authority/rollback/verification/revocation cases repeat;10/10 pass. Renderer readiness remains NOT_CONFIGURED and no PDF artifact or production KMS/HSM is claimed.

The explicit --learning-path-certificate-fixtures flag enables the existing five certificate owner tables plus four learning-path owner tables in this new disposable DB-T. Default grants remain unchanged, and course import fixture scope is not enabled.36 provisioning checks and source quality pass;110 historical migration checksums match, schema diff0 and runtime DDL/ledger grants remain absent.

Remaining technical work includes actual rendered artifact attachment/student delivery/recovery and opt-in UI/HTTP authoring coverage. Production signer/provider licensing and owning-phase browser gates remain distinct. R05/R07 and existing databases are untouched; no entire R06 scenario is declared accepted.

Evidence: docs/reviews/evidence/post28/0f81149fd46344b14b5e932be5828e1e6de952cc/R06-path-certificate-issuance/evidence-index.json. Actual database cases: 10 passed, zero failed/skipped in final runs. New distinct 2; repeats 8; cumulative 442 across SHAs, not one current-head acceptance run. R06 remains 0/26 accepted.

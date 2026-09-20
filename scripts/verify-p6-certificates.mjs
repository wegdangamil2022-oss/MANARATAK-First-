import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const files = {
  courseEvent: read('packages/domain/src/courses/events/CourseCompletedEvent.ts'),
  pathEvent: read('packages/domain/src/courses/events/LearningPathCompletedEvent.ts'),
  certEntity: read('packages/domain/src/certificates/entities/Certificate.ts'),
  certContract: read('packages/domain/src/certificates/contracts/ICertificateRepository.ts'),
  trustContract: read('packages/domain/src/certificates/contracts/ICertificateTrustServices.ts'),
  lifecycleEvents: read('packages/domain/src/certificates/events/CertificateLifecycleEvents.ts'),
  readModels: read('packages/domain/src/certificates/read-models/CertificateReadModels.ts'),
  usecase: read('packages/application/src/certificates/use-cases/CertificateUseCases.ts'),
  consumer: read('packages/application/src/certificates/use-cases/CertificateCompletionEventConsumer.ts'),
  gateway: read('packages/application/src/certificates/use-cases/CertificateCompletionOutboxDeliveryGateway.ts'),
  worker: read('packages/application/src/certificates/use-cases/CertificateCompletionOutboxWorker.ts'),
  trustPolicy: read('packages/application/src/certificates/services/CertificateTrustPolicy.ts'),
  readService: read('packages/application/src/certificates/use-cases/CertificateReadModelService.ts'),
  outboxDomain: read('packages/domain/src/event-foundation/outbox/TransactionalOutbox.ts'),
  dispatcher: read('packages/application/src/event-foundation/use-cases/TransactionalOutboxDispatcher.ts'),
  outboxStore: read('packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts'),
  certRepo: read('packages/infrastructure/src/certificates/PrismaCertificateRepository.ts'),
  schema: read('packages/infrastructure/prisma/schema.prisma'),
  container: read('apps/api/src/infrastructure/di/container.ts'),
  server: read('apps/api/src/server.ts'),
  publicRouter: read('apps/api/src/presentation/api/router/CertificatePublicRouter.ts'),
  adminRouter: read('apps/api/src/presentation/api/router/CertificateAdminRouter.ts'),
  p13Progress: read('packages/application/src/courses/use-cases/CourseProgressUseCases.ts'),
  p13Paths: read('packages/application/src/courses/use-cases/LearningPathUseCases.ts'),
  gatewayTest: read('packages/application/tests/certificates/CertificateCompletionOutboxDeliveryGateway.spec.ts'),
  consumerTest: read('packages/application/tests/certificates/CertificateCompletionEventConsumer.spec.ts'),
  readTest: read('packages/application/tests/certificates/CertificateReadModelService.spec.ts'),
  usecaseTest: read('packages/application/tests/certificates/CertificateUseCases.spec.ts'),
  matrix: read('docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md'),
};

const checks = [];
const check = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), detail });
const all = (text, values) => values.every(v => text.includes(v));
const none = (text, values) => values.every(v => !text.includes(v));

// P13 authoritative event boundary.
check('P6-P13-001', all(files.courseEvent, ["COURSE_COMPLETED_EVENT_TYPE = 'CourseCompleted'", "COURSE_COMPLETED_EVENT_VERSION = '1.0.0'", 'completionId: string']), 'CourseCompleted contract has stable type/version/completion identity.');
check('P6-P13-002', all(files.courseEvent, ["certificateOwnerPhase: 'Phase 14 - Enterprise Certificates Platform'", "sourcePhase: 'Phase 13 - Learning Platform'"]), 'Course completion contract names P14 as certificate authority.');
check('P6-P13-003', all(files.pathEvent, ["LEARNING_PATH_COMPLETED_EVENT_TYPE = 'LearningPathCompleted'", "LEARNING_PATH_COMPLETED_EVENT_VERSION = '1.0.0'"]), 'LearningPathCompleted contract has stable type/version.');
check('P6-P13-004', all(files.pathEvent, ["certificateOwnerPhase: 'Phase 14 - Enterprise Certificates Platform'", "sourcePhase: 'Phase 13 - Learning Platform'"]), 'Learning-path completion contract names P14 as certificate authority.');
check('P6-P13-005', all(files.p13Progress, ['COURSE_COMPLETED_EVENT_TYPE', 'this.atomicMutations.execute({']), 'P13 course completion is emitted through the atomic mutation/outbox boundary.');
check('P6-P13-006', all(files.p13Paths, ['LEARNING_PATH_COMPLETED_EVENT_TYPE', 'this.atomicMutations.execute({']), 'P13 learning-path completion is emitted through the atomic mutation/outbox boundary.');
check('P6-P13-007', none(files.p13Progress + files.p13Paths, ['CertificateUseCases', 'certificateRepository.issue(', '/course-completions/issue']), 'P13 has no direct certificate issuance dependency.');

// Async delivery / idempotency.
check('P6-DELIVERY-001', all(files.consumer, ['CertificateCompletionOutboxRecord', "record.domain !== 'COURSES'", "record.eventType !== 'CourseCompleted'", 'consumeCompletionEvent']), 'P14 consumer accepts only persisted P13 completion records.');
check('P6-DELIVERY-002', all(files.consumer, ['eventId: record.id', 'eventVersion', "sourceDomain: 'COURSES'"]), 'Persisted outbox ID/version become the trusted event envelope identity.');
check('P6-DELIVERY-002A', all(files.consumer, ['payload.eligibleForCertificate !== true', 'return null']), 'Trusted non-eligible completions are acknowledged as no-op instead of entering retry storms.');
check('P6-DELIVERY-002B', files.consumerTest.includes('ineligible completion as a no-op'), 'No-op behavior for ineligible completions has a regression test.');
check('P6-DELIVERY-003', all(files.gateway, ['implements IOutboxDeliveryGateway', 'context.idempotencyKey !== entry.id']), 'Delivery gateway enforces stable outbox idempotency key.');
check('P6-DELIVERY-004', all(files.gateway, ["entry.domain !== 'COURSES'", "entry.eventType !== 'CourseCompleted'", "entry.eventType !== 'LearningPathCompleted'"]), 'Delivery gateway fails closed for unrelated outbox traffic.');
check('P6-DELIVERY-005', all(files.worker, ["domain: 'COURSES'", "eventTypes: ['CourseCompleted', 'LearningPathCompleted']"]), 'Certificate worker subscribes only to P13 completion event types.');
check('P6-DELIVERY-006', all(files.outboxDomain, ['domain?: string', 'eventTypes?: readonly string[]']), 'Outbox contract supports bounded subscription filters.');
check('P6-DELIVERY-007', all(files.dispatcher, ['domain: request.domain', 'eventTypes: request.eventTypes']), 'Dispatcher forwards the bounded subscription to persistence.');
check('P6-DELIVERY-008', all(files.outboxStore, ['request.domain ? { domain: request.domain }', 'eventType: { in: [...request.eventTypes] }']), 'Prisma outbox claim filters domain and event type before claiming.');
check('P6-DELIVERY-009', all(files.container, ['certificateCompletionOutboxDeliveryGateway', 'certificateCompletionOutboxDispatcher', 'certificateCompletionOutboxWorker']), 'P13→P14 delivery chain is registered in DI.');
check('P6-DELIVERY-010', all(files.server, ['CERTIFICATE_COMPLETION_WORKER_ENABLED', "container.resolve<any>('certificateCompletionOutboxWorker')", 'worker.runOnce(workerId)']), 'A source caller/scheduler exists and is explicit opt-in.');
check('P6-DELIVERY-011', all(files.server, ['let running = false', 'if (running) return', 'server.on(\'close\'', 'clearInterval(timer)']), 'Worker bootstrap is non-reentrant and shutdown-aware.');
check('P6-IDEMPOTENCY-001', all(files.usecase, ['findBySourceEventId(event.eventId)', 'if (repeated) return repeated']), 'Use case short-circuits duplicate trusted event IDs.');
check('P6-IDEMPOTENCY-002', all(files.certRepo, ['certificateIssuanceInbox.findUnique', 'payloadHash !== data.sourceEventPayloadHash', 'CERTIFICATE_SOURCE_EVENT_ID_COLLISION']), 'P14 issuance inbox detects event-ID payload collisions.');
check('P6-IDEMPOTENCY-003', all(files.certRepo, ['certificateIssuanceInbox.create', 'sourceEventId']), 'Successful issuance persists durable event receipt/lineage.');
check('P6-IDEMPOTENCY-004', all(files.gatewayTest, ['idempotency key', 'mismatched idempotency keys', 'CourseCompleted', 'LearningPathCompleted']), 'Delivery/idempotency source tests exist.');
check('P6-IDEMPOTENCY-005', files.usecaseTest.includes('is idempotent for duplicate trusted completion events'), 'Duplicate event regression test exists.');

// P14 sole authority and trust contracts.
check('P6-AUTHORITY-001', !files.adminRouter.includes('/course-completions/issue'), 'No synchronous HTTP issuance route exists.');
check('P6-AUTHORITY-002', all(files.usecase, ['consumeCompletionEvent(', 'assertAuthoritativeCompletionEnvelope', "event.sourceDomain !== 'COURSES'", "event.eventVersion !== '1.0.0'"]), 'P14 issuance validates domain/type/version before mutation.');
check('P6-AUTHORITY-003', all(files.certContract, ['issue(data: IssueCertificateDto)', 'revoke(', 'reissue(', 'expireDue(', 'listLedger']), 'Repository contract centralizes P14 credential lifecycle operations.');
check('P6-AUTHORITY-004', all(files.trustContract, ['ICertificateNumberingService', 'ICertificateSignatureService', 'ICertificateVerificationQrService']), 'Numbering/signature/QR trust contracts are explicit.');
check('P6-AUTHORITY-005', all(files.trustPolicy, ['implements ICertificateNumberingService', 'ICertificateSignatureService', 'ICertificateVerificationQrService']), 'P14 trust policy implements all trust contracts.');
check('P6-AUTHORITY-006', all(files.trustPolicy, ['CERTIFICATE_ISSUER_SIGNING_KEY_NOT_CONFIGURED', 'CERTIFICATE_SIGNING_PROVIDER_NOT_CONFIGURED']), 'Signer fails closed on canonical key mismatch/production provider absence.');
check('P6-AUTHORITY-007', all(files.trustPolicy, ["createHmac('sha256'", "productionLike", 'source-only-development-signing-key']), 'Development signing fallback is explicit and production-like mode fails closed.');
check('P6-AUTHORITY-008', all(files.trustPolicy, ["schemaVersion: 'certificate-verification-qr-v1'", 'verificationCode', 'verificationUrl']), 'P14 owns canonical QR verification payload contract.');
check('P6-AUTHORITY-009', all(files.usecase, ['this.trustPolicy.generate(', 'this.trustPolicy.signHash(', 'this.trustPolicy.createPayload(']), 'Issuance/reissue use P14 trust policy rather than ad-hoc helpers.');
check('P6-AUTHORITY-010', all(files.usecase, ["schemaVersion: 'certificate-envelope-v2'", 'persistedIdentityMatchesEnvelope', 'canonicalJson']), 'Signed envelope seals canonical certificate semantics.');

// Template / issuer / lifecycle / ledger / verification.
check('P6-LIFECYCLE-001', all(files.schema, ['model CertificateIssuer', 'model CertificateTemplate', 'model CertificateTemplateVersion']), 'Issuer and immutable template-version persistence models exist.');
check('P6-LIFECYCLE-002', all(files.usecase, ['requireActiveIssuer', 'requireActiveTemplate', 'ACTIVE_CERTIFICATE_TEMPLATE_REQUIRED']), 'Issuance requires governed active issuer/template.');
check('P6-LIFECYCLE-003', all(files.certRepo, ['CERTIFICATE_ISSUER_SIGNING_KEY_MISMATCH', 'assertIssuanceReferences']), 'Persistence revalidates issuer/template/signing key references.');
check('P6-LIFECYCLE-004', all(files.schema, ['model CertificateLedgerEntry', 'model CertificateVerificationLog']), 'Ledger and verification logs are first-class persistence models.');
check('P6-LIFECYCLE-005', all(files.certRepo, ['certificateLedgerEntry.create', 'auditRecord.create', 'transactionalOutboxRecord.create']), 'Lifecycle mutation is ledgered, audited and outboxed atomically.');
check('P6-LIFECYCLE-006', all(files.usecase, ['public revoke(', 'public async reissue(', 'public async renew(', 'public async expireDue(']), 'P14 exposes revoke/reissue/renew/expire lifecycle use cases.');
check('P6-LIFECYCLE-007', all(files.certRepo, ["'CertificateRevoked'", "'CertificateReissued'", "'CertificateRenewed'", "'CertificateExpired'", "'CertificateVerified'"]), 'Repository emits certificate lifecycle integration events.');
check('P6-LIFECYCLE-008', all(files.lifecycleEvents, ['CERTIFICATE_ISSUED_EVENT_TYPE', 'CERTIFICATE_REVOKED_EVENT_TYPE', 'CERTIFICATE_REISSUED_EVENT_TYPE', 'CERTIFICATE_RENEWED_EVENT_TYPE', 'CERTIFICATE_EXPIRED_EVENT_TYPE', 'CERTIFICATE_VERIFIED_EVENT_TYPE']), 'Lifecycle event names are explicit domain contracts.');
check('P6-LIFECYCLE-009', all(files.lifecycleEvents, ['CertificateIssuedIntegrationEventPayload', 'CertificateRevokedIntegrationEventPayload', 'CertificateReissuedIntegrationEventPayload', 'CertificateRenewedIntegrationEventPayload', 'CertificateExpiredIntegrationEventPayload', 'CertificateVerifiedIntegrationEventPayload']), 'Lifecycle event payload contracts cover issue/revoke/reissue/renew/expire/verify.');
check('P6-LIFECYCLE-010', all(files.certRepo, ['revokedAt:', 'reason: data.reason', 'learningPathDisplayName: row.learningPathDisplayName']), 'Revocation event includes traceable timestamp/reason and achievement display context.');
check('P6-LIFECYCLE-011', all(files.certRepo, ['replacesCertificateId: original.id', 'expiresAt: replacement.expiresAt', 'learningPathDisplayName: replacement.learningPathDisplayName']), 'Reissue event preserves replacement lineage and expiry/achievement context.');
check('P6-VERIFY-001', all(files.usecase, ['verifyByCode(', 'integrityVerified', 'persistedIdentityMatchesEnvelope', 'recordVerification']), 'Public verification checks signature + persisted identity and records verification.');
check('P6-VERIFY-002', files.usecaseTest.includes('verifies signed certificate integrity and records the public verification ledger event'), 'Verification integrity regression test exists.');
check('P6-VERIFY-003', files.usecaseTest.includes('records revocation only through the P14 repository lifecycle boundary'), 'Revocation source regression test exists.');

// Read models: P15/private and P24/public without ownership duplication.
check('P6-READ-001', all(files.readModels, ['StudentCertificateReadModelDto', 'certificateId', 'verificationCode', 'achievementId']), 'P14 defines a sanitized student certificate read model.');
check('P6-READ-002', none(files.readModels, ['digitalSignature', 'signingKeyReference', 'verificationHash', 'metadata']), 'Private read model does not expose signature/key/internal metadata.');
check('P6-READ-003', all(files.readService, ['listForStudent(', 'repository.listByStudent', 'verifyPublic(', 'certificates.verifyByCode']), 'P14 read service owns student projection and public verification delegation.');
check('P6-READ-004', all(files.publicRouter, ['CertificateReadModelService', 'certificateReadModelService.verifyPublic']), 'Public verification router is an adapter over P14 read model service.');
check('P6-READ-005', !files.publicRouter.includes('certificateRepository'), 'Public router does not duplicate P14 persistence/verification logic.');
check('P6-READ-006', all(files.container, ['certificateReadModelService', 'new CertificateReadModelService']), 'P14 read model service is wired in DI.');
check('P6-READ-007', all(files.readTest, ['sanitized P14-owned student projection', "not.toHaveProperty('digitalSignature')", "not.toHaveProperty('metadata')"]), 'Sanitization regression test exists.');
check('P6-READ-008', files.readTest.includes('delegates public verification truth to the P14 use case'), 'Public read adapter delegation test exists.');

// Source boundaries / matrix / closure evidence.
check('P6-SCOPE-001', exists('docs/remediation/p6/P6_CERTIFICATES_CLOSURE_2026-09-03.md'), 'P6 closure evidence document exists.');
const r023 = files.matrix.split('\n').find(line => line.startsWith('| R-023 |')) ?? '';
const r028 = files.matrix.split('\n').find(line => line.startsWith('| R-028 |')) ?? '';
const r063 = files.matrix.split('\n').find(line => line.startsWith('| R-063 |')) ?? '';
check('P6-MATRIX-001', r023.includes('| Runtime Pending | P6 CLOSED |'), 'R-023 is source-closed and runtime-pending under P6.');
check('P6-MATRIX-002', all(r023, ['CertificateCompletionOutboxWorker', 'CertificateCompletionOutboxDeliveryGateway', 'CertificateIssuanceInbox']), 'R-023 records the actual delivery/idempotency implementation.');
check('P6-MATRIX-003', r028.includes('| Runtime Pending | P13 FINAL |'), 'R-028 has since been source-closed by the later P13 owner-read hydration step; P6 issuance ownership remains unchanged.');
check('P6-MATRIX-004', all(r028, ['CertificateReadModelService.listForStudent', 'StudentDashboardHydrationService', 'IStudentCertificateReadGateway']), 'R-028 records the completed P14-owned read boundary and its later student-dashboard composition adapter.');
check('P6-MATRIX-005', r063.includes('CertificateReadModelService.verifyPublic') && /\| Runtime Pending \| P10(?: CLOSED)? \|/.test(r063), 'R-063 preserves P14 verification authority before or after subsequent P10 source closure.');
check('P6-MATRIX-006', files.matrix.includes('### Current snapshot after P6 source closure'), 'Matrix includes a P6 measurement snapshot.');
check('P6-MATRIX-007', all(files.matrix, ['`Runtime Pending`: **38**', '`Partial`: **27**', '`Missing`: **2**', '`Source Closed`: **1**']), 'P6 matrix counts reflect exactly one Partial→Runtime Pending closure.');
check('P6-SCOPE-002', files.matrix.includes('R-024→R-028 and R-033 were re-audited and closed at source'), 'Verifier recognizes the current post-P13 matrix without rewriting the historical P6 snapshot.');

let passed = 0;
const failures = [];
for (const item of checks) {
  if (item.ok) passed += 1;
  else failures.push(item);
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.id} — ${item.detail}`);
}
console.log(`P6_CERTIFICATES_VERIFIER=${failures.length ? 'FAIL' : 'PASS'} ${passed}/${checks.length}`);
console.log('P6_RUNTIME_DB_KMS_E2E_PROOF=PENDING_BY_PLAN');
if (failures.length) process.exit(1);

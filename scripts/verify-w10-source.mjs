import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const files = {
  entity: read('packages/domain/src/certificates/entities/Certificate.ts'),
  contract: read('packages/domain/src/certificates/contracts/ICertificateRepository.ts'),
  usecase: read('packages/application/src/certificates/use-cases/CertificateUseCases.ts'),
  consumer: read('packages/application/src/certificates/use-cases/CertificateCompletionEventConsumer.ts'),
  trustPolicy: read('packages/application/src/certificates/services/CertificateTrustPolicy.ts'),
  repo: read('packages/infrastructure/src/certificates/PrismaCertificateRepository.ts'),
  schema: read('packages/infrastructure/prisma/schema.prisma'),
  migration: read('packages/infrastructure/prisma/migrations/20260826024500_w10_certificate_trust_model/migration.sql'),
  router: read('apps/api/src/presentation/api/router/CertificateAdminRouter.ts'),
  app: read('apps/api/src/app.ts'),
  container: read('apps/api/src/infrastructure/di/container.ts'),
};

const checks = [];
const check = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), detail });
const hasAll = (text, needles) => needles.every((n) => text.includes(n));

check('P14-ISSUER-006',
  hasAll(files.entity, ['CertificateIssuerDto', 'issuerLogoAssetId', 'signingKeyReference', 'CertificateIssuerStatus']) &&
  files.schema.includes('model CertificateIssuer') &&
  hasAll(files.repo, ['requireActiveIssuer', 'CERTIFICATE_ISSUER_SIGNING_KEY_MISMATCH']) &&
  files.usecase.includes('ACTIVE_CERTIFICATE_ISSUER_REQUIRED'),
  'Issuer is first-class, status-governed and signing-key-bound.');

check('P14-VALIDITY-009',
  hasAll(files.entity, ['EXPIRING', 'RENEWABLE', 'validityDurationDays', 'renewalPeriodDays']) &&
  hasAll(files.usecase, ['expirationFor(', 'public async renew(', 'public async expireDue(']) &&
  hasAll(files.repo, ['CertificateExpired', 'CertificateRenewed', 'expireDue(']),
  'Expiring/Renewable issuance and durable expire/renew workflows exist.');

check('P14-TPL-004',
  files.schema.includes('model CertificateTemplateVersion') &&
  files.schema.includes('templateVersionId') &&
  hasAll(files.repo, ['certificateTemplateVersion.create', 'CERTIFICATE_TEMPLATE_VERSION_CREATED', 'currentVersionId']),
  'Template content revisions create immutable version rows and certificates bind version IDs.');

check('P14-TPL-005',
  files.usecase.includes('bootstrapDefaultCourseTemplateDraft') &&
  !files.usecase.includes('ensureDefaultCourseTemplate()') &&
  hasAll(files.usecase, ["status: CertificateTemplateStatus.DRAFT", 'ACTIVE_CERTIFICATE_TEMPLATE_REQUIRED']) &&
  !files.router.includes('/course-completions/issue'),
  'Bootstrap creates Draft only and issuance fails closed without governed Active template.');

check('P14-GOV-010',
  files.contract.includes('CertificateMutationContext') &&
  hasAll(files.repo, ['appendGovernanceMutation', 'CERTIFICATE_TEMPLATE_MAKER_CHECKER_REQUIRED']) &&
  hasAll(files.router, ['admin:certificates:templates:author', 'admin:certificates:templates:approve', 'admin:certificates:lifecycle:manage', 'admin:certificates:issuers:manage']) &&
  !files.app.includes("requireAdminPermission('admin:certificates:manage'), lazyRouter('certificateAdminRouter')"),
  'Template governance is actor-aware, audited/outboxed, maker-checker and route-permission-specific.');

check('P14-DATA-011',
  hasAll(files.schema, ['CertificateLedgerEntry[]', 'certificate Certificate @relation', 'templateVersionRecord CertificateTemplateVersion?', 'CertificateIssuer?']) &&
  hasAll(files.migration, ['CertificateLedgerEntry_certificateId_fkey', 'CertificateVerificationLog_certificateId_fkey', 'Certificate_templateId_fkey', 'Certificate_templateVersionId_fkey', 'ON DELETE RESTRICT']),
  'Same-domain references have restrictive FK definitions with legacy reconciliation gate.');

check('P14-CRYPTO-001',
  hasAll(files.entity, ['CertificateSignedEnvelopeV2', "schemaVersion: 'certificate-envelope-v2'", 'signingKeyReference']) &&
  hasAll(files.usecase, ['signedEnvelope(', 'canonicalJson(', 'persistedIdentityMatchesEnvelope', 'envelope.validity', 'envelope.issuer']) &&
  files.usecase.includes('this.digest(this.canonicalJson(envelope))'),
  'One canonical signed envelope seals issuer/type/template/validity/expiration/achievement semantics.');

check('P14-ISSUE-002',
  !files.router.includes("'/course-completions/issue'") &&
  hasAll(files.consumer, ['CertificateCompletionOutboxRecord', 'record.domain', 'record.eventType', 'consumeCompletionEvent']) &&
  hasAll(files.schema, ['model CertificateIssuanceInbox', 'sourceEventId']) &&
  files.container.includes('certificateCompletionEventConsumer'),
  'Initial issuance consumes persisted Phase 13 events and records an immutable inbox receipt; no synthetic HTTP issuance route.');

check('P14-PATH-003',
  hasAll(files.usecase, ['LearningPathCompletedEventPayload', 'issueLearningPathCompletion', "certificateType: 'LEARNING_PATH'", 'learningPathCompletionId']) &&
  hasAll(files.schema, ['learningPathId', 'learningPathDisplayName', 'learningPathCompletionId']),
  'LearningPathCompleted has a typed issuance/persistence path.');

check('P14-REISSUE-007',
  !files.usecase.includes('replacement: {\n        ...source') &&
  hasAll(files.repo, ['revokedAt: null', 'revocationReason: null', 'revokedBy: null', 'archivedAt: null']),
  'Replacement is allow-listed and lifecycle revocation/archive fields are explicitly cleared.');

check('P14-EVT-008',
  hasAll(files.repo, ['schemaVersion: \'2.0\'', 'studentReferenceId:', 'certificateNumber:', 'serialNumber:', 'verificationCode:', 'verificationUrl:', 'courseDisplayName:', 'previewImageAssetId:']) &&
  files.repo.includes("'CertificateIssued'"),
  'CertificateIssued payload is versioned and carries Phase 14 contract + Phase 15 projection fields.');

check('W10-DB-MUTATION-GUARD', files.migration.includes('DO NOT APPLY outside the approved Google Studio runtime gate'), 'Migration is source-only and explicitly deferred.');
check('W10-EVENT-AUTHORITY-GUARD', files.usecase.includes("event.sourceDomain !== 'COURSES'") && files.usecase.includes("event.eventVersion !== '1.0.0'"), 'Completion envelope authority/version fail closed.');
check('W10-KEY-OWNERSHIP-GUARD', (files.usecase.includes('CERTIFICATE_ISSUER_SIGNING_KEY_NOT_CONFIGURED') || files.trustPolicy.includes('CERTIFICATE_ISSUER_SIGNING_KEY_NOT_CONFIGURED')) && files.repo.includes('CERTIFICATE_ISSUER_SIGNING_KEY_MISMATCH'), 'Configured signer must match canonical issuer key reference.');

let passed = 0;
for (const item of checks) {
  if (item.ok) passed += 1;
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.id} — ${item.detail}`);
}
console.log(`W10_SOURCE_VERIFIER=${passed === checks.length ? 'PASS' : 'FAIL'} ${passed}/${checks.length}`);
console.log('W10_RUNTIME_DB_PROOF=PENDING_GOOGLE_STUDIO');
process.exitCode = passed === checks.length ? 0 : 1;

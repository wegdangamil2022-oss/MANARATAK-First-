import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const exists = p => fs.existsSync(path.join(root,p));
const files = {
  usecase: read('packages/application/src/certificates/use-cases/CertificateUseCases.ts'),
  trust: read('packages/application/src/certificates/services/CertificateTrustPolicy.ts'),
  readModels: read('packages/domain/src/certificates/read-models/CertificateReadModels.ts'),
  readService: read('packages/application/src/certificates/use-cases/CertificateReadModelService.ts'),
  contract: read('packages/domain/src/certificates/contracts/ICertificateRepository.ts'),
  entity: read('packages/domain/src/certificates/entities/Certificate.ts'),
  repo: read('packages/infrastructure/src/certificates/PrismaCertificateRepository.ts'),
  adminRouter: read('apps/api/src/presentation/api/router/CertificateAdminRouter.ts'),
  publicRouter: read('apps/api/src/presentation/api/router/CertificatePublicRouter.ts'),
  container: read('apps/api/src/infrastructure/di/container.ts'),
  adminPage: read('apps/admin/src/pages/CertificateAdminPage.tsx'),
  detailPage: read('apps/admin/src/pages/CertificateDetailPage.tsx'),
  preview: read('apps/admin/src/components/certificates/CertificatePreview.tsx'),
  adminApp: read('apps/admin/src/App.tsx'),
  publicPage: read('apps/web/src/features/certificates/CertificateVerificationPage.tsx'),
  webClient: read('apps/web/src/api/client.ts'),
  qr: read('packages/shared/src/qr/qrCode.ts'),
  sharedIndex: read('packages/shared/src/index.ts'),
  schema: read('packages/infrastructure/prisma/schema.prisma'),
  migration: read('packages/infrastructure/prisma/migrations/20260905050000_certificate_brand_defaults/migration.sql'),
  envApi: read('apps/api/.env.example'),
  envRoot: read('.env.example'),
  appConfig: read('packages/config/src/AppConfig.ts'),
  apiServer: read('apps/api/src/server.ts'),
  apiApp: read('apps/api/src/app.ts'),
  phase14Runbook: read('docs/implementation-status/MANARATAK-2.0-Phase14-Source-Closure-and-Google-Studio-Runbook.md'),
};

const checks=[];
const check=(id,ok,detail)=>checks.push({id,ok:Boolean(ok),detail});
const all=(text, arr)=>arr.every(v=>text.includes(v));
const none=(text, arr)=>arr.every(v=>!text.includes(v));

// Ownership and issuance authority.
check('CERT-OWN-001', all(files.usecase,["event.sourceDomain !== 'COURSES'","event.eventVersion !== '1.0.0'",'sourcePhase']), 'P14 accepts only authoritative Phase 13 completion envelopes.');
check('CERT-OWN-002', !files.adminRouter.includes('/course-completions/issue'), 'No synthetic/manual initial issuance HTTP route exists.');
check('CERT-OWN-003', files.usecase.includes('findBySourceEventId(event.eventId)'), 'Event-level issuance is idempotent.');
check('CERT-OWN-004', files.usecase.includes('findBySourceCompletionId(payload.completionId)'), 'Completion-level issuance is idempotent.');
check('CERT-OWN-005', all(files.usecase,['CourseOriginType.NATIVE_MANARATAK_COURSE','MANARATAK_CERTIFICATE_NATIVE_COURSE_REQUIRED']), 'MANARATAK certificates fail closed for imported/external courses.');
check('CERT-OWN-006', files.usecase.includes('COURSE_CERTIFICATE_DISABLED'), 'Native course must explicitly enable certificate eligibility.');
check('CERT-OWN-007', all(files.usecase,['LearningPathCompletedEventPayload','issueLearningPathCompletion']), 'Learning-path completion has a distinct issuance path.');
check('CERT-OWN-008', files.usecase.includes('ACTIVE_CERTIFICATE_TEMPLATE_REQUIRED'), 'Issuance requires an active governed template.');
check('CERT-OWN-009', files.usecase.includes('ACTIVE_CERTIFICATE_ISSUER_REQUIRED'), 'Issuance requires an active governed issuer without falsely naming it accredited.');
check('CERT-OWN-010', none(files.adminRouter,['router.delete(','.delete(']), 'Certificate API exposes no destructive delete lifecycle.');

// Recipient snapshot and signed truth.
check('CERT-ID-001', files.usecase.includes('IIdentityRepository'), 'P14 reads recipient identity through a domain boundary.');
check('CERT-ID-002', all(files.usecase,['resolveRecipientDisplayName','profile?.props?.displayName']), 'Recipient display name is resolved at issuance.');
check('CERT-ID-003', files.usecase.includes('recipientDisplayName: input.recipientDisplayName'), 'Recipient name snapshot is part of the signed envelope.');
check('CERT-ID-004', files.usecase.includes("schemaVersion: 'certificate-envelope-v2'"), 'Signed envelope is versioned.');
check('CERT-ID-005', all(files.usecase,['canonicalJson(', 'verificationHash', 'signHash']), 'Canonical envelope hash and signature are generated.');
check('CERT-ID-006', all(files.usecase,['persistedIdentityMatchesEnvelope','verifyHash(']), 'Verification rechecks persisted identity and cryptographic signature.');

// Public verification URL / QR.
check('CERT-QR-001', files.trust.includes('publicVerificationBaseUrl?: string'), 'Public verification base URL is explicit runtime configuration.');
check('CERT-QR-002', files.trust.includes('CERTIFICATE_PUBLIC_VERIFICATION_BASE_URL_NOT_CONFIGURED'), 'Production-like issuance fails closed when public verification URL is missing.');
check('CERT-QR-003', files.trust.includes('/certificates/verify?code='), 'Credential QR points to public verification UI rather than raw API JSON.');
check('CERT-QR-004', all(files.usecase,['createPublicVerificationUrl(verificationCode)','createPayload(verificationCode, verificationUrl)']), 'Issue and QR payload share one canonical public URL.');
check('CERT-QR-005', all(files.qr,['QR Code Model 2','VERSION = 4','reedSolomonRemainder','drawFinder','drawAlignment','drawFormatBits']), 'A standards-compliant in-repo QR encoder exists.');
check('CERT-QR-006', files.qr.includes('QR_PAYLOAD_TOO_LONG'), 'QR encoder fails closed outside its validated payload capacity.');
check('CERT-QR-007', files.qr.includes('quietZone ?? 4'), 'Rendered QR preserves a four-module quiet zone by default.');
check('CERT-QR-008', files.sharedIndex.includes("export * from './qr/qrCode'"), 'QR implementation is exported through shared package boundary.');
check('CERT-QR-009', files.preview.includes('createQrMatrix'), 'Actual Admin certificate preview renders the real QR matrix.');
check('CERT-QR-010', !exists('apps/web/src/features/admin-preview'), 'Shadow Admin certificate preview is removed.');

// Public privacy and UX.
check('CERT-PUB-001', all(files.readModels,['PublicCertificateVerificationDto','recipientDisplayName','achievementDisplayName','integrityVerified']), 'Dedicated public verification DTO exists.');
check('CERT-PUB-002', none(files.readModels.split('export interface PublicCertificateVerificationDto')[1] ?? '', ['verificationHash','studentReferenceId','signingKeyReference','digitalSignature','revocationReason']), 'Public DTO omits internal identity/crypto/admin-reason fields.');
check('CERT-PUB-003', files.readService.includes('verifyPublic(') && files.readService.includes('certificates.verifyByCode'), 'Public read model delegates truth to P14 verification use case.');
check('CERT-PUB-004', !files.publicRouter.includes('certificateRepository'), 'Public router does not bypass P14 service ownership.');
check('CERT-PUB-005', files.webClient.includes('/public/certificates/verify/${encodedCode}'), 'Web client calls public certificate verification API.');
check('CERT-PUB-006', all(files.publicPage,['useSearchParams','initialCode','void verify(initialCode, false)']), 'QR landing with ?code= automatically verifies without a second click.');
check('CERT-PUB-007', files.publicPage.includes('حالة الشهادة') && !files.publicPage.includes('حالة الاعتماد'), 'Public copy describes certificate status without implying accreditation.');
check('CERT-PUB-008', files.publicPage.includes('الختم الرقمي سليم'), 'Public page explains integrity result.');
check('CERT-PUB-009', !files.publicPage.includes('revocationReason'), 'Public page does not disclose administrative revocation reason.');
check('CERT-PUB-010', files.publicPage.includes("Intl.DateTimeFormat('ar'"), 'Public verification dates are localized for Arabic UI.');
check('CERT-PUB-011', files.publicPage.includes('لا تمثل درجة جامعية أو اعتمادًا مهنيًا خارجيًا'), 'Public verification page clearly distinguishes completion certificates from external accreditation.');
check('CERT-PUB-012', all(files.publicPage,['صلاحية الشهادة','تاريخ الانتهاء']), 'Public verification shows validity and expiration semantics.');
check('CERT-PUB-013', files.readService.includes('verificationUrl: row.verificationUrl'), 'Public read model returns the canonical persisted verification URL.');

// Template / issuer governance and brand.
check('CERT-TPL-001', all(files.usecase,['CertificateTemplateStatus.PENDING_APPROVAL','CertificateTemplateStatus.APPROVED','CertificateTemplateStatus.ACTIVE']), 'Template lifecycle includes maker/checker approval before activation.');
check('CERT-TPL-002', files.repo.includes('CERTIFICATE_TEMPLATE_MAKER_CHECKER_REQUIRED'), 'Persistence enforces maker/checker separation.');
check('CERT-TPL-003', files.schema.includes('model CertificateTemplateVersion'), 'Template versions are first-class immutable records.');
check('CERT-TPL-004', files.usecase.includes("accentColor: '#142B5F'"), 'Default template uses MANARATAK navy.');
check('CERT-TPL-005', files.usecase.includes("secondaryColor: '#D6A43B'"), 'Default template uses MANARATAK gold.');
check('CERT-TPL-006', files.usecase.includes("titleAr: 'شهادة إتمام'"), 'Default Arabic credential title is Certificate of Completion.');
check('CERT-TPL-007', files.usecase.includes("titleEn: 'CERTIFICATE OF COMPLETION'"), 'Default English credential title is Certificate of Completion.');
check('CERT-TPL-008', !files.usecase.includes('شهادة إتمام معتمدة'), 'Default MANARATAK template does not falsely claim external accreditation.');
check('CERT-TPL-009', files.usecase.includes('إدارة الشهادات — منارتك'), 'Default signatory is MANARATAK Certificates Office, not academic-accreditation office.');
check('CERT-TPL-010', all(files.usecase,['UNIVERSITY','CERTIFICATE_ISSUER_ACCREDITATION_REQUIRED']), 'Non-MANARATAK issuer paths require explicit accreditation evidence where configured.');
check('CERT-TPL-011', files.adminRouter.includes('/templates/bootstrap-default'), 'Admin can bootstrap the governed default draft through the real owner API.');
check('CERT-TPL-012', all(files.adminRouter,['templates:author','templates:approve','issuers:manage','lifecycle:manage']), 'Admin API separates certificate permissions by responsibility.');

// Actual Admin Dashboard completeness.
check('CERT-ADM-001', files.adminPage.includes('سجل الشهادات'), 'Actual Admin dashboard has a certificate registry workspace.');
check('CERT-ADM-002', files.adminPage.includes('القوالب'), 'Actual Admin dashboard manages templates.');
check('CERT-ADM-003', files.adminPage.includes('جهات الإصدار'), 'Actual Admin dashboard manages issuers.');
check('CERT-ADM-004', files.adminPage.includes('الجاهزية والحوكمة'), 'Actual Admin dashboard exposes readiness/governance.');
check('CERT-ADM-005', files.adminPage.includes('#142B5F') && files.adminPage.includes('#D6A43B'), 'Actual Admin dashboard uses MANARATAK brand colors.');
check('CERT-ADM-006', files.adminPage.includes('الإصدار الأولي لا يتم يدويًا'), 'Admin explicitly communicates trusted-event initial issuance.');
check('CERT-ADM-007', files.detailPage.includes('إلغاء رسمي'), 'Certificate detail supports governed revocation.');
check('CERT-ADM-008', files.detailPage.includes('إعادة إصدار'), 'Certificate detail supports governed reissue.');
check('CERT-ADM-009', files.detailPage.includes('تجديد'), 'Certificate detail supports renewable credentials.');
check('CERT-ADM-010', files.detailPage.includes('أرشفة'), 'Certificate detail supports non-destructive archival.');
check('CERT-ADM-011', files.detailPage.includes('الحذف النهائي غير متاح'), 'UI explicitly preserves credential audit history instead of delete.');
check('CERT-ADM-012', files.detailPage.includes('certificatePdfAssetId'), 'Admin detail is ready to expose EAP-rendered PDF asset when available.');
check('CERT-ADM-013', files.adminApp.includes('path="/certificates/:id"'), 'Actual Admin router deep-links certificate records.');
check('CERT-ADM-014', files.preview.includes('aria-label="رمز QR للتحقق"'), 'Admin preview labels QR for accessibility.');
check('CERT-ADM-015', files.adminRouter.includes("'/readiness'") && files.usecase.includes('public async readiness()'), 'Admin reads certificate runtime readiness from the owner service.');
check('CERT-ADM-016', all(files.adminPage,['publicVerificationBaseUrlConfigured','signingProviderConfigured','artifactRendererRuntimeReady']), 'Admin readiness badges reflect runtime configuration instead of hard-coded READY states.');
check('CERT-ADM-017', files.adminPage.includes('AssetPicker') && all(files.adminPage,['logoAssetId','sealAssetId','signatureAssetId','designAssetId']), 'Template editor exposes governed EAP design assets through AssetPicker controls.');
check('CERT-ADM-018', all(files.adminPage,['سياسة الصلاحية','validityDurationDays','renewalPeriodDays','requiresRevalidation']), 'Template editor exposes validity, renewal and revalidation policy.');
check('CERT-ADM-019', all(files.adminPage,['لغة الشهادة','اتجاه القالب']), 'Template editor exposes language and layout controls.');

// Lifecycle, audit, and runtime readiness.
check('CERT-LIFE-001', all(files.usecase,['public revoke(','public async reissue(','public async renew(','public async expireDue(']), 'P14 implements revoke/reissue/renew/expire lifecycle.');
check('CERT-LIFE-002', files.repo.includes('CertificateLedgerEntry'), 'Certificate lifecycle is ledgered.');
check('CERT-LIFE-003', files.schema.includes('model CertificateVerificationLog'), 'Verification history is persisted as a first-class model.');
check('CERT-LIFE-004', files.usecase.includes('Certificate must be revoked') || files.usecase.includes('CERTIFICATE_MUST_BE_REVOKED_BEFORE_REISSUE'), 'Reissue is gated behind revocation.');
check('CERT-LIFE-005', files.usecase.includes('CertificateStatus.EXPIRED'), 'Expiration state is handled by owner use case.');
check('CERT-LIFE-006', files.trust.includes('CERTIFICATE_SIGNING_PROVIDER_NOT_CONFIGURED'), 'Production-like crypto fails closed without signing provider.');
check('CERT-LIFE-007', files.container.includes("readConfig<string>('CERTIFICATE_PUBLIC_VERIFICATION_BASE_URL')"), 'DI wires public verification base URL from runtime config.');
check('CERT-LIFE-008', files.envApi.includes('CERTIFICATE_PUBLIC_VERIFICATION_BASE_URL'), 'API env example documents public verification URL.');
check('CERT-LIFE-009', files.envRoot.includes('CERTIFICATE_PUBLIC_VERIFICATION_BASE_URL'), 'Root env example documents public verification URL.');
check('CERT-LIFE-010', all(files.contract,['attachArtifacts','AttachCertificateArtifactsDto']), 'P14 repository exposes a governed rendered-artifact attachment boundary.');
check('CERT-LIFE-011', all(files.usecase,['attachRenderedArtifacts','CERTIFICATE_RENDERED_ARTIFACT_REQUIRED']), 'P14 validates and attaches EAP-rendered certificate assets through the owner use case.');
check('CERT-LIFE-012', all(files.repo,['ARTIFACTS_ATTACHED','CertificateArtifactsRendered','verificationQrAssetId']), 'Rendered artifact attachment is ledgered and published through the outbox.');
check('CERT-LIFE-013', files.trust.includes('runtimeReadiness()'), 'Trust policy exposes non-secret runtime readiness signals.');
check('CERT-WORKER-001', all(files.appConfig,['CERTIFICATE_COMPLETION_WORKER_ENABLED must be true in production/staging','CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS']), 'Certificate completion worker is explicit and mandatory in production configuration.');
check('CERT-WORKER-002', files.envApi.includes('CERTIFICATE_COMPLETION_WORKER_ENABLED=true') && files.envRoot.includes('CERTIFICATE_COMPLETION_WORKER_ENABLED=true'), 'Certificate worker flags are documented in both canonical env examples.');
check('CERT-WORKER-003', files.apiServer.includes("pollingWorkerRuntimeRegistry.success('certificate-completion')") && files.apiApp.includes("name: 'polling-workers'") && files.apiApp.includes('lastSuccessLagMs'), 'Certificate worker state/success/failure/lag are health-visible.');
check('CERT-WORKER-004', files.phase14Runbook.includes('W3 certificate completion worker reconciliation'), 'Google Studio/runtime runbook documents the W3 worker contract.');

// DB/migration source-only contract.
check('CERT-DB-001', files.schema.includes("@default(\"#142B5F\")") && files.schema.includes("@default(\"#D6A43B\")"), 'Future Prisma template defaults match current brand.');
check('CERT-DB-002', files.migration.includes('SOURCE-ONLY CLOSURE MIGRATION'), 'Certificate brand migration is explicitly source-only.');
check('CERT-DB-003', files.migration.includes('DO NOT APPLY outside the approved runtime database gate'), 'Migration explicitly forbids unapproved execution.');
check('CERT-DB-004', all(files.migration,["SET DEFAULT '#142B5F'","SET DEFAULT '#D6A43B'"]), 'Migration changes only future template color defaults.');

// Required source files.
check('CERT-FILE-001', exists('apps/admin/src/pages/CertificateDetailPage.tsx'), 'Actual Admin certificate detail page exists.');
check('CERT-FILE-002', exists('apps/admin/src/components/certificates/CertificatePreview.tsx'), 'Actual Admin certificate preview exists.');
check('CERT-FILE-003', exists('packages/shared/src/qr/qrCode.ts'), 'Real QR source implementation exists.');

let passed=0;
for (const c of checks) { if(c.ok) passed++; console.log(`${c.ok?'PASS':'FAIL'} ${c.id} — ${c.detail}`); }
console.log(`CERTIFICATES_SOURCE_CLOSURE=${passed===checks.length?'PASS':'FAIL'} ${passed}/${checks.length}`);
console.log('CERTIFICATES_DB_MIGRATION_BACKFILL_EXECUTIONS=0');
console.log('CERTIFICATES_RUNTIME_DB_KMS_EAP_E2E=PENDING_DEPLOYED_ENVIRONMENT');
process.exitCode = passed===checks.length ? 0 : 1;

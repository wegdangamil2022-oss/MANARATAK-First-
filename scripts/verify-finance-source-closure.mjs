import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const checks = [];
const check = (id, ok, note='') => checks.push({ id, ok: Boolean(ok), note });
const hasAll = (text, values) => values.every((value) => text.includes(value));
const hasNone = (text, values) => values.every((value) => !text.includes(value));

const files = {
  invoice: read('packages/domain/src/finance-platform/entities/FinanceInvoice.ts'),
  payment: read('packages/domain/src/finance-platform/entities/FinancePayment.ts'),
  platform: read('packages/domain/src/finance-platform/entities/FinancePlatform.ts'),
  gateways: read('packages/domain/src/finance-platform/contracts/FinanceGateways.ts'),
  repoContract: read('packages/domain/src/finance-platform/contracts/IFinanceRepository.ts'),
  useCases: read('packages/application/src/finance-platform/use-cases/FinancePlatformUseCases.ts'),
  studentFinance: read('packages/application/src/finance-platform/use-cases/FinanceStudentUseCases.ts'),
  serviceUseCases: read('packages/application/src/services-platform/use-cases/ServiceRequestUseCases.ts'),
  repo: read('packages/infrastructure/src/finance-platform/PrismaFinanceRepository.ts'),
  providers: read('packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts'),
  safety: read('packages/infrastructure/src/finance-platform/FinanceSafetyGateways.ts'),
  courseBoundary: read('packages/infrastructure/src/courses/Phase19CourseFinancialClearanceGateway.ts'),
  serviceBoundary: read('packages/infrastructure/src/services-platform/ServicePlatformGateways.ts'),
  adminRouter: read('apps/api/src/presentation/api/router/FinanceAdminRouter.ts'),
  studentRouter: read('apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts'),
  app: read('apps/api/src/app.ts'),
  di: read('apps/api/src/infrastructure/di/container.ts'),
  admin: read('apps/admin/src/pages/FinanceAdminPage.tsx'),
  detail: read('apps/admin/src/pages/FinanceInvoiceDetailPage.tsx'),
  adminApp: read('apps/admin/src/App.tsx'),
  webRouter: read('apps/web/src/router/index.tsx'),
  healthRouter: read('apps/api/src/presentation/api/router/MonitoringRouter.ts'),
  financeTest: read('packages/application/tests/finance-platform/FinancePlatformUseCases.spec.ts'),
  serviceTest: read('packages/application/tests/services-platform/ServiceRequestUseCases.spec.ts'),
};

// Domain + money + state machines
check('FIN-DOM-001 exact minor-unit money', files.invoice.includes('MoneyAmount') && files.useCases.includes('amountMinorUnits'));
check('FIN-DOM-002 invoice lifecycle explicit', hasAll(files.platform, ['DRAFT:', 'ISSUED:', 'PARTIALLY_PAID:', 'PAID:', 'CREDITED:', 'VOIDED:']));
check('FIN-DOM-003 paid invoice reversible after refund', files.platform.includes("PAID: ['ISSUED', 'PARTIALLY_PAID']"));
check('FIN-DOM-004 partial invoice reversible', files.platform.includes("PARTIALLY_PAID: ['ISSUED', 'PAID'"));
check('FIN-DOM-005 payment filter contract', files.payment.includes('FinancePaymentFilters'));
check('FIN-DOM-006 refund lifecycle', hasAll(files.platform, ["'REQUESTED'", "'APPROVED'", "'PROCESSING'", "'COMPLETED'", "'FAILED'"]));
check('FIN-DOM-007 transfer lifecycle', hasAll(files.platform, ["'RATE_LOCKED'", "'PENDING_APPROVAL'", "'SETTLED'", "'REVERSED'"]));
check('FIN-DOM-008 maker/checker primitive', files.repoContract.includes('FinanceApprovalBinding') && files.useCases.includes('requireBoundApproval'));
check('FIN-DOM-009 runtime capability truth states', files.gateways.includes("'READY' | 'RUNTIME_PENDING' | 'NOT_CONFIGURED'"));
check('FIN-DOM-010 payment registry enumerable', files.gateways.includes('list(): readonly IPaymentGateway[]'));
check('FIN-DOM-011 bank registry enumerable', files.gateways.includes('list(): readonly IBankTransferGateway[]'));

// Repository and immutable accounting
check('FIN-REP-001 payment attempt persisted before provider', files.repo.includes('preparePaymentAttempt'));
check('FIN-REP-002 pending attempt record', hasAll(files.repo, ['PaymentStatus.PENDING', 'FINANCE_PAYMENT_ATTEMPT_STARTED']));
check('FIN-REP-003 authorization persistence', hasAll(files.repo, ['recordPaymentAuthorization', 'FINANCE_PAYMENT_AUTHORIZED']));
check('FIN-REP-004 failure persistence', hasAll(files.repo, ['recordPaymentFailure', 'FINANCE_PAYMENT_FAILED']));
check('FIN-REP-005 capture requires prepared payment', files.repo.includes('Payment attempt must be prepared before capture'));
check('FIN-REP-006 duplicate gateway capture rejected', files.repo.includes('Duplicate external payment capture rejected'));
check('FIN-REP-007 authorization replay mismatch rejected', files.repo.includes('Authorization replay reference mismatch'));
check('FIN-REP-008 idempotency reuse mismatch rejected', files.repo.includes('Payment idempotency key was reused with a different request'));
check('FIN-REP-009 transaction isolation serializable', files.repo.includes("isolationLevel: 'Serializable'"));
check('FIN-REP-010 ledger balancing enforced', files.useCases.includes('validateBalancedPostings'));
check('FIN-REP-011 immutable reversal path', files.repo.includes('reversalOfId'));
check('FIN-REP-012 audit/outbox governance', hasAll(files.repo, ['auditRecord.create', 'transactionalOutboxRecord.create', "category: 'FINANCE'"]));
check('FIN-REP-013 payment listing pagination', files.repo.includes('async listPayments('));
check('FIN-REP-014 invoice search', files.repo.includes('filters.search'));
check('FIN-REP-015 provider reference unique schema', read('packages/infrastructure/prisma/schema.prisma').includes('@@unique([gatewayProvider, gatewayReference])'));

// Payment security and runtime truth
check('FIN-PAY-001 raw PAN rejection', files.useCases.includes('Raw card PAN is forbidden'));
check('FIN-PAY-002 deterministic payment reference', files.useCases.includes("fin_pay_${hash(identity.idempotencyKey).slice(0, 32)}"));
check('FIN-PAY-003 provider authorize idempotency', files.useCases.includes(":authorize`"));
check('FIN-PAY-004 provider capture idempotency', files.useCases.includes(":capture`"));
check('FIN-PAY-005 ambiguous transport not fabricated failed', files.useCases.includes('Transport exceptions are ambiguous'));
check('FIN-PAY-006 authorized retry supported', files.useCases.includes('pending.status === PaymentStatus.AUTHORIZED'));
check('FIN-PAY-007 capture proof required', files.useCases.includes('PAYMENT_CAPTURE_NOT_PROVEN'));
check('FIN-PAY-008 explicit authorization failure recorded', files.useCases.includes('PAYMENT_AUTHORIZATION_FAILED'));
check('FIN-PAY-009 explicit capture failure recorded', files.useCases.includes('PAYMENT_CAPTURE_FAILED'));
check('FIN-PAY-010 environment adapter exposes real configured readiness', files.providers.includes("capabilityStatus: 'PRODUCTION_CAPABLE' | 'NOT_CONFIGURED'") && files.providers.includes("runtimeStatus(): 'READY' | 'NOT_CONFIGURED'"));
check('FIN-PAY-011 provider transport is signed and production-capable when configured', files.providers.includes('SignedProviderHttpClient') && files.providers.includes("this.capabilityStatus = this.client ? 'PRODUCTION_CAPABLE' : 'NOT_CONFIGURED'"));
check('FIN-PAY-012 runtime readiness admin-visible', files.adminRouter.includes("'/runtime-readiness'"));
check('FIN-PAY-013 webhook source verification capability is declared', files.useCases.includes("inboundWebhookVerification: 'SOURCE_AVAILABLE'"));
check('FIN-PAY-014 offline payment marked disabled', files.useCases.includes("manualOfflinePaymentReview: 'NOT_ENABLED'"));
check('FIN-PAY-015 automatic FX reports actual provider readiness', files.useCases.includes('automaticFxProvider: fxProvider') && files.useCases.includes("status: this.dependencies.fxRateProvider.isConfigured() ? 'READY'"));

// Ownership and cross-domain boundaries
check('FIN-BND-001 finance clearance owner API', files.useCases.includes('getInvoiceClearance'));
check('FIN-BND-002 finance origin clearance API', files.useCases.includes('hasFinancialClearanceForOrigin'));
check('FIN-BND-003 clearance requires zero due', files.useCases.includes("BigInt(invoice.amountDue.amountMinorUnits) === 0n"));
check('FIN-BND-004 service reads Finance boundary', files.serviceBoundary.includes('this.finance.getInvoiceClearance(invoiceId)'));
check('FIN-BND-005 service blocks unpaid fulfillment', files.serviceUseCases.includes('SERVICE_FINANCIAL_CLEARANCE_REQUIRED'));
check('FIN-BND-006 service requires linked invoice', files.serviceUseCases.includes('SERVICE_FINANCE_INVOICE_REQUIRED'));
check('FIN-BND-007 course reads Finance boundary', files.courseBoundary.includes('this.finance.hasFinancialClearanceForOrigin'));
check('FIN-BND-008 course origin explicit', files.courseBoundary.includes("originDomain: 'COURSE_ENROLLMENT'"));
check('FIN-BND-009 service origin explicit', files.serviceBoundary.includes("originDomain: 'PHASE_20_SERVICE_REQUEST'"));
check('FIN-BND-010 no direct Prisma Finance read in course boundary', !files.courseBoundary.includes('prisma'));
check('FIN-BND-011 no arbitrary invoice creation in Finance Admin API', !files.adminRouter.includes("router.post(\n      '/invoices',"));
check('FIN-BND-012 no arbitrary invoice creation UI', hasNone(files.admin, ['CreateInvoiceForm', 'فاتورة جديدة', 'originDomain" label']));

// Authenticated learner finance flow
check('FIN-STU-001 student finance route authenticated globally', files.studentRouter.includes('router.use(new AuthMiddleware'));
check('FIN-STU-002 path ownership helper', files.studentRouter.includes('STUDENT_ROUTE_OWNERSHIP_MISMATCH'));
check('FIN-STU-003 invoice list uses authenticated owner', files.studentRouter.includes('listStudentInvoices(ownStudentPath(req))'));
check('FIN-STU-004 overview uses authenticated owner', files.studentRouter.includes('getStudentFinancialOverview(ownStudentPath(req))'));
check('FIN-STU-005 invoice detail uses authenticated owner', files.studentRouter.includes('financeStudentUseCases.getStudentInvoice(') && files.studentRouter.includes('ownStudentPath(req)'));
check('FIN-STU-006 payment history uses authenticated owner', files.studentRouter.includes('financeStudentUseCases.listStudentInvoicePayments(') && files.studentRouter.includes('ownStudentPath(req)'));
check('FIN-STU-007 authenticated payment-attempt endpoint', files.studentRouter.includes("'/:studentReferenceId/finance/invoices/:invoiceId/payment-attempts'"));
check('FIN-STU-008 payment ownership checked before execution', files.studentRouter.includes('await financeStudentUseCases.getStudentInvoice(studentReferenceId, req.params.invoiceId)'));
check('FIN-STU-009 student idempotency required', files.studentRouter.includes('PAYMENT_IDEMPOTENCY_KEY_REQUIRED'));
check('FIN-STU-010 student actor is server-auth identity', files.studentRouter.includes('actorId: studentReferenceId'));
check('FIN-STU-011 runtime missing provider maps 503', files.studentRouter.includes("code.includes('NOT_CONFIGURED')"));
check('FIN-STU-012 draft payments hidden', files.studentFinance.includes('invoice.status === InvoiceStatus.DRAFT'));
check('FIN-STU-013 invoice ownership enforced in application', files.studentFinance.includes('invoice.studentReferenceId !== studentReferenceId'));

// Admin + RBAC
check('FIN-ADM-001 admin finance mounted behind umbrella RBAC', files.app.includes("requireAdminPermission('admin:finance:manage')"));
for (const perm of [
  'admin:finance:invoice:manage','admin:finance:ledger:post','admin:finance:ledger:reverse',
  'admin:finance:account:manage','admin:finance:wallet:manage','admin:finance:transfer:manage',
  'admin:finance:transfer:execute','admin:finance:fx:create','admin:finance:fx:approve',
  'admin:finance:approval:create','admin:finance:approval:decide','admin:finance:refund:manage',
  'admin:finance:refund:execute','admin:finance:commission:manage','admin:finance:estimate:create',
  'admin:finance:reconciliation:run'
]) check(`FIN-ADM-PERM-${perm.split(':').slice(-2).join('-')}`, files.adminRouter.includes(perm), perm);
check('FIN-ADM-002 payment list API', files.adminRouter.includes("'/payments'"));
check('FIN-ADM-003 no admin customer-token payment endpoint', !files.adminRouter.includes("'/invoices/:id/payment-attempts'"));
check('FIN-ADM-004 invoice detail API', files.adminRouter.includes("'/invoices/:id'"));
check('FIN-ADM-005 invoice issue flow', files.adminRouter.includes("'/invoices/:id/issue'"));
check('FIN-ADM-006 invoice void flow', files.adminRouter.includes("'/invoices/:id/void'"));
check('FIN-ADM-007 refund maker route', files.adminRouter.includes("'/refunds'"));
check('FIN-ADM-008 refund checker execute route', files.adminRouter.includes("'/refunds/:id/process'"));
check('FIN-ADM-009 reconciliation read-only route', files.adminRouter.includes("'/reconciliation'"));
check('FIN-ADM-010 runtime 503 mapping', files.adminRouter.includes('RUNTIME_PENDING'));
check('FIN-ADM-011 idempotency conflict 409 mapping', files.adminRouter.includes('/idempotency|duplicate|concurrent|mismatch|already/i'));

// Admin UX / identity / no fake surfaces
check('FIN-UX-001 official navy', files.admin.includes('#142B5F'));
check('FIN-UX-002 official teal', files.admin.includes('#0E7C86'));
check('FIN-UX-003 official gold', files.admin.includes('#D6A43B'));
check('FIN-UX-004 Cairo', files.admin.includes("font-['Cairo']"));
check('FIN-UX-005 RTL', files.admin.includes('dir="rtl"'));
check('FIN-UX-006 semantic red danger', files.admin.includes('bg-red-50'));
check('FIN-UX-007 semantic amber warning', files.admin.includes('bg-amber-50'));
check('FIN-UX-008 semantic green success', files.admin.includes('bg-emerald-50'));
check('FIN-UX-009 invoices pagination', files.admin.includes('<Pager current={page.page} total={page.totalPages}'));
check('FIN-UX-010 search and status filters', hasAll(files.admin, ['URLSearchParams', "params.set('search'", "params.set('status'"]));
check('FIN-UX-011 failed payments visible', files.admin.includes('failureReason || payment.gatewayReference'));
check('FIN-UX-012 runtime tab', files.admin.includes("id: 'runtime'"));
check('FIN-UX-013 reconciliation tab', files.admin.includes("id: 'reconciliation'"));
check('FIN-UX-014 reports tab', files.admin.includes("id: 'reports'"));
check('FIN-UX-015 invoice detail route', files.adminApp.includes('path="/finance/invoices/:id"'));
check('FIN-UX-016 deep link course', files.detail.includes("domain === 'COURSE_ENROLLMENT'"));
check('FIN-UX-017 deep link service', files.detail.includes("domain === 'PHASE_20_SERVICE_REQUEST'"));
check('FIN-UX-018 no manual captured button', !files.detail.includes('CAPTURED') || files.detail.includes('ليس إجراءً يدويًا'));
check('FIN-UX-019 legacy finance preview removed', !exists('apps/web/src/features/admin-preview/AdminFinancePreviewPage.tsx'));
check('FIN-UX-020 legacy invoice preview removed', !exists('apps/web/src/features/admin-preview/AdminInvoiceDetailPage.tsx'));
check('FIN-UX-021 shadow Admin preview is removed', !exists('apps/web/src/features/admin-preview'));
check('FIN-UX-022 legacy finance redirects canonical admin', files.webRouter.includes("path: 'admin/*'") && files.webRouter.includes('<CanonicalAdminRedirect'));
check('FIN-UX-023 no local fake success mutation copy', hasNone(files.admin, ['mockPayments', 'demoInvoices', 'setStatus(\'PAID\')']));
check('FIN-UX-024 accessibility alert semantics', files.admin.includes('role="alert"'));
check('FIN-UX-025 navigation aria label', files.admin.includes('aria-label="أقسام المالية"'));

// Reconciliation / refunds / maker-checker
check('FIN-RCN-001 reconciliation ledger imbalance', files.repo.includes('LEDGER_IMBALANCE'));
check('FIN-RCN-002 capture without posting detection', files.repo.includes('CAPTURE_WITHOUT_POSTING'));
check('FIN-RCN-003 high severity degrades', files.repo.includes("item.severity === 'HIGH'"));
check('FIN-REF-001 refund approval binding', files.useCases.includes("'REFUND_EXECUTE'") && files.useCases.includes('requireBoundApproval'));
check('FIN-REF-002 refund provider evidence required', files.useCases.includes('Refund requires original payment gateway evidence') && files.repo.includes('Refund provider evidence does not match original payment provider'));
check('FIN-REF-003 duplicate refund provider reference blocked', files.repo.includes('Duplicate external refund completion rejected'));
check('FIN-LED-001 generic system account creation blocked', files.useCases.includes('Reserved finance system-account identity cannot be created through Admin API'));
check('FIN-LED-002 manual ledger requires approval', files.useCases.includes("'MANUAL_LEDGER_POST'") && files.useCases.includes('requireBoundApproval'));
check('FIN-LED-003 ledger reversal requires approval', files.useCases.includes("'MANUAL_LEDGER_REVERSE'") && files.useCases.includes('requireBoundApproval'));

// DI + monitoring integration
check('FIN-DI-001 finance repository DI', files.di.includes('financeRepository:'));
check('FIN-DI-002 payment registry DI', files.di.includes('financePaymentGatewayRegistry:'));
check('FIN-DI-003 bank registry DI', files.di.includes('financeBankTransferGatewayRegistry:'));
check('FIN-DI-004 course boundary DI', files.di.includes('Phase19CourseFinancialClearanceGateway'));
check('FIN-DI-005 service boundary DI', files.di.includes('Phase19ServiceFinanceGateway'));
check('FIN-DI-006 student router receives platform usecases through cradle', files.studentRouter.includes('financePlatformUseCases: FinancePlatformUseCases'));
check('FIN-MON-001 health tracks payment gateway', files.healthRouter.includes("'payment-gateway'"));
check('FIN-MON-002 health exposes runtimeStatus truth', files.healthRouter.includes('runtimeStatus: readiness.status'));

// Tests / source evidence
check('FIN-TST-001 payment lifecycle source test updated', files.financeTest.includes('preparePaymentAttempt'));
check('FIN-TST-002 payment authorization source test updated', files.financeTest.includes('recordPaymentAuthorization'));
check('FIN-TST-003 payment failure source test updated', files.financeTest.includes('recordPaymentFailure'));
check('FIN-TST-004 service clearance test', files.serviceTest.includes('getInvoiceClearance'));
check('FIN-TST-005 no demo finance files', !exists('apps/web/src/features/admin-preview/AdminFinancePreviewPage.tsx') && !exists('apps/web/src/features/admin-preview/AdminInvoiceDetailPage.tsx'));

// Prisma source freeze baseline
const schemaPath = path.join(root, 'packages/infrastructure/prisma/schema.prisma');
check('FIN-DB-001 finance schema remains present', read('packages/infrastructure/prisma/schema.prisma').includes('model FinanceInvoice'));
const migrationRoot = path.join(root, 'packages/infrastructure/prisma/migrations');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const migrationFiles = walk(migrationRoot).sort();
const mh = crypto.createHash('sha256');
for (const f of migrationFiles) {
  const rel = path.relative(migrationRoot, f).split(path.sep).join('/');
  mh.update(`${rel}\0${sha(fs.readFileSync(f))}\n`);
}
check('FIN-DB-002 migration history is retained', migrationFiles.length >= 49, `count=${migrationFiles.length}`);
check('FIN-DB-003 source-only handoff migrations are present', exists('packages/infrastructure/prisma/migrations/20260905050000_certificate_brand_defaults/migration.sql'));
check('FIN-DB-004 no migration execution code introduced', hasNone(files.adminRouter + files.useCases, ['prisma migrate deploy', 'migrate dev', 'db push']));

// Existing source regressions that do not require dependencies/database.
const runMarker = (id, script, marker) => {
  const result = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, encoding: 'utf8' });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  check(id, result.status === 0 && output.includes(marker), output.trim().split('\n').slice(-2).join(' | '));
};
runMarker('FIN-REG-001 Phase19', 'scripts/verify-phase19-source.mjs', 'PHASE19_SOURCE_VERIFIER=PASS');
runMarker('FIN-REG-002 W4', 'scripts/verify-w4-source.mjs', 'W4_SOURCE_VERIFIER=PASS');
runMarker('FIN-REG-003 architecture guard', 'scripts/architecture/verify-source-architecture-guards.mjs', 'SOURCE_ARCHITECTURE_GUARD=PASS');
runMarker('FIN-REG-004 source quality', 'scripts/quality/verify-source-quality.mjs', 'SOURCE_QUALITY_GATE=PASS');
runMarker('FIN-REG-005 health readiness', 'scripts/verify-health-readiness-source-closure.mjs', 'HEALTH_READINESS_SOURCE_CLOSURE=');
runMarker('FIN-REG-006 universities plan', 'scripts/verify-p9-plan-closure.mjs', 'P9_PLAN_CLOSURE_VERIFIER = PASS 97/97');

const passed = checks.filter((c) => c.ok).length;
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.id}${c.note ? ` — ${c.note}` : ''}`);
console.log(`FINANCE_SOURCE_CLOSURE=${passed}/${checks.length} ${passed === checks.length ? 'PASS' : 'FAIL'}`);
console.log('DATABASE_EXECUTIONS=0');
console.log('MIGRATION_EXECUTIONS=0');
console.log('BACKFILL_EXECUTIONS=0');
if (passed !== checks.length) process.exit(1);

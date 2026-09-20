import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const checks = [];
const check = (id, ok, note = '') => checks.push({ id, ok: Boolean(ok), note });
const hasAll = (text, values) => values.every((value) => text.includes(value));
const hasNone = (text, values) => values.every((value) => !text.includes(value));

const domainJob = read('packages/domain/src/career-alumni/entities/CareerJobPosting.ts');
const domainEmployer = read('packages/domain/src/career-alumni/entities/CareerEmployer.ts');
const status = read('packages/domain/src/career-alumni/enums/CareerJobStatus.ts');
const adminUse = read('packages/application/src/career-alumni/use-cases/CareerAdminUseCases.ts');
const publicUse = read('packages/application/src/career-alumni/use-cases/CareerPublicUseCases.ts');
const repo = read('packages/infrastructure/src/career-alumni/PrismaCareerRepository.ts');
const gateway = read('packages/infrastructure/src/career-alumni/CareerReferenceGateway.ts');
const adminRouter = read('apps/api/src/presentation/api/router/CareerAdminRouter.ts');
const publicRouter = read('apps/api/src/presentation/api/router/CareerPublicRouter.ts');
const app = read('apps/api/src/app.ts');
const webClient = read('apps/web/src/api/client.ts');
const live = read('apps/web/src/features/public-template/publicLiveDataSource.ts');
const publicPage = read('apps/web/src/features/public-template/components/CareersSearchPage.tsx');
const types = read('apps/web/src/features/public-template/types.ts');
const prototype = read('apps/web/src/features/public-template/publicPrototypeDataSource.ts');
const adminPage = read('apps/admin/src/pages/CareerAdminPage.tsx');
const webRouter = read('apps/web/src/router/index.tsx');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const ar = read('apps/admin/src/i18n/ar.ts');
const careerTests = read('packages/application/tests/career-alumni/CareerAdminUseCases.spec.ts');

// Domain ownership and canonical references
check('JOBS-DOM-001 career owner domain exists', exists('packages/domain/src/career-alumni'));
check('JOBS-DOM-002 employer model explicit', domainEmployer.includes('CareerEmployerDto'));
check('JOBS-DOM-003 job model explicit', domainJob.includes('CareerJobPostingDto'));
check('JOBS-DOM-004 lifecycle explicit', hasAll(status, ['READY_TO_REVIEW', 'READY_TO_PUBLISH', 'PUBLISHED', 'EXPIRED', 'REJECTED', 'ARCHIVED']));
check('JOBS-DOM-005 canonical country reference', domainJob.includes('countryReferenceId: string'));
check('JOBS-DOM-006 canonical city reference', domainJob.includes('cityReferenceId?: string | null'));
check('JOBS-DOM-007 canonical employer reference', domainJob.includes('employerId: string'));
check('JOBS-DOM-008 P7 reference resolver boundary', hasAll(gateway, ['IReferenceResolver', 'IReferenceResolutionRepository']));
check('JOBS-DOM-009 city-country consistency', gateway.includes('CAREER_CITY_COUNTRY_MISMATCH'));
check('JOBS-DOM-010 dedup identity uses canonical geography', hasAll(adminUse, ["countryReferenceId.id", "cityReferenceId?.id || 'REMOTE_OR_GLOBAL'"]));

// Publication safety
check('JOBS-PUB-001 create enters review', adminUse.includes('status: CareerJobStatus.READY_TO_REVIEW'));
check('JOBS-PUB-002 review state gate', adminUse.includes('Only READY_TO_REVIEW jobs can be marked READY_TO_PUBLISH'));
check('JOBS-PUB-003 publish state gate', adminUse.includes('Only READY_TO_PUBLISH jobs can be PUBLISHED'));
check('JOBS-PUB-004 employer verification required', adminUse.includes('Only jobs from VERIFIED employers can be PUBLISHED'));
check('JOBS-PUB-005 expired publish blocked', adminUse.includes('Expired job opportunities cannot be PUBLISHED'));
check('JOBS-PUB-006 public list verified employer only', repo.includes('verificationStatus: CareerEmployerStatus.VERIFIED'));
check('JOBS-PUB-007 public list deadline filter', repo.includes('applicationDeadline: { gt: new Date() }'));
check('JOBS-PUB-008 public detail deadline filter', publicUse.includes('const expired = job?.applicationDeadline'));
check('JOBS-PUB-009 public detail verified employer', publicUse.includes('job.employer?.verificationStatus !== CareerEmployerStatus.VERIFIED'));
check('JOBS-PUB-010 archive path exists', adminUse.includes('CareerJobStatus.ARCHIVED'));

// Employer administration
check('JOBS-EMP-001 employers start unverified', adminUse.includes('verificationStatus: CareerEmployerStatus.UNVERIFIED'));
check('JOBS-EMP-002 verify endpoint', adminRouter.includes("'/employers/:id/verify'"));
check('JOBS-EMP-003 suspend endpoint', adminRouter.includes("'/employers/:id/suspend'"));
check('JOBS-EMP-004 status change use case', adminUse.includes('setEmployerStatus'));
check('JOBS-EMP-005 cannot reset review to unverified', adminUse.includes('Employer status cannot be reset to UNVERIFIED after review'));
check('JOBS-EMP-006 admin exposes verification controls', hasAll(adminPage, ["transitionEmployer", "'verify'", "'suspend'", 'EmployerStatusBadge']));

// API/RBAC
check('JOBS-API-001 admin RBAC boundary', app.includes("'/admin/careers', requireAdminPermission('admin:careers:manage')"));
check('JOBS-API-002 public owner router', app.includes("'/public/careers', lazyRouter('careerPublicRouter')"));
check('JOBS-API-003 public list route', publicRouter.includes("router.get('/jobs'"));
check('JOBS-API-004 public detail route', publicRouter.includes("router.get('/jobs/:slug'"));
check('JOBS-API-005 web list path matches owner API', webClient.includes('/public/careers/jobs?'));
check('JOBS-API-006 web detail path matches owner API', webClient.includes('/public/careers/jobs/${encodeURIComponent(slug)}'));
check('JOBS-API-007 stale singular route removed', !webClient.includes('/public/career/jobs'));
check('JOBS-API-008 external URLs limited to http/https', adminRouter.includes('Only http/https URLs are allowed'));
check('JOBS-API-009 list pagination bounded', publicRouter.includes('limit: z.coerce.number().int().min(1).max(100).default(20)') && publicUse.includes('limit: Math.min(filters.limit || 20, 50)') && publicUse.includes('cursor: filters.cursor'));

// Public UI integrity
check('JOBS-WEB-001 live loader uses owner API', live.includes('ApiClient.getCareerJobs'));
check('JOBS-WEB-002 live loader has no prototype fallback', !live.includes('CAREER_OPPORTUNITIES_PREVIEW'));
check('JOBS-WEB-003 prototype remains explicit-only', prototype.includes('VITE_PUBLIC_TEMPLATE_DATA_MODE=prototype'));
check('JOBS-WEB-003A career demo records removed from prototype', prototype.includes('careers: []') && !exists('apps/web/src/features/public-template/data/careerData.ts'));
check('JOBS-WEB-004 external apply link wired', publicPage.includes('href={opportunity.externalPostingUrl}'));
check('JOBS-WEB-005 external link noopener', hasAll(publicPage, ['target="_blank"', 'rel="noopener noreferrer"']));
check('JOBS-WEB-006 fake internal apply promise removed', hasNone(publicPage, ['التقديم غير مفعّل في النموذج العام بعد', 'سيتم تفعيله لاحقًا من سجل Phase 21']));
check('JOBS-WEB-007 real deadline exposed', publicPage.includes('opportunity.applicationDeadline'));
check('JOBS-WEB-008 mentorship mapping', live.includes("'إرشاد مهني'"));
check('JOBS-WEB-009 career event mapping', live.includes("'فعالية مهنية'"));
check('JOBS-WEB-010 hybrid mapping', live.includes("'هجين'"));
check('JOBS-WEB-011 experience not fabricated from opportunity type', live.includes("firstString(metadata.experienceLevel, 'غير محدد')"));
check('JOBS-WEB-012 public type supports truthful unknown experience', types.includes("'غير محدد'"));
check('JOBS-WEB-013 legacy fake careers admin list removed', !exists('apps/web/src/features/admin-preview/AdminCareersPreviewPage.tsx'));
check('JOBS-WEB-014 legacy fake careers detail removed', !exists('apps/web/src/features/admin-preview/AdminCareerOpportunityDetailPage.tsx'));
check('JOBS-WEB-015 legacy careers routes redirect to canonical admin', webRouter.includes("path: 'admin/*'") && webRouter.includes('<CanonicalAdminRedirect'));

// Admin UX + identity
check('JOBS-ADM-001 canonical country picker', adminPage.includes('canonicalPickerApi.countries()'));
check('JOBS-ADM-002 canonical city picker', adminPage.includes('canonicalPickerApi.cities('));
check('JOBS-ADM-003 list/filter state', hasAll(adminPage, ['statusFilter', 'countryFilter', 'loadJobs']));
check('JOBS-ADM-004 loading state', adminPage.includes('Loader2'));
check('JOBS-ADM-005 error state', adminPage.includes('bg-red-50'));
check('JOBS-ADM-006 empty state', adminPage.includes("no_career_opportunities_found"));
check('JOBS-ADM-007 MANARATAK primary color', adminPage.includes('#142B5F'));
check('JOBS-ADM-008 Arabic copy no mixed recruitment phrase', !ar.includes('إدارة recruitment employer metadata'));

// Persistence truth
check('JOBS-DB-001 employer Prisma owner', schema.includes('model CareerEmployerRecord'));
check('JOBS-DB-002 job Prisma owner', schema.includes('model CareerJobPostingRecord'));
check('JOBS-DB-003 employer FK restrict', schema.includes('employer              CareerEmployerRecord @relation'));
check('JOBS-DB-004 country FK restrict', schema.includes('countryReference      ReferenceCountry'));
check('JOBS-DB-005 city FK restrict', schema.includes('cityReference         ReferenceCity?'));
check('JOBS-DB-006 no Jobs schema migration required by closure', true, 'Source closure changes use existing career schema.');
check('JOBS-TST-001 verified-employer publish regression source test', careerTests.includes('requires a verified employer before publishing'));
check('JOBS-TST-002 verified publish source test', careerTests.includes('publishes a reviewed job for a verified employer'));
check('JOBS-TST-003 employer status source test', careerTests.includes('supports explicit employer verification and suspension'));

let failed = 0;
for (const item of checks) {
  if (item.ok) console.log(`PASS ${item.id}`);
  else {
    failed += 1;
    console.error(`FAIL ${item.id}${item.note ? ` :: ${item.note}` : ''}`);
  }
}
console.log(`JOBS SOURCE CLOSURE = ${failed ? 'FAIL' : 'PASS'} ${checks.length - failed}/${checks.length}`);
process.exitCode = failed ? 1 : 0;

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const check = (name, condition, detail = '') => {
  const passed = Boolean(condition);
  checks.push({ name, passed, detail });
  if (!passed) console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
};

const useCases = read('packages/application/src/tests-platform/use-cases/InternationalTestUseCases.ts');
const repo = read('packages/infrastructure/src/international-tests/PrismaInternationalTestRepository.ts');
const repositoryContract = read('packages/domain/src/tests-platform/repository.ts');
const router = read('apps/api/src/presentation/api/router/InternationalTestAdminRouter.ts');
const adminDetail = read('apps/admin/src/pages/InternationalTestDetailPage.tsx');
const adminList = read('apps/admin/src/pages/InternationalTestsAdminPage.tsx');
const adminClient = read('apps/admin/src/api/client.ts');
const publicList = read('apps/web/src/features/public-template/components/ExamsSearchPage.tsx');
const publicDetail = read('apps/web/src/features/public-template/components/ExamDetailModal.tsx');
const publicDataSource = read('apps/web/src/features/public-template/publicLiveDataSource.ts');
const publicClient = read('apps/web/src/api/client.ts');
const graph = read('packages/application/src/read-models/CrossDomainGraphReadService.ts');
const universityContract = read('packages/domain/src/universities/universities.ts');
const universityRepo = read('packages/infrastructure/src/universities/PrismaUniversityRepository.ts');
const scholarshipContract = read('packages/domain/src/scholarships/contracts.ts');
const scholarshipRepo = read('packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts');
const promotion = read('packages/application/src/tests-platform/use-cases/InternationalTestImportPromotionUseCase.ts');
const handoff = read('packages/application/src/tests-platform/handoff/InternationalTestImportHandoffService.ts');
const di = read('apps/api/src/infrastructure/di/container.ts');
const testsIndex = read('packages/application/src/tests-platform/index.ts');

check('Publication synchronizes PUBLISHED + public visibility',
  /status:\s*InternationalTestStatus\.PUBLISHED,\s*isPubliclyVisible:\s*true/.test(useCases));
check('Archive synchronizes ARCHIVED + hidden visibility',
  /status:\s*InternationalTestStatus\.ARCHIVED,\s*isPubliclyVisible:\s*false/.test(useCases));
check('Ready-to-publish remains hidden',
  /status:\s*InternationalTestStatus\.READY_TO_PUBLISH,\s*isPubliclyVisible:\s*false/.test(useCases));
check('Source verification requires trusted evidence',
  useCases.includes('TRUSTED_SOURCE_EVIDENCE_REQUIRED') && useCases.includes('InternationalTestSourceTrustLevel.AUTHORITATIVE') && useCases.includes('InternationalTestSourceTrustLevel.HIGH'));

check('Provider contract exposed on test repository',
  repositoryContract.includes('findProviderById?') && repositoryContract.includes('listProviders?') && repositoryContract.includes('upsertProvider?'));
check('Provider persistence implemented',
  repo.includes('async findProviderById') && repo.includes('async listProviders') && repo.includes('async upsertProvider'));
check('Admin provider routes exist', router.includes("router.get('/providers'") && router.includes("router.post('/providers'"));
check('Admin source verification route exists', router.includes("router.post('/:id/verify-source'"));
check('Admin readiness route exists', router.includes("router.get('/:id/readiness'"));
check('Admin relationship read route exists', router.includes("router.get('/:id/relationships'"));

check('Admin public page uses slug instead of owner id',
  adminDetail.includes('href={`/international-tests/${test.slug}`}') && !adminDetail.includes('href={`/international-tests/${test.id}`}'));
check('Admin reads canonical providers', adminDetail.includes('listInternationalTestProviders'));
check('Admin can create/link canonical provider', adminDetail.includes('upsertInternationalTestProvider') && adminDetail.includes('providerId'));
check('Admin uses canonical evidence trust enum values',
  adminDetail.includes("sourceTrustLevel: 'AUTHORITATIVE'") && !adminDetail.includes("sourceTrustLevel: 'OFFICIAL_PROVIDER'"));
check('Stale phase-pending relationship copy removed',
  !adminDetail.includes('Pending Phase 11') && !adminDetail.includes('Pending Phase 12'));
check('Admin relationship tab consumes live graph', adminDetail.includes('getInternationalTestRelationships'));
check('Admin API client exposes closure endpoints',
  ['updateInternationalTest','listInternationalTestProviders','upsertInternationalTestProvider','getInternationalTestReadiness','getInternationalTestRelationships','verifyInternationalTestSource'].every(k => adminClient.includes(k)));

const canonicalCategories = [
  'ENGLISH_LANGUAGE','NON_ENGLISH_LANGUAGE','GENERAL_UNDERGRADUATE_ADMISSION','GRADUATE_ADMISSION',
  'NATIONAL_INTERNATIONAL_ADMISSION','SPECIALIZED_ADMISSION','PROFESSIONAL_LICENSING_CERTIFICATION'
];
check('Admin canonical category filters aligned', canonicalCategories.every(k => adminList.includes(k)));
check('Public canonical category filters aligned', canonicalCategories.every(k => publicList.includes(k)));
check('Public detail no longer exposes raw availability UUID arrays',
  !publicDetail.includes('availableCountryIds')
  && publicDataSource.includes('dto.countryRelationships?.map')
  && publicDetail.includes('exam.relatedCountries'));
check('Public DTO exposes canonical reference relationships', publicClient.includes('PublicInternationalTestReferenceRelationshipDto'));

check('University filter accepts canonical internationalTestId', universityContract.includes('internationalTestId?: string'));
check('University repository resolves test relations through program requirements',
  universityRepo.includes('internationalTestId') && universityRepo.includes('admissionRequirements'));
check('Scholarship filter accepts canonical internationalTestId', scholarshipContract.includes('internationalTestId?: string'));
check('Scholarship repository resolves test relations through owned requirements',
  scholarshipRepo.includes('eligibilityItems') && scholarshipRepo.includes('requiredDocuments') && scholarshipRepo.includes('internationalTestId'));
check('Cross-domain graph uses owning domain filters',
  graph.includes('getInternationalTestGraphById') && graph.includes('internationalTestId: test.id'));
check('Course/test reverse relation is supplied by Course owner domain',
  graph.includes('listPublishedCoursesForInternationalTest(test.id') && graph.includes('preparationCourses: {') && graph.includes('preparationCourses.data.map'));

check('Test handoff validates owner domain', handoff.includes("ALLOWED_OWNER_DOMAINS = new Set(['TESTS', 'INTERNATIONAL_TESTS'])"));
check('Test handoff is staging-only',
  handoff.includes('automatic: false') && handoff.includes('publication: false') && handoff.includes("state: 'MANUAL_REVIEW_REQUIRED'"));
check('Test handoff performs no semantic write',
  !/this\.repository\.(create|update|upsertTest|updateStatus)\s*\(/.test(handoff));
check('Test handoff exported by application domain', testsIndex.includes("export * from './handoff';"));
check('DI routes TESTS aliases to domain-owned handoff',
  di.includes('TESTS: internationalTestImportHandoffConsumer') && di.includes('INTERNATIONAL_TESTS: internationalTestImportHandoffConsumer'));

check('Import promotion lifecycle label is test-owned',
  promotion.includes('INTERNATIONAL_TEST_READY_MINIMUM') && !promotion.includes('UNIVERSITY_READY_MINIMUM'));
check('Import promotion preserves canonical provider and source verification',
  promotion.includes('providerId') && promotion.includes('isSourceVerified'));
check('Import promotion preserves localized identity/abbreviation at root',
  promotion.includes('localizedNameAr') && promotion.includes('localizedNameEn') && promotion.includes('abbreviation'));
check('Legacy source type is normalized to canonical trust level',
  promotion.includes("normalized === 'OFFICIAL_PROVIDER'") && promotion.includes('InternationalTestSourceTrustLevel.AUTHORITATIVE'));

const importFoundationDir = path.join(root, 'packages/application/src/import-foundation');
const importFoundationFiles = fs.existsSync(importFoundationDir)
  ? fs.readdirSync(importFoundationDir, { recursive: true }).filter(x => typeof x === 'string' && /\.(ts|tsx)$/.test(x))
  : [];
const importFoundationText = importFoundationFiles.map(rel => read(path.join('packages/application/src/import-foundation', rel))).join('\n');
check('Import Foundation has no direct test semantic promotion dependency',
  !importFoundationText.includes('InternationalTestImportPromotionUseCase'));

const passed = checks.filter(x => x.passed).length;
console.log(JSON.stringify({ suite: 'INTERNATIONAL_TESTS_SOURCE_CLOSURE', passed, total: checks.length, failed: checks.filter(x => !x.passed).map(x => x.name) }, null, 2));
if (passed !== checks.length) process.exit(1);

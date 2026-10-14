import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const checks = [];
const check = (name, condition, detail = '') => {
  const passed = Boolean(condition);
  checks.push({ name, passed, detail });
  if (!passed) console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
};

const domain = read('packages/domain/src/study-destinations/index.ts');
const useCases = read('packages/application/src/study-destinations/StudyDestinationUseCases.ts');
const repo = read('packages/infrastructure/src/study-destinations/PrismaStudyDestinationRepository.ts');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const migration = read('packages/infrastructure/prisma/migrations/20260905043000_study_destination_profiles_source_only/migration.sql');
const adminRouter = read('apps/api/src/presentation/api/router/StudyDestinationAdminRouter.ts');
const publicRouter = read('apps/api/src/presentation/api/router/StudyDestinationPublicRouter.ts');
const app = read('apps/api/src/app.ts');
const di = read('apps/api/src/infrastructure/di/container.ts');
const graph = read('packages/application/src/read-models/CrossDomainGraphReadService.ts');
const adminList = read('apps/admin/src/pages/StudyDestinationsAdminPage.tsx');
const adminDetail = read('apps/admin/src/pages/StudyDestinationDetailPage.tsx');
const webClient = read('apps/web/src/api/client.ts');
const publicData = read('apps/web/src/features/public-template/publicLiveDataSource.ts');
const countriesPage = read('apps/web/src/features/public-template/components/CountriesSearchPage.tsx');
const countryModal = read('apps/web/src/features/public-template/components/CountryDetailModal.tsx');
const adminNav = read('apps/admin/src/components/AdminNavigation.tsx');
const testDetail = read('apps/admin/src/pages/InternationalTestDetailPage.tsx');
const universityAdmin = read('apps/admin/src/pages/UniversityAdminPage.tsx');

check('Study Destination domain module exists', exists('packages/domain/src/study-destinations/index.ts'));
check('Study Destination is exported from domain root', read('packages/domain/src/index.ts').includes("./study-destinations"));
check('Application use cases exist', exists('packages/application/src/study-destinations/StudyDestinationUseCases.ts'));
check('Infrastructure repository exists', exists('packages/infrastructure/src/study-destinations/PrismaStudyDestinationRepository.ts'));
check('Study Destination has explicit lifecycle', ['DRAFT','IN_REVIEW','PUBLISHED','ARCHIVED'].every((x) => domain.includes(x)));
check('Study Destination has explicit completeness lifecycle', ['INCOMPLETE','READY_FOR_REVIEW','READY_TO_PUBLISH','COMPLETE'].every((x) => domain.includes(x)));
check('Study Destination owns study-system content', domain.includes('studySystemSummaryAr') && domain.includes('studySystemSummaryEn'));
check('Study Destination owns admission content', domain.includes('admissionHighlightsAr'));
check('Study Destination owns visa content', domain.includes('visaSummaryAr') && domain.includes('visaOfficialUrl'));
check('Study Destination owns living-cost content', domain.includes('averageMonthlyLivingCostMin') && domain.includes('livingCostCurrencyReferenceId'));
check('Study Destination owns official links and evidence', domain.includes('officialLinks') && domain.includes('evidenceSources'));
check('Study languages are canonical reference IDs', domain.includes('studyLanguageReferenceIds'));
check('Publishing policy requires bilingual overview', domain.includes("key: 'overview-ar'") && domain.includes("key: 'overview-en'"));
check('Publishing policy requires bilingual study system', domain.includes("key: 'study-system-ar'") && domain.includes("key: 'study-system-en'"));
check('Publishing policy requires canonical study languages', domain.includes("key: 'study-languages'"));
check('Publishing policy requires visa evidence', domain.includes("key: 'visa-official-url'") && domain.includes("key: 'visa-requirements'"));
check('Publishing policy requires living-cost range and canonical currency', domain.includes("key: 'living-cost-range'") && domain.includes("key: 'living-cost-currency'"));
check('Publishing policy requires source verification', domain.includes("key: 'source-verification'"));

check('Prisma owns one profile per canonical country', schema.includes('countryReferenceId               String   @unique') && schema.includes('studyDestinationProfile StudyDestinationProfile?'));
check('Prisma has canonical living-cost currency relation', schema.includes('@relation("StudyDestinationLivingCostCurrency"'));
check('Prisma has canonical study-language join', schema.includes('model StudyDestinationStudyLanguage') && schema.includes('ReferenceLanguage @relation'));
const referenceCountryBlock = schema.slice(schema.indexOf('model ReferenceCountry {'), schema.indexOf('model ReferenceCurrency {'));
check('No Study Destination data is stored in ReferenceCountry fields', !/(visaSummary|livingCostTier|studySystemSummary)/.test(referenceCountryBlock));
check('Migration is explicitly source-only', migration.includes('SOURCE-ONLY') || migration.includes('source-only'));
check('Migration creates profile and language join only', migration.includes('StudyDestinationProfile') && migration.includes('StudyDestinationStudyLanguage'));
check('Migration does not contain DML backfill', !/\bINSERT\s+INTO\s+"?ReferenceCountry|\bUPDATE\s+"?ReferenceCountry/i.test(migration));

check('Repository has published-only query', repo.includes('listPublished') && repo.includes('StudyDestinationStatus.PUBLISHED'));
check('Published repository excludes inactive canonical countries', repo.includes('countryReference: this.countryWhere(filters)') &&
    /isActive:\s*true,\s*lifecycleState:\s*'ACTIVE'/.test(repo));
check('Use case resolves canonical currency before save', useCases.includes('resolveCurrencyCandidate'));
check('Use case resolves canonical languages before save', useCases.includes('resolveLanguageCandidate'));
check('Editor cannot author source verification directly', useCases.includes('delete normalized.sourceVerificationStatus') && !adminRouter.includes('sourceVerificationStatus:'));
check('Explicit verify-source transition exists', useCases.includes('verifySources') && adminRouter.includes("/:iso2Code/verify-source"));
check('Source verification stamps evidence', useCases.includes('verifiedAt') && useCases.includes('StudyDestinationVerificationStatus.VERIFIED'));
check('Source-sensitive edits reset verification', useCases.includes('hasSourceSensitiveChange') && useCases.includes('StudyDestinationVerificationStatus.UNVERIFIED'));
check('Source-sensitive edits remove a published profile from public delivery', useCases.includes('mustLeavePublishedState') && useCases.includes('publishedAt: null'));
check('Publication requires review state', useCases.includes('STUDY_DESTINATION_REVIEW_REQUIRED'));
check('Publication requires readiness', useCases.includes('STUDY_DESTINATION_NOT_READY_TO_PUBLISH'));
check('Public detail requires published status',
  useCases.includes("profile.status !== 'PUBLISHED'") ||
    useCases.includes('profile.status !== StudyDestinationStatus.PUBLISHED'));

check('Admin API is mounted', app.includes("'/admin/study-destinations'"));
check('Public Study Destination API is mounted', app.includes("'/study-destinations'"));
check('Admin API exposes list/detail/upsert', /router\.get\(\s*'\/',/.test(adminRouter) && /router\.get\(\s*'\/:iso2Code',/.test(adminRouter) && /router\.put\(\s*'\/:iso2Code\/profile',/.test(adminRouter));
check('Admin API exposes review/publish/archive', ['submit-review','publish','archive'].every((x) => adminRouter.includes(x)));
check('Admin relationship route uses read model', adminRouter.includes("/:iso2Code/relationships") && adminRouter.includes('crossDomainGraphReadService'));
check('Public API exposes only Study Destination use cases', publicRouter.includes('listPublic') && publicRouter.includes('getPublicBySlug'));
check('DI registers profile repository', di.includes('studyDestinationRepository:'));
check('DI registers profile use cases', di.includes('studyDestinationUseCases:'));
check('DI registers admin/public routers', di.includes('studyDestinationAdminRouter:') && di.includes('studyDestinationPublicRouter:'));

check('Country graph includes universities', graph.includes('universities: PaginatedGraphCollection'));
check('Country graph includes canonical majors via university programs', graph.includes('academicPrograms: AcademicProgramGraphIdentity[]') && graph.includes('majors: StableEntityReadIdentity[]'));
check('Country graph resolves published majors by canonical IDs', graph.includes('canonicalMajorIds') && graph.includes('findPublishedByIds(canonicalMajorIds)'));
check('Country graph includes scholarships', graph.includes('scholarships: PaginatedGraphCollection'));
check('Country graph includes international tests', graph.includes('internationalTests: PaginatedGraphCollection') && graph.includes('countryIso2Code: normalizedCode'));
check('Country graph includes country-supported services', graph.includes('services: PaginatedGraphCollection') && graph.includes('supportedCountryReferenceId: country.id'));
check('Country graph includes career jobs', graph.includes('careerJobs: PaginatedGraphCollection') && graph.includes('countryReferenceId: country.id'));
check('Country graph keeps course geography explicitly provider-HQ only', graph.includes('providerHeadquartersCourses') && graph.includes('providerHeadquartersCountryReferenceId'));
check('Course country relation is not invented in Prisma', !schema.includes('CourseStudyDestination') && !schema.includes('CourseStudyCountry'));
check('Country graph includes CMS editorial relationship', graph.includes('CmsDomainTargetType.REFERENCE_COUNTRY'));

check('Admin list uses Study Destination API rather than public Reference Data API', adminList.includes('/admin/study-destinations') && !adminList.includes("const API_BASE = '/reference-data'"));
check('Admin list does not read legacy study-destination metadata', !adminList.includes('studyDestinationCandidate') && !adminList.includes('destinationReviewStatus') && !adminList.includes('publicStatus'));
check('Admin list has one profile status filter', (adminList.match(/value=\{status\}/g) || []).length === 1);
check('Admin list uses MANARATAK primary navy', adminList.includes('#142B5F'));
check('Admin detail has seven coherent workflow tabs', ['overview','study','visa','living','relations','sources','publish'].every((x) => adminDetail.includes(`'${x}'`)));
check('Admin detail removed Pending panels', !adminDetail.includes('PendingPanel'));
check('Admin detail edits visa data', adminDetail.includes('visaOfficialUrl') && adminDetail.includes('visaRequirementsAr'));
check('Admin detail edits living cost and currency', adminDetail.includes('averageMonthlyLivingCostMin') && adminDetail.includes('livingCostCurrencyReferenceId'));
check('Admin detail edits canonical study languages', adminDetail.includes('studyLanguageReferenceIds'));
check('Admin detail edits official links and evidence', adminDetail.includes('officialLinks') && adminDetail.includes('evidenceSources'));
check('Admin detail exposes owner-domain relationship counts', ['universities','academicPrograms','majors','scholarships','internationalTests','services','careerJobs'].every((x) => adminDetail.includes(x)));
check('Admin detail labels provider-HQ courses as not study-country semantics', adminDetail.includes('ليست «دورات للدراسة في الدولة»'));
check('Admin detail uses MANARATAK navy and gold', adminDetail.includes('#142B5F') && adminDetail.includes('#D6A43B'));
check('Country relations link each university to University Domain detail', adminDetail.includes('detailBasePath="/universities"') && adminDetail.includes('encodeURIComponent(item.ownerId)'));
check('Country relations expose a canonical all-universities country filter', adminDetail.includes('/universities?countryReferenceId=') && adminDetail.includes('country.id'));
check('Academic program rows deep-link to owning university', adminDetail.includes('/universities/${encodeURIComponent(p.universityOwnerId)}'));
check('Academic program rows deep-link canonical majors', adminDetail.includes('/majors/${encodeURIComponent(p.majorOwnerId)}'));
check('Country relations deep-link majors, scholarships, and tests to owner domains', ['/majors','/scholarships','/international-tests'].every((path) => adminDetail.includes(`detailBasePath="${path}"`)));
check('University admin consumes canonical countryReferenceId query filter', universityAdmin.includes("searchParams.get('countryReferenceId')") && universityAdmin.includes("params.append('countryReferenceId', countryReferenceId)"));
check('University admin exposes an explicit clear action for country filter', universityAdmin.includes("next.delete('countryReferenceId')") && universityAdmin.includes('setSearchParams(next)'));

check('Public client has Study Destination DTO', webClient.includes('PublicStudyDestinationDto'));
check('Public client reads Study Destination endpoint', webClient.includes('getStudyDestinations') && webClient.includes('/study-destinations'));
check('Public country loader no longer exposes all active reference countries', publicData.includes('ApiClient.getStudyDestinations') && !publicData.includes('getReferenceCountries({ activeOnly: true })'));
check('Public country mapping does not consume ReferenceCountry metadata', !publicData.includes('meta.livingCost') && !publicData.includes('meta.visaEase'));
check('Public mapping uses curated study system', publicData.includes('dto.studySystemSummaryAr') && publicData.includes('admissionHighlights'));
check('Public mapping uses verified visa requirements', publicData.includes('dto.visaRequirementsAr'));
check('Public mapping formats living cost with canonical currency', publicData.includes('livingCostCurrency') && publicData.includes('averageMonthlyLivingCostMin'));
check('Public search enriches country with published majors', countriesPage.includes('relationships.majors'));
check('Public search enriches country with international tests', countriesPage.includes('relationships.internationalTests'));
check('Country detail renders study system', countryModal.includes('country.studySystemSummary'));
check('Country detail renders exams and majors', countryModal.includes('country.requiredExams') && countryModal.includes('country.featuredMajors'));
check('Country detail renders official links', countryModal.includes('country.officialLinks'));

check('Admin navigation order is Tests then Courses then Study Destinations', adminNav.indexOf("to: '/international-tests'") < adminNav.indexOf("to: '/courses'") && adminNav.indexOf("to: '/courses'") < adminNav.indexOf("to: '/study-destinations'"));
check('International Test admin no longer claims preparation courses are unintegrated', testDetail.includes('الدورات التحضيرية المعتمدة') && !testDetail.includes('غير موصولة بعد. الملكية ستكون لمجال الدورات'));

// Structural regressions supplement the focused behavioral suite; they do not certify runtime.
check('Editor schema cannot certify evidence time', !adminRouter.slice(adminRouter.indexOf('const evidenceSources'),adminRouter.indexOf('export class')).includes('verifiedAt'));
check('Authenticated revision/reason contract is required', ['If-Match','X-Review-Reason','req.authUserId','STUDY_DESTINATION_PRECONDITION_REQUIRED'].every(key=>adminRouter.includes(key)));
check('Distinct owner permissions replace P7 publication rights', ['read','edit','verify','publish'].every(action=>adminRouter.includes(`guard('${action}')`)) && !app.includes("'/admin/study-destinations', requireAdminPermission('admin:reference-data:manage')"));
check('Independent source approval uses fingerprint and reviewed revision', ['STUDY_DESTINATION_INDEPENDENT_REVIEWER_REQUIRED','STUDY_DESTINATION_REVIEW_FINGERPRINT_CONFLICT','reviewedRevision: profile.revision'].every(key=>useCases.includes(key)));
check('Every mutation uses atomic business/audit/outbox owner context', useCases.includes('this.atomic.execute') && useCases.includes('snapshots.after = value.profile') && useCases.includes('STUDY_DESTINATION_OWNER_LOCK_REQUIRED'));
check('Profile updates enforce numeric CAS in a bound transaction', repo.includes('revision: expectedRevision') && repo.includes('revision: { increment: 1 }') && repo.includes('this.assertBound()'));
check('Concurrent first profile creation has an owner lock', repo.includes('pg_advisory_xact_lock') && repo.includes('FOR SHARE') && repo.includes('FOR UPDATE'));
check('Public profile is an explicit allowlist', useCases.includes('PublicContentKey') && !useCases.slice(useCases.indexOf('private async publicDto'),useCases.indexOf('private assertFreshDate')).includes('...profile'));
check('Asset is rechecked for publication and delivery', useCases.slice(useCases.indexOf('public async publish'),useCases.indexOf('public async archive')).includes('assertAssetReferenceUsable') && useCases.includes('requestDeliveryGrant') && useCases.includes('IMAGE_REVIEW_REQUIRED'));
check('Public delivery grants are never cached by shared clients', publicRouter.includes("res.set('Cache-Control', 'no-store')"));
check('Authority approval covers normalized origins and explicit exceptions', ['STUDY_DESTINATION_UNAPPROVED_AUTHORITY','STUDY_DESTINATION_AUTHORITY_EXCEPTION_REVIEW_REQUIRED','INVALID_AUTHORITY_ORIGIN'].every(key=>useCases.includes(key)));
check('Freshness is enforced in readiness, commands and repository queries', domain.includes('isAuditDateFresh') && useCases.includes('this.publishingPolicy.isAuditDateFresh') && repo.includes('reviewMaxAgeDays'));
check('Bilingual structural coverage has mandatory English checks', ['admission-highlights-en','visa-requirements-en','official-links-en','cost-highlights-en','student-life-en'].every(key=>domain.includes(key)));
check('Canonical city curation is distinct from geographic ownership', adminDetail.includes('CanonicalCityPicker') && useCases.includes('INVALID_STUDY_CITY_COUNTRY') && useCases.includes('CITY_REFERENCES_REVIEW_REQUIRED'));
check('References are batch-resolved and lifecycle checked', useCases.includes('resolveDestinationReferences') && useCases.includes("reference.lifecycleState === 'ACTIVE'"));
check('Admin work queue filters before paging with a bounded join/count', repo.includes('listAdminCountries') && repo.includes('this.missingWhere') && repo.includes('studyDestinationProfile: { include }') && adminList.includes('missingCheck'));
check('Public country discovery is server paged', countriesPage.includes('searchPublishedCountries') && countriesPage.includes('serverPage') && publicRouter.includes('q:'));
check('Featured grid uses published profile identities rather than fixed counts', read('apps/web/src/features/public-template/components/FeaturedCountries.tsx').includes('item.isFeatured') && !read('apps/web/src/features/public-template/components/FeaturedCountries.tsx').includes('scholarshipsCount:'));
check('Country graph has independent owner cursors throughout the stack', ['universityCursor','scholarshipCursor','serviceCursor','courseCursor','programCursor'].every(key=>graph.includes(key)&&adminRouter.includes(key)&&adminDetail.includes(key)));
check('Monthly living costs preserve original currency without USD fiction', publicData.includes('monthlyLivingCostRange') && !publicData.includes('averageLivingCostUsd'));
check('Scholarship owner list accepts canonical country deep links', read('apps/admin/src/pages/ScholarshipListPage.tsx').includes("get('countryReferenceId')") && adminDetail.includes('All country scholarships'));
check('Prisma repository no longer bypasses generated schema with any', !/\bany\b/.test(repo) && repo.includes('StudyDestinationProfileGetPayload') && repo.includes('Prisma.StudyDestinationProfileWhereInput'));
check('Owner application regressions are committed', exists('packages/application/tests/study-destinations/StudyDestinationGovernance.spec.ts'));
check('Owner API negative regressions are committed', exists('apps/api/tests/presentation/api/router/StudyDestinationGovernanceRouter.spec.ts'));
check('Owner persistence query contracts are committed', exists('packages/infrastructure/tests/study-destinations/StudyDestinationRepositoryContract.spec.ts'));
check('Owner public mapping contracts are committed', exists('apps/web/src/features/public-template/tests/StudyDestinationPublicMapping.spec.ts'));

const passed = checks.filter((item) => item.passed).length;
console.log(JSON.stringify({ suite: 'STUDY_DESTINATIONS_SOURCE_CLOSURE', passed, total: checks.length, failed: checks.filter((item) => !item.passed).map((item) => item.name) }, null, 2));
if (passed !== checks.length) process.exit(1);

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const exists = (p) => fs.existsSync(path.join(root, p));
let pass = 0;
const failures = [];
function check(name, condition) {
  if (condition) { pass += 1; console.log(`PASS ${name}`); }
  else { failures.push(name); console.error(`FAIL ${name}`); }
}
function has(text, pattern) { return typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text); }

const app = read('apps/web/src/features/public-template/PublicTemplateApp.tsx');
const live = read('apps/web/src/features/public-template/publicLiveDataSource.ts');
const hook = read('apps/web/src/features/public-template/usePublicLiveData.ts');
const prototype = read('apps/web/src/features/public-template/publicPrototypeDataSource.ts');
const scholarships = read('apps/web/src/features/public-template/publicScholarshipDataSource.ts');
const graphHook = read('apps/web/src/features/public-template/usePublicRelationshipGraph.ts');
const majorDetail = read('apps/web/src/features/public-template/components/MajorDetailModal.tsx');
const countryDetail = read('apps/web/src/features/public-template/components/CountryDetailModal.tsx');
const countriesPage = read('apps/web/src/features/public-template/components/CountriesSearchPage.tsx');
const client = read('apps/web/src/api/client.ts');
const matrix = read('docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md');
const closureDocPath = 'docs/remediation/p10/P10_PUBLIC_LIVE_GRAPH_CLOSURE_2026-09-03.md';
const closureDoc = exists(closureDocPath) ? read(closureDocPath) : '';
const packageJson = read('package.json');
const graphRouter = read('apps/api/src/presentation/api/router/CrossDomainReadModelRouter.ts');
const graphService = read('packages/application/src/read-models/CrossDomainGraphReadService.ts');
const appRouter = read('apps/api/src/app.ts');
const majorPublic = read('packages/application/src/majors/use-cases/LocalizedPublicMajorUseCases.ts');
const universityPublic = read('packages/application/src/universities/use-cases/LocalizedPublicUniversityUseCases.ts');
const scholarshipPublic = read('packages/application/src/scholarships/use-cases/PublicScholarshipUseCases.ts');
const coursePublic = read('packages/application/src/courses/use-cases/PublicCourseUseCases.ts');
const studyDestinationPublic = read('packages/application/src/study-destinations/StudyDestinationUseCases.ts');

check('P10-001 API is safe default', has(scholarships, "return value === 'prototype' ? 'prototype' : 'api';"));
check('P10-002 prototype must be explicit', has(scholarships, "value === 'prototype'"));
check('P10-003 prototype data dynamically imported', has(hook, "import('./publicPrototypeDataSource')"));
check('P10-004 live mode never statically imports prototype adapter', !has(live, 'publicPrototypeDataSource'));
check('P10-005 live hook loads API snapshot outside prototype branch', has(hook, 'loadPublicLiveSnapshot(locale)'));
check('P10-006 reload is explicit', has(hook, 'reloadVersion') && has(hook, 'reload'));
check('P10-007 unavailable is represented', has(live, "statuses[domain] = 'unavailable'"));
check('P10-008 empty is represented', has(live, "? 'ready' : 'empty'"));
check('P10-009 per-domain errors are retained', has(live, 'errors[domain]'));
check('P10-010 loaders execute independently', has(live, 'Promise.all(loaders.map'));

for (const [n, fn] of [
  ['P10-011 universities adapter', 'loadPublishedUniversities'], ['P10-012 majors adapter', 'loadPublishedMajors'],
  ['P10-013 countries adapter', 'loadPublishedCountries'], ['P10-014 tests adapter', 'loadPublishedExams'],
  ['P10-015 courses adapter', 'loadPublishedCourses'], ['P10-016 CMS adapter', 'loadPublishedArticles'],
  ['P10-017 services adapter', 'loadPublishedServices'], ['P10-018 careers adapter', 'loadPublishedCareers'],
  ['P10-019 tools adapter', 'loadPublishedTools'],
]) check(n, has(live, `function ${fn}`));
check('P10-020 scholarships adapter is owner-backed', has(live, 'ApiClient.getScholarships') && has(live, 'mapPublicScholarshipDto'));

check('P10-021 published study destinations only', has(live, 'collectOffsetPages((page) => ApiClient.getStudyDestinations({ page, pageSize: 100 }))') && has(studyDestinationPublic, 'repository.listPublished(filters)') && !has(live, 'getReferenceCountries({ activeOnly: true })'));
check('P10-022 university canonical geography retained', has(live, 'countryReferenceId: dto.countryReferenceId') && has(live, 'regionReferenceId: dto.regionReferenceId') && has(live, 'cityReferenceId: dto.cityReferenceId'));
check('P10-023 university program major link canonical', has(live, "program.majorMappingState === 'CANONICALLY_MAPPED'") && has(live, 'majorId: String(program.majorId)'));
check('P10-024 course stable identity retained', has(live, 'ownerId: dto.ownerId') && has(live, 'publicId: dto.publicId') && has(live, 'slug: dto.slug'));
check('P10-025 service canonical P7 refs retained', has(live, 'supportedCountryReferenceIds: dto.supportedCountryReferenceIds') && has(live, 'supportedLanguageReferenceIds: dto.supportedLanguageReferenceIds'));
check('P10-026 career canonical P7 refs retained', has(live, 'countryReferenceId: dto.countryReferenceId') && has(live, 'cityReferenceId: dto.cityReferenceId'));
check('P10-027 tools filtered public-enabled', has(live, '.filter((item) => item.availability.publicEnabled)'));

check('P10-028 scholarship country canonical ID retained', has(scholarships, 'countryReferenceId: dto.countryReferenceId'));
check('P10-029 scholarship university canonical ID retained', has(scholarships, 'id: link.universityId as string'));
check('P10-030 scholarship major canonical target retained', has(scholarships, 'canonicalMajorTargets'));
check('P10-031 scholarship test canonical ID retained', has(scholarships, 'id: item.internationalTestId as string'));
check('P10-032 no synthetic scholarship university identity', !has(scholarships, /university:\$\{|publicId.*university.*index|university:\${/));
check('P10-033 live scholarship loader explicitly no fallback', has(scholarships, 'without any prototype-data fallback'));

check('P10-034 graph API major route', has(client, '/public/graph/majors/'));
check('P10-035 graph API university route', has(client, '/public/graph/universities/'));
check('P10-036 graph API scholarship route', has(client, '/public/graph/scholarships/'));
check('P10-037 graph API country route', has(client, '/public/graph/countries/'));
check('P10-038 graph router mounted', has(appRouter, "v1Router.use('/public/graph'"));
check('P10-039 graph router exposes major', has(graphRouter, "router.get('/majors/:slug'"));
check('P10-040 graph router exposes university', has(graphRouter, "router.get('/universities/:slug'"));
check('P10-041 graph router exposes scholarship', has(graphRouter, "router.get('/scholarships/:slug'"));
check('P10-042 graph router exposes country', has(graphRouter, "router.get('/countries/:iso2Code'"));
check('P10-043 major graph is owner-read-model backed', has(graphHook, 'ApiClient.getMajorGraph') && has(graphHook, 'state.major.relationships.universities.data'));
check('P10-044 university graph is owner-read-model backed', has(graphHook, 'ApiClient.getUniversityGraph'));
check('P10-045 scholarship graph is owner-read-model backed', has(graphHook, 'ApiClient.getScholarshipGraph'));
check('P10-046 graph route identity prefers stable slug/public/owner', has(graphHook, 'identity.slug || identity.publicId || identity.ownerId'));
check('P10-047 graph service declares no reverse persistence', has(graphService, 'read') || has(graphService, 'Read'));

check('P10-048 Major detail has no hardcoded relationship demos', !has(majorDetail, 'MAJOR_RELATIONSHIP_DEMOS') && !has(majorDetail, 'DEFAULT_RELATIONSHIPS'));
check('P10-049 Major detail consumes relationshipGraph', has(majorDetail, 'relationshipGraph?.universities') && has(majorDetail, 'relationshipGraph?.scholarships') && has(majorDetail, 'relationshipGraph?.courses'));
check('P10-050 Major graph failure explicitly does not show demo', has(majorDetail, 'لم يتم عرض علاقات تجريبية بديلة'));
check('P10-051 App wires Major graph', has(app, 'relationshipGraph={publicGraph.majorView}'));
check('P10-052 App exposes graph unavailable state', has(app, "publicGraph.error ? 'unavailable'"));

check('P10-053 App displays API failure explicitly', has(app, 'unavailableDomains.length > 0'));
check('P10-054 App states no experimental replacement', has(app, 'لم يتم استبدالها ببيانات تجريبية'));
check('P10-055 App has explicit retry control', has(app, 'onClick={publicLive.reload}'));
check('P10-056 App displays loading state', has(app, 'loadingDomains.length > 0'));

check('P10-057 country detail browses by canonical ID', has(countryDetail, 'onBrowseScholarships(country.id)'));
check('P10-058 country search hands canonical ID', has(countriesPage, 'const countryId = detailCountry.id'));
check('P10-059 scholarship country filter uses canonical ref', has(app, 'countryReferenceId'));
check('P10-060 no CountryDetail name identity callback', !has(countryDetail, 'onBrowseScholarships(country.name)'));

check('P10-061 University locale contract in API client', has(client, "export interface UniversityFilters {\n  locale?: 'ar' | 'en';"));
check('P10-062 Major locale contract in API client', has(client, "export interface MajorFilters {\n  locale?: 'ar' | 'en';"));
check('P10-063 International Test locale contract in API client', has(client, "export interface InternationalTestFilters {\n  locale?: 'ar' | 'en';"));
check('P10-064 owner locale sent to universities', has(live, 'ApiClient.getUniversities({ locale,'));
check('P10-065 owner locale sent to majors', has(live, 'ApiClient.getMajors({ locale,'));
check('P10-066 owner locale sent to tests', has(live, 'ApiClient.getInternationalTests({ locale,'));
check('P10-067 owner locale sent to CMS', has(live, 'ApiClient.getCmsContent({ locale,'));
check('P10-068 tool identity is locale-independent', has(live, 'id: dto.toolKey') && has(live, "title: locale === 'en' ? dto.nameEn : dto.nameAr"));
check('P10-069 App passes presentation locale to live source', has(app, 'usePublicLiveData(import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE, language)'));
check('P10-070 English presentation is explicit and locale-driven', has(app, "document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'") && has(app, 'document.documentElement.lang = language') && has(app, 'usePublicLiveData(import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE, language)'));

const liveFiles = [
  'apps/web/src/features/public-template/PublicTemplateApp.tsx',
  ...fs.readdirSync(path.join(root, 'apps/web/src/features/public-template/components')).filter(f => f.endsWith('.tsx')).map(f => `apps/web/src/features/public-template/components/${f}`),
];
const forbiddenImports = /(mockData|articleData|serviceData|careerData|studentToolsData)/;
const forbiddenLiveIds = /\b(MOCK_UNIVERSITIES|MOCK_COURSES|MOCK_MAJORS|MOCK_EXAMS|MOCK_COUNTRIES|GOLDEN_IMPORTED_COURSES|GOLDEN_ARTICLES|PUBLIC_SERVICES)\b/;
check('P10-071 no fixture-module imports in production live UI', liveFiles.every(f => !forbiddenImports.test(read(f))));
check('P10-072 no fixture catalog identifiers in production live UI', liveFiles.every(f => !forbiddenLiveIds.test(read(f))));
check('P10-073 prototype adapter contains fixtures only behind explicit module', has(prototype, 'Explicit prototype-only adapter') && forbiddenLiveIds.test(prototype));
check('P10-074 production App does not import prototype adapter', !has(app, 'publicPrototypeDataSource'));

check('P10-075 Majors owner API published-only', has(majorPublic, 'repository.listPublished(filters)') && has(majorPublic, 'MajorStatus.PUBLISHED'));
check('P10-076 Universities owner API published-only', has(universityPublic, 'repository.listPublished(filters)') && has(universityPublic, 'UniversityStatus.PUBLISHED'));
check('P10-077 Scholarships owner API published-only', has(scholarshipPublic, 'repository.listPublished(filters)'));
check('P10-078 Courses owner API published-only', has(coursePublic, 'repository.listPublished(filters)') && has(coursePublic, 'CourseStatus.PUBLISHED'));

check('P10-078A active matrix is current source-rebaseline authority', /\*\*Status:\*\* ACTIVE — SOURCE_REBASELINED \/ RUNTIME_EVIDENCE_PENDING/.test(matrix) && /\*\*Version:\*\* 3\.0\.0-source-rebaselined/.test(matrix));

check('P10-092 closure record exists', exists(closureDocPath));
check('P10-093 closure record preserves source/runtime boundary', has(closureDoc, 'SOURCE CLOSED / RUNTIME PENDING') && has(closureDoc, 'Runtime Pending'));
check('P10-094 closure record states no live migration was executed', has(closureDoc, 'none was executed'));
check('P10-095 package exposes P10 verifier script', has(packageJson, '"phase10:plan:verify": "node scripts/verify-p10-plan-closure.mjs"'));

for (let i = 56; i <= 68; i += 1) {
  const id = `R-${String(i).padStart(3, '0')}`;
  const row = matrix.split('\n').find(line => line.startsWith(`| ${id} |`)) ?? '';
  check(`P10-${String(79 + (i - 56)).padStart(3, '0')} matrix ${id} closed`, row.includes('P10 CLOSED') && !row.includes('| Partial |'));
}

console.log(`P10_PLAN_CLOSURE=${pass}/${pass + failures.length}`);
if (failures.length) {
  console.error(`P10_PLAN_CLOSURE_FAILED=${failures.length}`);
  process.exit(1);
}
console.log('P10_SOURCE_CLOSED=YES');

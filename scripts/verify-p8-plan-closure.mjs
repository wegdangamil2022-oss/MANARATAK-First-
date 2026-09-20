import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const assertions = [];
const check = (name, condition, detail = '') => assertions.push({ name, condition: Boolean(condition), detail });
const has = (rel, text) => read(rel).includes(text);
const notHas = (rel, text) => !read(rel).includes(text);
const scanFiles = (dirs, predicate = () => true) => {
  const files = [];
  const visit = (abs) => {
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (['dist', 'node_modules', '.git'].includes(entry.name)) continue;
      const child = path.join(abs, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (predicate(child)) files.push(child);
    }
  };
  for (const dir of dirs) visit(path.join(root, dir));
  return files;
};
const sourceText = (dirs) => scanFiles(dirs, (f) => /\.(ts|tsx|js|mjs)$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');

const serviceDomain = 'packages/domain/src/services-platform/index.ts';
const serviceRepo = 'packages/infrastructure/src/services-platform/PrismaServicePlatformRepository.ts';
const serviceGateways = 'packages/infrastructure/src/services-platform/ServicePlatformGateways.ts';
const serviceRequests = 'packages/application/src/services-platform/use-cases/ServiceRequestUseCases.ts';
const careerDomain = 'packages/domain/src/career-alumni/entities/CareerJobPosting.ts';
const careerRepo = 'packages/infrastructure/src/career-alumni/PrismaCareerRepository.ts';
const careerGateway = 'packages/infrastructure/src/career-alumni/CareerReferenceGateway.ts';
const careerUseCases = 'packages/application/src/career-alumni/use-cases/CareerAdminUseCases.ts';
const studentGateways = 'packages/infrastructure/src/student-tools/StudentToolGateways.ts';
const studentHandlers = 'packages/application/src/student-tools/handlers/StudentToolHandlers.ts';
const studentRouter = 'apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts';
const di = 'apps/api/src/infrastructure/di/container.ts';
const schema = 'packages/infrastructure/prisma/schema.prisma';
const migration = 'packages/infrastructure/prisma/migrations/20260903210000_p8_late_domain_integrations/migration.sql';
const matrix = 'docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md';
const closureDoc = 'docs/remediation/p8/P8_LATE_DOMAIN_INTEGRATION_CLOSURE_2026-09-03.md';

// P20 becomes a real owner contract, not generated/dummy authority.
check('P8-SVC-001 typed Phase 20 service domain exists', exists(serviceDomain) && has(serviceDomain, 'export interface IServiceCatalogRepository') && has(serviceDomain, 'export interface IServiceRequestRepository'));
check('P8-SVC-001 service domain exported from canonical domain boundary', has('packages/domain/src/index.ts', "export * from './services-platform';"));
check('P8-SVC-001 dummy service authority removed', !exists('packages/domain/src/generated/dummy.ts') || (notHas('packages/domain/src/generated/dummy.ts', 'IServiceCatalogRepository') && notHas('packages/domain/src/generated/dummy.ts', 'export enum ServiceCategory')));
check('P8-SVC-002 service persistence is source-wired', exists(serviceRepo) && has(di, 'new PrismaServicePlatformRepository(prisma)'));
check('P8-SVC-002 unavailable service persistence removed from src DI', notHas(di, "createUnavailableCapability('serviceCatalogPersistence')"));
check('P8-SVC-002 service publicId remains immutable on repository update', has(serviceRepo, 'publicId is immutable after creation') && !/async update\(id: string, data: ServiceCatalogRepositoryUpdateDto\)[\s\S]{0,500}publicId: data\.publicId/.test(read(serviceRepo)));
check('P8-SVC-003 P20 canonical country/language IDs are explicit', has(serviceDomain, 'supportedCountryReferenceIds') && has(serviceDomain, 'supportedLanguageReferenceIds'));
check('P8-SVC-003 P20 relations persist through canonical join records', has(schema, 'model ServiceCatalogCountryRecord') && has(schema, 'model ServiceCatalogLanguageRecord') && has(serviceRepo, 'countryReferenceId') && has(serviceRepo, 'languageReferenceId'));
check('P8-SVC-003 P20 resolves references through P7 contract', has(serviceGateways, 'IReferenceResolver') && has(serviceGateways, 'resolveCountry') && has(serviceGateways, 'resolveLanguage'));
check('P8-SVC-004 request/fulfillment owner path exists', has(serviceDomain, 'ServiceRequestStatus') && has(serviceRequests, 'class StudentServiceRequestUseCases') && has(serviceRequests, 'class AdminServiceFulfillmentUseCases'));
check('P8-SVC-004 P15 private service routes are source-wired', has(studentRouter, "'/services/requests'") && has(studentRouter, "'/services/requests/:requestId'"));
check('P8-SVC-004 provider dispatch remains P20-owned', has(serviceDomain, 'assignProvider') && has(serviceRequests, 'assignProvider'));

// P20 delegates finance execution to P19 and enforces operation idempotency server-side.
check('P8-FIN-001 P20 delegates invoice creation to P19 application authority', has(serviceGateways, 'FinancePlatformUseCases') && has(serviceGateways, "originDomain: 'PHASE_20_SERVICE_REQUEST'"));
check('P8-FIN-001 service request identity becomes finance origin reference', has(serviceGateways, 'originReferenceId: input.requestPublicId'));
check('P8-FIN-001 service invoice idempotency is server-derived per request', has(serviceGateways, 'phase20-service-invoice:${input.requestPublicId}') && notHas('apps/api/src/presentation/api/router/ServiceAdminRouter.ts', 'idempotencyKey'));
const serviceSource = sourceText(['packages/domain/src/services-platform', 'packages/application/src/services-platform']);
check('P8-FIN-002 no direct P19 repository/ledger/payment implementation inside P20', !/IFinanceRepository|PrismaFinance|postLedger|capturePayment|refundPayment|createPayment/.test(serviceSource));

// P21 real persistence and P7 canonical geography.
check('P8-CAREER-001 career persistence is source-wired', exists(careerRepo) && has(di, 'new PrismaCareerRepository(prisma)'));
check('P8-CAREER-001 unavailable career persistence removed from src DI', notHas(di, "createUnavailableCapability('careerPersistence')"));
check('P8-CAREER-002 career job canonical geography is explicit', has(careerDomain, 'countryReferenceId: string') && has(careerDomain, 'cityReferenceId?: string | null'));
check('P8-CAREER-002 career Prisma models reference P7 Country/City', has(schema, 'model CareerEmployerRecord') && has(schema, 'model CareerJobPostingRecord') && has(schema, 'countryReference      ReferenceCountry') && has(schema, 'cityReference         ReferenceCity'));
check('P8-CAREER-002 P21 resolves geography through P7 resolver contract', has(careerGateway, 'IReferenceResolver') && has(careerGateway, 'IReferenceResolutionRepository'));
check('P8-CAREER-003 city-country consistency is validated', has(careerGateway, 'CAREER_CITY_COUNTRY_MISMATCH') && has(careerUseCases, 'CAREER_CITY_REQUIRES_COUNTRY'));
check('P8-CAREER-004 canonical geography participates in dedup identity', has(careerUseCases, "cityReferenceId?.id || 'REMOTE_OR_GLOBAL'") && has(careerUseCases, "countryReferenceId.id"));

// P18 consumes P12/P15/P17 instead of re-owning truth.
check('P8-TOOLS-001 P15 minimal context adapter exists', has(studentGateways, 'class Phase15StudentContextGateway') && has(studentGateways, 'IStudentWorkspaceRepository'));
check('P8-TOOLS-001 P15 context adapter is wired into P18 handler', has(di, 'new Phase15StudentContextGateway(studentWorkspaceRepository)') && has(di, 'new ScholarshipRecommendationHandler(scholarshipRecommendationGateway, studentToolsAIConsumerGateway, studentContextGateway)'));
check('P8-TOOLS-002 scholarship candidate query resolves canonical references', has(studentGateways, 'resolveCountry(referenceLookup(value))') && has(studentGateways, 'resolveLanguage(referenceLookup(value))') && has(studentGateways, 'getDegreeLevelByCode'));
check('P8-TOOLS-002 scholarship owner query receives canonical filters', has(studentGateways, 'countryReferenceId,') && has(studentGateways, 'degreeLevelId,') && has(studentGateways, 'studyLanguageReferenceId: languageReferenceId'));
check('P8-TOOLS-003 scholarship candidate traversal is paginated/bounded',
  has(studentGateways, 'SCHOLARSHIP_RECOMMENDATION_CANDIDATE_SCAN_LIMIT_EXCEEDED') &&
  has(studentGateways, 'listPublished({ ...filters, cursor, limit: 100 })') &&
  has(studentGateways, 'cursor = result.nextCursor ?? undefined') &&
  has(studentGateways, 'hasMore = result.hasMore === true && Boolean(cursor)'));
check('P8-TOOLS-004 authenticated P18 recommendation consumes P15 context only as missing preference input', has(studentHandlers, 'this.studentContext.getMinimalContext') && has(studentHandlers, 'input.targetDegree || privateContext?.targetDegree'));
check('P8-AI-001 P18 AI path stays behind P17 enterprise gateway', has(studentGateways, 'class Phase17StudentToolsAIConsumerGateway') && has(studentHandlers, 'IEnterpriseAIConsumerGateway'));
const lateDomainSource = sourceText([
  'packages/domain/src/student-tools', 'packages/application/src/student-tools', 'packages/infrastructure/src/student-tools',
  'packages/domain/src/services-platform', 'packages/application/src/services-platform',
  'packages/domain/src/career-alumni', 'packages/application/src/career-alumni',
]);
check('P8-AI-001 no direct vendor SDK imports introduced in P18/P20/P21', !/from\s+['\"](?:openai|anthropic|@anthropic|@google\/generative-ai|@google\/genai)['\"]|require\(['\"](?:openai|anthropic)/.test(lateDomainSource));

// P15 hydrates owner truth, it does not become CMS/Service owner.
check('P8-HYDRATE-001 owner hydration contracts exist', has('packages/domain/src/students/index.ts', 'IStudentSavedItemHydrationGateway') && exists('packages/application/src/students/use-cases/StudentSavedItemHydrationService.ts'));
check('P8-HYDRATE-001 CMS and Services owner adapters exist', exists('packages/infrastructure/src/students/StudentSavedItemHydrationGateways.ts') && has('packages/infrastructure/src/students/StudentSavedItemHydrationGateways.ts', 'CmsStudentSavedItemHydrationGateway') && has('packages/infrastructure/src/students/StudentSavedItemHydrationGateways.ts', 'ServiceStudentSavedItemHydrationGateway'));
check('P8-HYDRATE-001 hydrated saved-item API is authenticated student composition', has(studentRouter, "'/saved-items/hydrated'"));

// Source-only persistence gate and matrix truth.
check('P8-DB-001 Prisma source models for P20/P21 exist', has(schema, 'model ServiceRequestRecord') && has(schema, 'model CareerJobPostingRecord'));
check('P8-DB-001 source-only migration exists', exists(migration));
check('P8-DB-001 migration explicitly remains behind Runtime/DB gate', has(migration, 'Do not execute until the Runtime/DB gate is opened'));
check('P8-DB-001 migration FKs point to P7 reference owners', has(migration, 'REFERENCES "ReferenceCountry"("id")') && has(migration, 'REFERENCES "ReferenceLanguage"("id")') && has(migration, 'REFERENCES "ReferenceCity"("id")'));
check('P8-MATRIX-001 active matrix still carries P8 closure rows', has(matrix, '| R-035 | P7 | P20 |') && has(matrix, '| R-041 | P20 | P19 |') && has(matrix, '| Runtime Pending | P8 CLOSED |'));
for (const id of ['R-029', 'R-030', 'R-031', 'R-032', 'R-034', 'R-035', 'R-036', 'R-037', 'R-038', 'R-039', 'R-040', 'R-041']) {
  const line = read(matrix).split('\n').find((value) => value.startsWith(`| ${id} |`)) ?? '';
  check(`P8-MATRIX-002 ${id} is P8 source-closed with runtime proof pending`, line.includes('| Runtime Pending | P8 CLOSED |'), line);
}
check('P8-TEST-001 targeted P20 request/finance unit source test exists', exists('packages/application/tests/services-platform/ServiceRequestUseCases.spec.ts') && has('packages/application/tests/services-platform/ServiceRequestUseCases.spec.ts', 'keeps finance authority behind IServiceFinanceGateway'));
check('P8-TEST-001 career geography regression assertion exists', has('packages/application/tests/career-alumni/CareerAdminUseCases.spec.ts', 'passes the resolved country ID when validating a city reference'));
check('P8-DOC-001 closure record documents source/runtime boundary', exists(closureDoc) && has(closureDoc, 'SOURCE CLOSED / RUNTIME PENDING') && has(closureDoc, 'checked-in `dist` tree is therefore a pre-P8 compiled artifact'));

let failed = 0;
for (const item of assertions) {
  if (item.condition) console.log(`PASS ${item.name}`);
  else {
    failed += 1;
    console.error(`FAIL ${item.name}${item.detail ? ` :: ${item.detail}` : ''}`);
  }
}
console.log(`P8_PLAN_CLOSURE_VERIFIER = ${failed ? 'FAIL' : 'PASS'} ${assertions.length - failed}/${assertions.length}`);
process.exitCode = failed ? 1 : 0;

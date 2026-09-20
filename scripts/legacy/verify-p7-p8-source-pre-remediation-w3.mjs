import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) });

const refUseCases = read('packages/application/src/reference-data/use-cases/ReferenceDataUseCases.ts');
const refSeed = read('packages/application/src/reference-data/services/ReferenceDataSeedApplyService.ts');
const refErrors = read('packages/application/src/reference-data/ReferenceDataErrors.ts');
const adminRouter = read('apps/api/src/presentation/api/router/ReferenceDataAdminRouter.ts');
const publicRouter = read('apps/api/src/presentation/api/router/ReferenceDataPublicRouter.ts');
const adminUi = read('apps/admin/src/pages/ReferenceDataAdminPage.tsx');
const refRepo = read('packages/infrastructure/src/reference-data/PrismaReferenceDataRepository.ts');
const resolver = read('packages/application/src/reference-data/services/ReferenceResolverService.ts');
const resolutionContract = read('packages/domain/src/reference-data/contracts/IReferenceResolutionRepository.ts');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const migration = read('packages/infrastructure/prisma/migrations/20260825190000_w3_reference_city_identity/migration.sql');
const hierarchy = read('packages/domain/src/hierarchy/GenericHierarchy.ts');
const domainIndex = read('packages/domain/src/index.ts');
const taxonomyValidation = read('packages/domain/src/academic-taxonomy/validation.ts');
const taxonomyUseCases = read('packages/application/src/academic-taxonomy/use-cases/AdminAcademicTaxonomyUseCases.ts');
const taxonomyRepoContract = read('packages/domain/src/academic-taxonomy/repository.ts');
const taxonomyRepo = read('packages/infrastructure/src/academic-taxonomy/PrismaAcademicTaxonomyRepository.ts');
const degreeDomain = read('packages/domain/src/degree-level/DegreeLevel.ts');
const degreeUseCases = read('packages/application/src/degree-level/DegreeLevelUseCases.ts');

check('P7-DATA-001 canonical admin writes validate country/currency/language/city',
  refUseCases.includes("validateCountry(data)") && refUseCases.includes("validateCurrency(data)") &&
  refUseCases.includes("validateLanguage(data)") && refUseCases.includes("validateCity(data)"));
check('P7-DATA-001 seed apply re-validates payload rather than trusting stored report',
  refSeed.includes('validateCountry(payload)') && refSeed.includes('validateCurrency(payload)') &&
  refSeed.includes('validateLanguage(payload)') && refSeed.includes('validateCity(payload)') &&
  refSeed.includes('getCountry(payload.countryIso2Code)') && refSeed.includes('getRegionById(payload.administrativeRegionId)'));
check('P7-DATA-001 city write validates active parent country and region ownership',
  refUseCases.includes('getCountry(data.countryIso2Code)') && refUseCases.includes('getRegionById(data.administrativeRegionId)') &&
  refUseCases.includes('must belong to the selected country'));

check('P7-DATA-002 ReferenceCity has canonical unique identity source',
  /canonicalIdentityKey\s+String\?\s+@unique/.test(schema));
check('P7-DATA-002 migration source is gated and creates unique index',
  migration.includes('DO NOT APPLY before Google Studio') && migration.includes('CREATE UNIQUE INDEX "ReferenceCity_canonicalIdentityKey_key"'));
check('P7-DATA-002 upsert uses database unique key and bounded legacy ambiguity detection',
  refRepo.includes('referenceCity.upsert({') && refRepo.includes('where: { canonicalIdentityKey }') &&
  refRepo.includes('canonicalIdentityKey: null') && refRepo.includes('take: 2') &&
  refRepo.includes('REFERENCE_CITY_LEGACY_IDENTITY_AMBIGUOUS') &&
  refRepo.includes('administrativeRegionId: data.administrativeRegionId'));
check('P7-DATA-002 city upsert no longer performs findFirst-create identity race',
  !/public async upsertCity[\s\S]*?referenceCity\.findFirst/.test(refRepo));
check('P7-DATA-002 city identity distinguishes canonical administrative regions',
  refRepo.includes('`id:${data.administrativeRegionId.trim().toLowerCase()}`') && refRepo.includes('`text:${normalize(data.region)}`'));

check('P7-I18N-006 canonical admin schemas accept nameAr',
  (adminRouter.match(/nameAr:\s*z\.string/g) || []).length >= 4);
check('P7-I18N-006 admin UI exposes Arabic name field', adminUi.includes('nameAr'));

check('P7-API-005 admin activeOnly parser supports explicit false/0',
  adminRouter.includes("normalized === 'false' || normalized === '0'") && adminRouter.includes('activeOnly: explicitBooleanQuery'));
check('P7-API-004 structured reference errors are classified',
  refErrors.includes('ReferenceDataValidationError') && refErrors.includes('ReferenceDataNotFoundError') && refErrors.includes('ReferenceDataInvariantError'));
check('P7-API-004 admin router forwards unknown failures',
  adminRouter.includes('return next(err);'));
check('P7-API-004 public router forwards unknown failures',
  publicRouter.includes('return next(err);'));

check('P7-PERF-003 bounded resolver contract exists',
  resolutionContract.includes('IReferenceResolutionRepository') && resolutionContract.includes('resolveCountryCandidate') &&
  resolutionContract.includes('resolveCityCandidate'));
check('P7-PERF-003 resolver does not materialize reference tables',
  !resolver.includes('listCountries(') && !resolver.includes('listCities(') && !resolver.includes('listLanguages(') && !resolver.includes('listCurrencies('));
check('P7-PERF-003 metadata/alias resolution is ambiguity bounded',
  (refRepo.match(/LIMIT 2/g) || []).length >= 2 && refRepo.includes('findMetadataCandidateIds'));
check('P7-PERF-003 SQL whitespace normalization preserves PostgreSQL regex',
  refRepo.includes("'\\\\s+'"));

check('P8-ARCH-001 shared generic hierarchy foundation exists',
  hierarchy.includes('export interface ICycleDetectionValidator') && hierarchy.includes('export class HierarchyValidationService'));
check('P8-ARCH-001 shared hierarchy is exported through domain boundary',
  domainIndex.includes("export * from './hierarchy'"));
check('P8-ARCH-001 taxonomy validation consumes shared cycle validator',
  taxonomyValidation.includes('ICycleDetectionValidator') && taxonomyValidation.includes('new HierarchyValidationService()') &&
  taxonomyValidation.includes('this.cycleDetectionValidator.validateNoCycles'));

check('P8-DEG-005 DegreeLevel lifecycle is a constrained enum',
  degreeDomain.includes('export enum DegreeLevelStatus') && /status\?: DegreeLevelStatus/.test(degreeDomain));
check('P8-DEG-004 partial DegreeLevel update preserves omitted rank/status',
  degreeUseCases.includes('command.displayRank ?? existing.displayRank') && degreeUseCases.includes('command.status ?? existing.status'));

check('P8-MAP-003 mapping validates active endpoints',
  taxonomyValidation.includes('SOURCE_NODE_NOT_ACTIVE') && taxonomyValidation.includes('TARGET_NODE_NOT_ACTIVE'));
check('P8-MAP-003 mapping validates canonical endpoint standards',
  taxonomyValidation.includes('SOURCE_STANDARD_MISMATCH') && taxonomyValidation.includes('TARGET_STANDARD_MISMATCH'));
check('P8-MAP-003 same-standard crosswalk is forbidden',
  taxonomyValidation.includes('SAME_STANDARD_MAPPING_FORBIDDEN'));
check('P8-MAP-003 use case resolves both canonical endpoint nodes before persistence',
  taxonomyUseCases.includes('this.repository.getNode(data.sourceNodeId)') && taxonomyUseCases.includes('this.repository.getNode(data.targetNodeId)'));

check('P8-DAG-002 repository contract exposes serializable mutation boundary',
  taxonomyRepoContract.includes('executeSerializable<T>'));
check('P8-DAG-002 edge validation and persistence execute in one boundary',
  /addEdge[\s\S]*?executeSerializable[\s\S]*?validateEdge[\s\S]*?transactionRepository\.addEdge/.test(taxonomyUseCases));
check('P8-DAG-002 Prisma implementation requests Serializable isolation',
  taxonomyRepo.includes('Prisma.TransactionIsolationLevel.Serializable'));
check('P8-DAG-002 serialization conflicts are retried',
  taxonomyRepo.includes("error.code === 'P2034'") && taxonomyRepo.includes('maxAttempts'));

const passed = checks.filter((c) => c.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`W3_SOURCE_VERIFIER = ${passed === checks.length ? 'PASS' : 'FAIL'} ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const dto = read('packages/domain/src/reference-data/dto/ReferenceDataContracts.ts');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const repo = read('packages/infrastructure/src/reference-data/PrismaReferenceDataRepository.ts');
const useCases = read('packages/application/src/reference-data/use-cases/ReferenceDataUseCases.ts');
const seed = read('packages/application/src/reference-data/services/ReferenceDataSeedApplyService.ts');
const resolver = read('packages/application/src/reference-data/services/ReferenceResolverService.ts');
const migration = read('packages/infrastructure/prisma/migrations/20260903190000_p7_canonical_geography_country_links/migration.sql');
const webClient = read('apps/web/src/api/client.ts');

check('P7-PLAN-001 country read DTO exposes required canonical id', /interface ReferenceCountryDto\s*{\s*id:\s*string;/.test(dto));
check('P7-PLAN-001 currency read DTO exposes required canonical id', /interface ReferenceCurrencyDto\s*{\s*id:\s*string;/.test(dto));
check('P7-PLAN-001 language read DTO exposes required canonical id', /interface ReferenceLanguageDto\s*{\s*id:\s*string;/.test(dto));
check('P7-PLAN-001 city read DTO exposes required canonical id', /interface ReferenceCityDto\s*{\s*id:\s*string;/.test(dto));
check('P7-PLAN-001 region read DTO exposes required canonical id', /interface AdministrativeRegionDto\s*{\s*id:\s*string;/.test(dto));

check('P7-PLAN-002 AdministrativeRegion carries canonical country FK', /model AdministrativeRegion[\s\S]*?countryReferenceId\s+String\?[\s\S]*?countryReference\s+ReferenceCountry\?/.test(schema));
check('P7-PLAN-002 ReferenceCity carries canonical country FK', /model ReferenceCity[\s\S]*?countryReferenceId\s+String\?[\s\S]*?countryReference\s+ReferenceCountry\?/.test(schema));
check('P7-PLAN-002 source ISO2 compatibility columns preserved', /model AdministrativeRegion[\s\S]*?countryIso2Code\s+String/.test(schema) && /model ReferenceCity[\s\S]*?countryIso2Code\s+String/.test(schema));
check('P7-PLAN-002 migration backfills canonical country IDs', migration.includes('UPDATE "AdministrativeRegion"') && migration.includes('UPDATE "ReferenceCity"') && migration.includes('"ReferenceCountry"'));
check('P7-PLAN-002 migration retains explicit DB gate warning', migration.includes('Apply only through the normal database remediation/migration gate'));

check('P7-PLAN-003 city application write resolves canonical country first', useCases.includes('countryReferenceId: country.id'));
check('P7-PLAN-003 seed write resolves canonical country first', seed.includes("countryReferenceId: country.id"));
check('P7-PLAN-003 repository rejects canonical country/code mismatch', repo.includes('REFERENCE_CITY_CANONICAL_COUNTRY_MISMATCH'));
check('P7-PLAN-003 repository persists canonical countryReferenceId', repo.includes('countryReferenceId: canonicalCountry.id'));

check('P7-PLAN-004 resolver remains bounded and name-free', !resolver.includes('listCountries(') && !resolver.includes('listCities(') && !resolver.includes('name ==='));
check('P7-PLAN-004 public web contract exposes country/city stable ids', /interface ReferenceCountryDto\s*{\s*id:\s*string;/.test(webClient) && /interface ReferenceCityDto\s*{\s*id:\s*string;/.test(webClient));

const passed = checks.filter((x) => x.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`P7_PLAN_CLOSURE_VERIFIER = ${passed === checks.length ? 'PASS' : 'FAIL'} ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);

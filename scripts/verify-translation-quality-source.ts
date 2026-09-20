import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const failures: string[] = [];
const passes: string[] = [];

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

function pass(message: string): void {
  passes.push(message);
}

function requireCondition(condition: boolean, message: string): void {
  if (condition) pass(message);
  else failures.push(message);
}

function requireIncludes(source: string, needle: string, message: string): void {
  requireCondition(source.includes(needle), message);
}

function dictionaryKeys(relativePath: string): Set<string> {
  const keys = new Set<string>();
  const source = read(relativePath);
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s{2}"([^"]+)"\s*:/);
    if (match) keys.add(match[1]);
  }
  requireCondition(keys.size > 0, `${relativePath}: dictionary keys detected`);
  requireCondition(!/^\s{2}"[^"]+"\s*:\s*""\s*,?\s*$/m.test(source), `${relativePath}: no blank dictionary values`);
  return keys;
}

function compareDictionaryPair(label: string, enPath: string, arPath: string): Set<string> {
  const enKeys = dictionaryKeys(enPath);
  const arKeys = dictionaryKeys(arPath);
  const onlyEn = [...enKeys].filter((key) => !arKeys.has(key));
  const onlyAr = [...arKeys].filter((key) => !enKeys.has(key));
  requireCondition(
    onlyEn.length === 0 && onlyAr.length === 0,
    `${label}: AR/EN dictionary key parity${onlyEn.length || onlyAr.length ? ` (only EN: ${onlyEn.join(', ') || '-'}; only AR: ${onlyAr.join(', ') || '-'})` : ''}`,
  );
  return enKeys;
}

function walkSourceFiles(directory: string): string[] {
  const absolute = resolve(ROOT, directory);
  const results: string[] = [];
  for (const entry of readdirSync(absolute)) {
    const file = join(absolute, entry);
    const stat = statSync(file);
    if (stat.isDirectory()) {
      results.push(...walkSourceFiles(relative(ROOT, file)));
      continue;
    }
    if (['.ts', '.tsx'].includes(extname(file))) results.push(file);
  }
  return results;
}

function checkLiteralTranslationCalls(label: string, directory: string, keys: Set<string>): void {
  const missing = new Set<string>();
  const callPattern = /\bt\(\s*['"`]([^'"`$]+)['"`]\s*\)/g;
  for (const file of walkSourceFiles(directory)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(callPattern)) {
      if (!keys.has(match[1])) missing.add(`${relative(ROOT, file)}:${match[1]}`);
    }
  }
  requireCondition(
    missing.size === 0,
    `${label}: no missing literal translation keys / raw-key leakage candidates${missing.size ? ` (${[...missing].join(', ')})` : ''}`,
  );
}

function checkI18nProvider(relativePath: string, label: string): void {
  const source = read(relativePath);
  requireIncludes(source, 'getLocaleDirection(language)', `${label}: direction derives from locale contract`);
  requireIncludes(source, 'document.documentElement.lang = language', `${label}: document lang tracks locale`);
  requireIncludes(source, 'document.documentElement.dir = dir', `${label}: document direction tracks locale`);
}

function checkSourceOnlyEnvironment(): void {
  requireCondition(!process.env.DATABASE_URL, 'DATABASE_URL is unset for translation quality gate');
  requireCondition(process.env.DATABASE_MUTATIONS_ALLOWED === 'false', 'DATABASE_MUTATIONS_ALLOWED=false');
  requireCondition(process.env.DATABASE_ENVIRONMENT === 'source', 'DATABASE_ENVIRONMENT=source');
}

function checkLocaleContracts(): void {
  const shared = read('packages/shared/src/localization/locale.ts');
  requireIncludes(shared, "SUPPORTED_LOCALES = ['ar', 'en']", 'supported locales remain ar,en');
  requireIncludes(shared, "DEFAULT_LOCALE: SupportedLocale = 'ar'", 'default locale remains ar');
  requireIncludes(shared, "return locale === 'ar' ? 'rtl' : 'ltr'", 'AR/EN RTL/LTR contract remains explicit');
  requireIncludes(shared, "availability: 'MISSING'", 'missing-locale outcome remains explicit');

  const policy = read('packages/shared/src/localization/policy.ts');
  requireIncludes(policy, "TRANSLATION_CONTENT_MODE: TranslationContentMode = 'INFRASTRUCTURE_ONLY'", 'translation content mode remains infrastructure-only');
  for (const domain of ['SCHOLARSHIP', 'UNIVERSITY', 'MAJOR', 'INTERNATIONAL_TEST', 'COURSE', 'CMS', 'REFERENCE_DATA', 'WEBSITE_UI']) {
    requireIncludes(policy, `${domain}: {`, `translation policy registers ${domain}`);
  }
  requireIncludes(policy, 'canonicalIdentityImmutable: true', 'translation policy preserves canonical identity');
  requireIncludes(policy, 'contentAuthoringAllowed: false', 'translation policy keeps domain content authoring closed');
  requireIncludes(policy, 'TranslationContentMutationDisabledError', 'translation policy exposes a fail-closed mutation error');
  requireIncludes(policy, 'assertNoTranslationPayloadFields', 'translation policy exposes field-level mutation guards');

  const universityAdmin = read('packages/application/src/universities/use-cases/AdminUniversityUseCases.ts');
  requireIncludes(universityAdmin, "assertTranslationContentAuthoringEnabled('UNIVERSITY')", 'University translation persistence is blocked in infrastructure-only mode');
  requireIncludes(universityAdmin, "assertNoTranslationPayloadFields('UNIVERSITY'", 'University compatibility translation fields are guarded');

  const majorAdmin = read('packages/application/src/majors/use-cases/AdminMajorUseCases.ts');
  requireIncludes(majorAdmin, "assertNoTranslationPayloadFields('MAJOR'", 'Major translation fields are guarded at Application boundary');

  const testAdmin = read('packages/application/src/tests-platform/use-cases/InternationalTestUseCases.ts');
  requireIncludes(testAdmin, "assertNoTranslationPayloadFields('INTERNATIONAL_TEST'", 'International-test translation fields are guarded at Application boundary');

  const courseAdmin = read('packages/application/src/courses/use-cases/AdminCourseUseCases.ts');
  requireIncludes(courseAdmin, "assertNoTranslationPayloadFields('COURSE'", 'Course translation carriers are guarded at Application boundary');

  const scholarshipAdmin = read('packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts');
  requireIncludes(scholarshipAdmin, "assertNoTranslationPayloadFields('SCHOLARSHIP'", 'Scholarship translation carriers are guarded at Application boundary');

  const localizationUseCase = read('packages/application/src/localization/use-cases/ManageLocalizationsUseCase.ts');
  requireIncludes(localizationUseCase, 'assertTranslationContentAuthoringEnabled();', 'Generic localization mutation use case is read-only in infrastructure-only mode');

  const api = read('apps/api/src/presentation/api/locale/LocaleQueryContract.ts');
  requireIncludes(api, "UNSUPPORTED_LOCALE_ERROR_CODE = 'UNSUPPORTED_LOCALE'", 'API unsupported-locale error remains explicit');
  requireIncludes(api, 'isApplicationSupportedLocale', 'API locale validation uses application locale contract');
  requireIncludes(api, '.default(APPLICATION_DEFAULT_LOCALE)', 'API locale default uses application default contract');
}

function checkTranslationBehaviorContracts(): void {
  const projection = read('packages/application/src/localization/ApplicationLocaleProjectionService.ts');
  for (const method of ['projectUniversity', 'projectMajor', 'projectInternationalTest']) {
    requireIncludes(projection, method, `application projection exposes stable ${method} contract`);
  }

  const behavioralSuite = read('tests/translation/translation-quality-gates.spec.ts');
  for (const marker of [
    'projectUniversity',
    'projectMajor',
    'parseRequestLocale',
    'buildLocalizedSeoLinks',
  ]) {
    requireIncludes(behavioralSuite, marker, `translation behavior regression suite covers ${marker}`);
  }

  const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
  const translationCi = packageJson.scripts?.['translation:ci'] ?? '';
  requireCondition(
    translationCi.includes('translation:test'),
    'translation:ci executes behavioral translation regression tests after source/schema checks',
  );

  const publicScholarships = read('packages/application/src/scholarships/use-cases/PublicScholarshipUseCases.ts');
  const publicCourses = read('packages/application/src/courses/use-cases/PublicCourseUseCases.ts');
  requireIncludes(publicScholarships, 'ApplicationLocaleProjectionService', 'public scholarships depend on the canonical projection service');
  requireIncludes(publicCourses, 'ApplicationLocaleProjectionService', 'public courses depend on the canonical projection service');

  const client = read('apps/web/src/api/client.ts');
  requireIncludes(client, 'currentPublicLocale()', 'web API client derives locale from the localized route/document');

  const translationWorkspace = read('apps/admin/src/pages/AdminTranslationWorkspacePage.tsx');
  requireIncludes(translationWorkspace, 'TRANSLATION_CONTENT_MODE', 'translation center renders the shared translation mode');
  requireIncludes(translationWorkspace, 'canAuthorDomainTranslations', 'translation center authoring is governed by shared policy');
}

checkSourceOnlyEnvironment();
const webKeys = compareDictionaryPair('Web UI', 'apps/web/src/i18n/en.ts', 'apps/web/src/i18n/ar.ts');
const adminKeys = compareDictionaryPair('Admin UI', 'apps/admin/src/i18n/en.ts', 'apps/admin/src/i18n/ar.ts');
checkLiteralTranslationCalls('Web UI', 'apps/web/src', webKeys);
checkLiteralTranslationCalls('Admin UI', 'apps/admin/src', adminKeys);
checkI18nProvider('apps/web/src/i18n/I18nProvider.tsx', 'Web UI');
checkI18nProvider('apps/admin/src/i18n/I18nProvider.tsx', 'Admin UI');
checkLocaleContracts();
checkTranslationBehaviorContracts();

if (failures.length > 0) {
  process.stderr.write([
    'TRANSLATION_SOURCE_QUALITY_GATE = FAIL',
    ...passes.map((message) => `PASS: ${message}`),
    ...failures.map((message) => `FAIL: ${message}`),
  ].join('\n') + '\n');
  process.exitCode = 1;
} else {
  process.stdout.write([
    'TRANSLATION_SOURCE_QUALITY_GATE = PASS',
    ...passes.map((message) => `PASS: ${message}`),
    'MIGRATIONS_APPLIED = 0',
    'CLOUD_SQL_MUTATIONS = 0',
    'PROTECTED_ID_REGENERATION = 0',
  ].join('\n') + '\n');
}

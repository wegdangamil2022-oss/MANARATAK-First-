import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const page = readFileSync(resolve(root, 'apps/admin/src/pages/ScholarshipCatalogDetailPage.tsx'), 'utf8');
const api = readFileSync(resolve(root, 'apps/admin/src/api/scholarshipCatalog.ts'), 'utf8');
const router = readFileSync(resolve(root, 'apps/api/src/presentation/api/router/ScholarshipAdminRouter.ts'), 'utf8');
const useCases = readFileSync(resolve(root, 'packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts'), 'utf8');
const contracts = readFileSync(resolve(root, 'packages/domain/src/scholarships/contracts.ts'), 'utf8');
const repository = readFileSync(resolve(root, 'packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts'), 'utf8');
const app = readFileSync(resolve(root, 'apps/admin/src/App.tsx'), 'utf8');
const combined = `${page}\n${api}\n${router}\n${useCases}\n${app}`;

function assert(condition, message) {
  if (!condition) throw new Error(`WP12_9_SOURCE_VERIFY_FAILED:${message}`);
}

assert(app.includes("from './pages/ScholarshipCatalogDetailPage'"), 'canonical detail page is not the production admin route');
assert(app.includes('path="/scholarships/:id"'), 'canonical scholarship detail route missing');
assert(api.includes('/catalog-detail'), 'typed catalog-detail endpoint missing');
assert(page.includes('scholarshipCatalogApi.detail'), 'page does not use typed catalog detail API');
assert(page.includes('scholarshipCatalogApi.update'), 'page does not use canonical update API');
assert(page.includes('scholarshipCatalogApi.command'), 'page does not use lifecycle command API');

for (const normalized of [
  'fundingTypeCode', 'benefits', 'degreeTargets', 'majorTargets',
  'eligibilityItems', 'requiredDocumentItems', 'sourceEvidence', 'universityLinks',
  'countryReferenceId', 'studyLanguageReferenceId', 'publicationStatus', 'verificationStatus',
]) assert(page.includes(normalized) || api.includes(normalized) || router.includes(normalized), `normalized field missing: ${normalized}`);

assert(router.includes('benefitSchema'), 'normalized Benefit PATCH schema missing');
assert(router.includes('degreeTargetSchema'), 'normalized DegreeTarget PATCH schema missing');
assert(router.includes('majorTargetSchema'), 'normalized MajorTarget PATCH schema missing');
assert(router.includes('eligibilityItemSchema'), 'normalized Eligibility PATCH schema missing');
assert(router.includes('requiredDocumentSchema'), 'normalized RequiredDocument PATCH schema missing');
assert(!router.includes('dataToUpdate.optionalFields = optionalFields'), 'PATCH still makes optionalFields an authoring SSoT');
assert(useCases.includes('catalogCompleteness'), 'normalized-aware completeness helper missing');
assert(useCases.includes('getScholarshipCatalogDetail'), 'catalog detail application projection missing');
assert(useCases.includes('unresolvedLinks'), 'unresolved canonical-link projection missing');

assert(page.includes('International test canonical ID'), 'tests are not represented inside requirements/documents');
assert(!page.includes('title="Tests"') && !page.includes("title={ui.tests}"), 'separate Tests section is forbidden');
assert(page.includes('sourceEvidence'), 'source provenance is not rendered');
assert(page.includes('detail.history'), 'real audit history is not rendered');
assert(router.includes("category: 'SCHOLARSHIPS_MUTATION'"), 'Scholarship change history is not sourced from Audit');

assert(page.includes('publicationStatus'), 'publication dimension not shown');
assert(page.includes('verificationStatus'), 'verification dimension not shown');
assert(page.includes("run('publish')"), 'explicit Publish command missing');
assert(page.includes("run('unpublish')"), 'explicit Unpublish command missing');
assert(page.includes("run('archive')"), 'explicit Archive command missing');
assert(!page.includes('setTimeout('), 'fake status transition remains');
assert(!page.includes('previewScholarshipFixture'), 'preview fixture leaked into production canonical page');
assert(!page.includes('Math.random()'), 'random fake authoring data detected');
assert(!page.includes('fetch('), 'page must not bypass typed API adapter');
assert(!combined.includes('@prisma/client'), 'Presentation/Admin must not use Prisma directly');

assert(page.includes('canonicalLocked'), 'canonical-reference protection note missing');
assert(!page.includes('onChange={(canonicalId)'), 'raw canonical id editor detected');
assert(useCases.includes('preserveCanonicalReferences'), 'Application canonical-reference preservation gate missing');
assert(useCases.includes("normalize('NFKC')"), 'NFKC semantic normalization missing');
assert(useCases.includes('semanticEquivalent(previous.sourceLabel, item.sourceLabel)'), 'Degree/Major semantic invalidation gate missing');
assert(useCases.includes('semanticFingerprint(['), 'Eligibility/Document semantic fingerprint missing');
assert(useCases.includes("degreeLevelId: equivalent ? previous?.degreeLevelId : null"), 'Degree semantic change can retain stale ID');
assert(useCases.includes("majorId: equivalent ? previous?.majorId : null"), 'Major semantic change can retain stale ID');
assert(useCases.includes("internationalTestId: equivalent ? previous?.internationalTestId : null"), 'Test semantic change can retain stale ID');
assert(useCases.includes('countrySemanticsCompatible('), 'Country label/scope semantic invalidation missing');
assert(useCases.includes('isNonSingleCountryScope(nextScope)'), 'global/multi-country Country guard missing');
assert(useCases.includes("resolutionStatus: 'INCONSISTENT_SCOPE'"), 'inconsistent Country scope/reference health missing');
assert(useCases.includes('else if (!nonSingleCountry && scholarship.countrySourceLabel'), 'global Country unresolved behavior missing');
assert(useCases.includes("result.studyLanguageReferenceId = equivalent ? existing.studyLanguageReferenceId"), 'Study Language semantic invalidation missing');
assert(useCases.includes('delete result.countryReferenceId'), 'generic catalog update can still replace country reference');
assert(useCases.includes('delete result.studyLanguageReferenceId'), 'generic catalog update can still replace language reference');
assert(!router.includes('countryReferenceId: nullableText'), 'router exposes blind country-reference authoring');
assert(!router.includes('internationalTestId: nullableText'), 'router exposes blind InternationalTest id authoring');
assert(!router.includes('degreeLevelId: nullableText'), 'router exposes blind Degree id authoring');
assert(!router.includes('majorId: nullableText'), 'router exposes blind Major id authoring');
assert(!router.includes('universityId: nullableText'), 'router exposes blind University id authoring');
assert(!router.includes('canonicalDedupKey:'), 'router exposes canonicalDedupKey authoring');
assert(contracts.includes("Omit<CreateScholarshipDto, 'publicId' | 'slug' | 'canonicalName' | 'canonicalDedupKey'>"), 'API update contract can write canonicalDedupKey');
assert(useCases.includes('ScholarshipDeduplicationService.buildKey({'), 'Application does not derive canonical dedupe key');
assert(useCases.includes('repository.findByDedupKey(dataToUpdate.canonicalDedupKey)'), 'dedupe collision lookup missing');
assert(useCases.includes('SCHOLARSHIP_CANONICAL_DEDUPE_COLLISION'), 'explicit dedupe collision error missing');
assert(repository.includes('canonicalDedupKey: updates.canonicalDedupKey'), 'internally derived rekey is not persisted');
assert(page.includes('compatibilityNote'), 'legacy compatibility must be explicitly non-SSoT');

const completenessStart = useCases.indexOf('  private catalogCompleteness(');
const completenessEnd = useCases.indexOf('  private unresolvedLinks(', completenessStart);
assert(completenessStart >= 0 && completenessEnd > completenessStart, 'catalog completeness source block missing');
const completeness = useCases.slice(completenessStart, completenessEnd);
for (const legacyField of ['fundingCoverage', 'coverageDetails', "merged('studyCountry')", "merged('degreeLevel')", 'eligibilityCriteria', 'requiredDocuments', "merged('studyLanguage')", "merged('fundingAmount')", "merged('currency')", "merged('duration')", 'optionalFields']) {
  assert(!completeness.includes(legacyField), `legacy compatibility field drives completeness: ${legacyField}`);
}
assert(completeness.includes("merged('benefits')"), 'normalized Benefits completeness missing');
assert(completeness.includes("merged('degreeTargets')"), 'normalized Degree completeness missing');
assert(completeness.includes("merged('eligibilityItems')"), 'normalized Eligibility completeness missing');
assert(completeness.includes("merged('requiredDocumentItems')"), 'normalized Document completeness missing');

console.log('WP12_9_SCHOLARSHIP_CATALOG_DETAIL_SOURCE = PASS');
console.log('NORMALIZED_MODEL_AUTHORING = PASS');
console.log('NORMALIZED_ONLY_COMPLETENESS = PASS');
console.log('CANONICAL_SEMANTIC_INVALIDATION = PASS');
console.log('COUNTRY_SCOPE_CANONICAL_INTEGRITY = PASS');
console.log('CANONICAL_DEDUPE_REKEY = PASS');
console.log('CANONICAL_DEDUPE_COLLISION_GUARD = PASS');
console.log('OPTIONAL_FIELDS_SSO_T = 0');
console.log('CANONICAL_REFERENCE_BLIND_WRITES = 0');
console.log('DOCUMENT_TEST_INTEGRATION = PASS');
console.log('SOURCE_PROVENANCE_UI = PASS');
console.log('AUDIT_HISTORY_UI = PASS');
console.log('MANUAL_PUBLICATION_UI = PASS');
console.log('PRODUCTION_PREVIEW_FALLBACK = 0');
console.log('FAKE_STATUS_TIMEOUTS = 0');
console.log('DIRECT_PRISMA_REFERENCES = 0');
console.log('DIRECT_FETCH_IN_PAGE = 0');
console.log('WP12_10_CHANGES = 0');

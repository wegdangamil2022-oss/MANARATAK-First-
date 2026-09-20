import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const canonical = read('packages/application/src/canonicalization/UnicodeCanonicalization.ts');
const policies = read('packages/application/src/canonicalization/OwnerDomainIdentityPolicies.ts');
const service = read('packages/application/src/services-platform/use-cases/AdminServiceCatalogUseCases.ts');
const career = read('packages/application/src/career-alumni/use-cases/CareerAdminUseCases.ts');
const serviceTest = read('packages/application/tests/services-platform/AdminServiceCatalogUseCases.spec.ts');
const careerTest = read('packages/application/tests/career-alumni/CareerAdminUseCases.spec.ts');
const backfill = read('scripts/backfill-service-career-unicode-canonicalization.ts');

const failures = [];
function requireCondition(condition, message) { if (!condition) failures.push(message); }

requireCondition(canonical.includes("normalize('NFKC')"), 'canonicalizer must use explicit NFKC');
requireCondition(canonical.includes('\\p{L}') && canonical.includes('\\p{N}'), 'canonicalizer must preserve Unicode letters/numbers');
requireCondition(canonical.includes('[أإآٱ]') && canonical.includes(".replace(/ى/gu, 'ي')"), 'Arabic variant rules are missing');
requireCondition(canonical.includes('ARABIC_DIACRITICS') && canonical.includes('ARABIC_TATWEEL'), 'Arabic diacritic/tatweel policy is missing');
requireCondition(policies.includes('canonicalizeServiceIdentityName') && policies.includes('canonicalizeCareerIdentityText'), 'owner policy wrappers are missing');
requireCondition(service.includes('canonicalizeServiceIdentityName') && career.includes('canonicalizeCareerIdentityText'), 'owner use cases must use shared policy');
requireCondition(service.includes('unicodeSlugSegment') && career.includes('unicodeSlugSegment'), 'slugs must use Unicode policy distinct from dedup keys');

for (const [name, source] of [['services-platform', service], ['career-alumni', career]]) {
  requireCondition(!/\[\^a-z0-9\\s\]/i.test(source), `${name} contains forbidden ASCII-only identity normalizer`);
  requireCondition(!/replace\(\/\[\^a-z0-9/i.test(source), `${name} contains forbidden ASCII-only replace normalizer`);
}
requireCondition(/خِدمةُ التأشيرات|خدمة التأشيرات/u.test(serviceTest), 'Service tests must cover Arabic identity');
requireCondition(/شركةُ البُراق|مُهندس برمجيات/u.test(careerTest), 'Career tests must cover Arabic identity');
requireCondition(backfill.includes("mode: apply ? 'APPLY' : 'DRY_RUN'"), 'backfill must default to dry-run planning');
requireCondition(backfill.includes('CANONICAL_DEDUP_COLLISION') && backfill.includes('SLUG_COLLISION'), 'backfill must block collisions');
requireCondition(backfill.includes('__mntaud0091__') && backfill.includes('Two-phase re-keying'), 'backfill must use collision-safe two-phase re-keying');
requireCondition(backfill.includes("allowedPurposes: ['backfill']"), 'backfill apply must use governed database mutation gate');

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log('PASS MNT-AUD-0091 Unicode owner canonicalization source guard');

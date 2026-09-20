import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const page = readFileSync(resolve(root, 'apps/admin/src/pages/ScholarshipImportCenterPage.tsx'), 'utf8');
const api = readFileSync(resolve(root, 'apps/admin/src/api/scholarshipImportCenter.ts'), 'utf8');
const app = readFileSync(resolve(root, 'apps/admin/src/App.tsx'), 'utf8');
const combined = `${page}\n${api}\n${app}`;

function assert(condition, message) {
  if (!condition) throw new Error(`WP12_8_SOURCE_VERIFY_FAILED:${message}`);
}

for (const token of [
  '/overview', '/sources', '/import-new', '/records', 'screening', 'duplicates',
  'missing-data', 'verification', 'canonical-resolution', 'review-queue',
  'ready-to-transfer', 'history', '/diff', '/merge-proposal', '/decision', '/transfer',
]) {
  assert(api.includes(token), `missing API surface ${token}`);
}

for (const call of [
  'scholarshipImportCenterApi.overview',
  'scholarshipImportCenterApi.sources',
  'scholarshipImportCenterApi.createSource',
  'scholarshipImportCenterApi.setSourceStatus',
  'scholarshipImportCenterApi.importNew',
  'scholarshipImportCenterApi.records',
  'scholarshipImportCenterApi.scan',
  'scholarshipImportCenterApi.recordVerification',
  'scholarshipImportCenterApi.recordCanonicalResolution',
  'scholarshipImportCenterApi.decision',
  'scholarshipImportCenterApi.transfer',
]) {
  assert(page.includes(call), `page does not consume ${call}`);
}

assert(app.includes('path="/imports/scholarships"'), 'missing canonical admin route');
assert(app.includes('href="/imports/scholarships"'), 'missing admin navigation entry');
assert(api.includes("'AUTHORITATIVE_SCHOLARSHIP_SOURCE_REGISTRY'"), 'authoritative source registry contract missing');
assert(api.includes('observedStatistics'), 'observed statistics must remain separate from source registry');
assert(api.includes('screeningOrigin'), 'persisted/legacy screening-origin contract missing');
assert(api.includes('ScholarshipImportHistoryEvent'), 'history event contract missing');
assert(page.includes('response.events ?? []'), 'history must render backend event stream');
assert(page.includes("reviewDecisionPersistence === 'CONFIGURED'"), 'review capability gate missing');
assert(page.includes("atomicTransfer === 'CONFIGURED'"), 'transfer capability gate missing');
assert(page.includes('record.readyToTransfer'), 'transfer readiness gate missing');
assert(page.includes("item.target === 'PROVIDER_UNIVERSITY' && providerNonUniversity"), 'NOT_APPLICABLE UI gate must be narrow');
assert(page.includes('MANUAL_HTTP_CONTRACT_SUPPORTS_STRUCTURED_JSON_ONLY'), 'manual input contract limitation must be explicit');
assert(page.includes('ACQUIRED_AWAITING_EXTRACTION_MAPPING') || api.includes('ACQUIRED_AWAITING_EXTRACTION_MAPPING'), 'acquisition-only result must be represented');
assert(page.includes('countsExact'), 'exact/partial count signal not rendered');
assert(page.includes('scanTruncated'), 'scan truncation signal not rendered');
assert(!page.includes('automaticMergePerformed = true'), 'UI must not synthesize automatic merge');
assert(page.includes('Array.isArray(raw._canonicalScreening)'), 'legacy _canonicalScreening fallback missing');
const handoffIndex = page.indexOf('Array.isArray(handoff.canonicalScreening)');
const metadataIndex = page.indexOf('Array.isArray(metadata.canonicalScreening)', handoffIndex);
const legacyIndex = page.indexOf('Array.isArray(raw._canonicalScreening)', metadataIndex);
assert(handoffIndex >= 0 && metadataIndex > handoffIndex && legacyIndex > metadataIndex, 'canonical screening precedence must be handoff -> metadata -> legacy');

assert(api.includes("'ACTIVE' | 'NEEDS_REVIEW' | 'DISABLED' | 'BLOCKED'"), 'registry source status contract is incomplete');
assert(page.includes("if (status === 'ACTIVE') return 'DISABLED'"), 'ACTIVE must only expose disable');
assert(page.includes("if (status === 'DISABLED') return 'ACTIVE'"), 'DISABLED must only expose activate');
assert(page.includes('return null;'), 'non-mutable source statuses must have no action');
assert(page.includes("source.status === 'BLOCKED' ? 'Blocked' : 'Requires source review'"), 'BLOCKED/NEEDS_REVIEW neutral status rendering missing');
assert(!page.includes("source.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'"), 'generic non-ACTIVE activation logic remains');

assert(page.includes("sourceType === 'MANUAL_FILE' ? 'MANUAL_FILE' as const"), 'manual source must force manual mode');
assert(page.includes("acquisitionMode === 'MANUAL_FILE' ? 'MANUAL_FILE' as const"), 'manual mode must force manual source');
assert(page.includes("currentMode === 'MANUAL_FILE' ? 'WEBSITE' as const"), 'manual to network source transition does not reset mode');
assert(page.includes('validSourceModePair(form.sourceType, form.acquisitionMode)'), 'submit-time source/mode invariant missing');
assert(page.includes("throw new Error('SOURCE_TYPE_ACQUISITION_MODE_MISMATCH')"), 'invalid source/mode pair is not rejected locally');

for (const obsolete of [
  "registryState: 'OBSERVED_FROM_PHASE6_BATCHES'",
  'observedBatchLimit: 100',
  'This is an observed source list from recent Phase 6 batches, not a complete runtime registry.',
]) {
  assert(!combined.includes(obsolete), `obsolete pre-WP12-7 contract remains: ${obsolete}`);
}

for (const forbidden of [
  '@prisma/client', 'PrismaClient', 'prisma.', 'mockScholarship', 'mockRecords',
  'fakeRecords', 'sampleRecords', 'Math.random()', 'setTimeout(() =>',
]) {
  assert(!combined.includes(forbidden), `forbidden UI/source token ${forbidden}`);
}

assert(!page.includes('fetch('), 'page must use typed API adapter, not direct fetch');
assert(api.includes("const BASE = '/admin/scholarships/import-center'"), 'adapter must target WP12-7 backend');
assert(!api.includes("registryState: 'OBSERVED_FROM_PHASE6_BATCHES'"), 'API adapter still models old observed-only sources');

console.log('WP12_8_IMPORT_CENTER_UI_SOURCE = PASS');
console.log('LEGACY_CANONICAL_SCREENING_UI = PASS');
console.log('SAFE_SOURCE_STATUS_ACTIONS = PASS');
console.log('SOURCE_FORM_MODE_INVARIANTS = PASS');
console.log('AUTHORITATIVE_SOURCE_REGISTRY_UI = PASS');
console.log('IMPORT_NEW_UI = PASS');
console.log('VERIFICATION_COMMAND_UI = PASS');
console.log('CANONICAL_REVIEW_UI = PASS');
console.log('HISTORY_EVENT_UI = PASS');
console.log('DIRECT_PRISMA_REFERENCES = 0');
console.log('DIRECT_FETCH_IN_PAGE = 0');
console.log('LOCAL_RECORD_FIXTURES = 0');
console.log('ATOMIC_TRANSFER_BYPASS = 0');

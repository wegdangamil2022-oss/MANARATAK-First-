import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const manifest = JSON.parse(read('docs/architecture/persistence/asset-reference-ownership.manifest.json'));
const registry = read('packages/infrastructure/src/asset-platform/PrismaAssetUsageRegistryGateway.ts');
const policy = read('packages/application/src/asset-platform/AssetReferencePolicy.ts');
const container = read('apps/api/src/infrastructure/di/container.ts');

const schemaRefs = [];
let currentModel = null;
for (const line of schema.split(/\r?\n/)) {
  const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
  if (modelMatch) currentModel = modelMatch[1];
  if (!currentModel || line.trim().startsWith('@@')) continue;
  const fieldMatch = line.trim().match(/^(\w*(?:AssetId|assetId))\s+/);
  if (fieldMatch) schemaRefs.push(`${currentModel}.${fieldMatch[1]}`);
}
const declared = new Set(manifest.directReferences.map((r) => `${r.model}.${r.field}`));
const missing = schemaRefs.filter((ref) => !declared.has(ref));
const stale = [...declared].filter((ref) => !schemaRefs.includes(ref));
if (missing.length || stale.length) {
  console.error('ASSET_REFERENCE_MANIFEST_DRIFT', { missing, stale });
  process.exit(1);
}

for (const ref of manifest.directReferences) {
  const authoring = read(ref.authoring);
  if (!ref.derived && !authoring.includes(ref.field)) {
    console.error(`ASSET_AUTHORING_FIELD_NOT_FOUND:${ref.model}.${ref.field}:${ref.authoring}`);
    process.exit(1);
  }
  if (!registry.includes(`field: '${ref.field}'`) && !registry.includes(`field: \"${ref.field}\"`)) {
    console.error(`ASSET_USAGE_REGISTRY_FIELD_MISSING:${ref.model}.${ref.field}`);
    process.exit(1);
  }
}
for (const ref of manifest.jsonReferences) {
  if (!registry.includes(ref.field.split('.').at(-1))) {
    console.error(`ASSET_USAGE_REGISTRY_JSON_REFERENCE_MISSING:${ref.model}.${ref.field}`);
    process.exit(1);
  }
}

const weakConsumerFiles = manifest.directReferences
  .filter((r) => !r.derived && !r.authoring.includes('/certificates/') && !r.authoring.includes('/courses/use-cases/CourseCurriculumUseCases.ts'))
  .map((r) => r.authoring);
for (const file of new Set(weakConsumerFiles)) {
  const source = read(file);
  if (/assetReferences\?\.assert(?:Usable|AllUsable)/.test(source)) {
    console.error(`ASSET_REFERENCE_POLICY_OPTIONAL_BYPASS:${file}`);
    process.exit(1);
  }
  if (!source.includes('AssetReferencePolicy') && !source.includes('assetRepository.findById')) {
    console.error(`ASSET_REFERENCE_POLICY_NOT_COMPOSED:${file}`);
    process.exit(1);
  }
}

if (!policy.includes('ASSET_NOT_FOUND') || !policy.includes('ASSET_STATE_NOT_ALLOWED') || !policy.includes('ASSET_CLASSIFICATION_NOT_ALLOWED') || !policy.includes('ASSET_OWNER_MISMATCH') || !policy.includes('ASSET_REFERENCE_POLICY_REQUIRED')) {
  console.error('ASSET_REFERENCE_POLICY_INVARIANTS_INCOMPLETE');
  process.exit(1);
}
if (!container.includes('new PrismaAssetUsageRegistryGateway(prisma)') || container.includes("createUnavailableCapability('assetUsageRegistry')")) {
  console.error('ASSET_USAGE_REGISTRY_NOT_PRODUCTION_COMPOSED');
  process.exit(1);
}
if (registry.includes('$queryRawUnsafe')) {
  console.error('ASSET_USAGE_REGISTRY_UNSAFE_RAW_QUERY_FORBIDDEN');
  process.exit(1);
}
if (!registry.includes('ASSET_USAGE_REGISTRY_IS_DERIVED_READ_ONLY')) {
  console.error('ASSET_USAGE_REGISTRY_MUST_BE_DERIVED_READ_ONLY');
  process.exit(1);
}

console.log(`ASSET_REFERENCE_INTEGRITY = PASS direct=${schemaRefs.length} json=${manifest.jsonReferences.length}`);

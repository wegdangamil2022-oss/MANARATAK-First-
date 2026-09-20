import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

class AssetId {
  constructor(value) { this.value = value; }
}
const AssetLifecycleState = {
  ACTIVE: 'ACTIVE', QUARANTINED: 'QUARANTINED', ARCHIVED: 'ARCHIVED', DELETED: 'DELETED', PURGED: 'PURGED',
};
const AssetSecurityClassification = {
  PUBLIC: 'PUBLIC', INTERNAL: 'INTERNAL', RESTRICTED: 'RESTRICTED', CONFIDENTIAL: 'CONFIDENTIAL',
};

function transpileCommonJs(source) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
}

function loadTsModule(relPath, requireMap = {}) {
  const source = read(relPath);
  const js = transpileCommonJs(source);
  const module = { exports: {} };
  const localRequire = (id) => {
    if (id in requireMap) return requireMap[id];
    throw new Error(`UNEXPECTED_REQUIRE:${id}`);
  };
  const wrapper = vm.runInThisContext(`(function(require,exports,module){${js}\n})`, { filename: relPath });
  wrapper(localRequire, module.exports, module);
  return module.exports;
}

function domainMock() {
  return { AssetId, AssetLifecycleState, AssetSecurityClassification };
}

test('MNT-AUD-0030 runtime policy rejects missing/state/classification/owner violations', async () => {
  const { AssetReferencePolicy, assertAssetReferenceUsable } = loadTsModule(
    'packages/application/src/asset-platform/AssetReferencePolicy.ts',
    { '@manaratak/domain': domainMock() },
  );
  const repo = { findById: async (id) => records.get(id.value) ?? null };
  const records = new Map([
    ['active', { state: 'ACTIVE', classification: 'PUBLIC', owner: { ownerId: 'owner-1', ownerType: 'USER' } }],
    ['quarantined', { state: 'QUARANTINED', classification: 'PUBLIC', owner: { ownerId: 'owner-1', ownerType: 'USER' } }],
    ['restricted', { state: 'ACTIVE', classification: 'RESTRICTED', owner: { ownerId: 'owner-1', ownerType: 'USER' } }],
    ['other-owner', { state: 'ACTIVE', classification: 'PUBLIC', owner: { ownerId: 'owner-2', ownerType: 'USER' } }],
  ]);
  const policy = new AssetReferencePolicy(repo);
  await assert.doesNotReject(policy.assertUsable('active', { purpose: 'TEST', expectedOwnerId: 'owner-1' }));
  await assert.rejects(policy.assertUsable('missing', { purpose: 'TEST' }), /ASSET_NOT_FOUND/);
  await assert.rejects(policy.assertUsable('quarantined', { purpose: 'TEST' }), /ASSET_STATE_NOT_ALLOWED/);
  await assert.rejects(policy.assertUsable('restricted', { purpose: 'TEST' }), /ASSET_CLASSIFICATION_NOT_ALLOWED/);
  await assert.rejects(policy.assertUsable('other-owner', { purpose: 'TEST', expectedOwnerId: 'owner-1' }), /ASSET_OWNER_MISMATCH/);
  await assert.rejects(assertAssetReferenceUsable(undefined, 'active', { purpose: 'TEST' }), /ASSET_REFERENCE_POLICY_REQUIRED/);
  await assert.rejects(policy.assertUsable('https://example.com/x.png', { purpose: 'TEST' }), /RAW_ASSET_REFERENCE_FORBIDDEN/);
});

test('MNT-AUD-0050 derived registry detects direct and CMS JSON usages and remains read-only', async () => {
  const calls = [];
  const prisma = new Proxy({}, {
    get(_target, delegate) {
      return {
        async count(args) {
          calls.push([delegate, args]);
          const where = args?.where ?? {};
          if (delegate === 'course' && where.thumbnailAssetId === 'asset-direct') return 1;
          if (delegate === 'cmsPublishedContent' && where.attachmentAssetIds?.array_contains?.includes('asset-json')) return 1;
          if (delegate === 'cmsContentNode' && where.seoMetadata?.path?.[0] === 'openGraphAssetId' && where.seoMetadata.equals === 'asset-og') return 1;
          return 0;
        },
      };
    },
  });
  const { PrismaAssetUsageRegistryGateway } = loadTsModule(
    'packages/infrastructure/src/asset-platform/PrismaAssetUsageRegistryGateway.ts',
    { '@manaratak/domain': domainMock(), '@prisma/client': {} },
  );
  const registry = new PrismaAssetUsageRegistryGateway(prisma);
  assert.equal(await registry.isAssetInUse(new AssetId('unused')), false);
  assert.equal(await registry.isAssetInUse(new AssetId('asset-direct')), true);
  assert.match(JSON.stringify(await registry.findUsages(new AssetId('asset-json'))), /attachmentAssetIds/);
  assert.match(JSON.stringify(await registry.findUsages(new AssetId('asset-og'))), /openGraphAssetId/);
  await assert.rejects(registry.registerUsage(new AssetId('x'), 'consumer'), /DERIVED_READ_ONLY/);
  await assert.rejects(registry.unregisterUsage(new AssetId('x'), 'consumer'), /DERIVED_READ_ONLY/);
  assert.ok(calls.length > 25, 'registry should inspect the complete direct + JSON manifest surface');
});

test('MNT-AUD-0050 purge rejects in-use asset before storage deletion', async () => {
  let deleteCalls = 0;
  let purgeCalls = 0;
  const record = {
    locator: { bucket: 'b', key: 'k' },
    purge() { purgeCalls += 1; },
  };
  const repo = { findById: async () => record, save: async () => {} };
  const storage = { delete: async () => { deleteCalls += 1; } };
  const usage = {
    findUsages: async () => [{ consumer: 'CMS_NODE_FEATURED', field: 'featuredAssetId' }],
    isAssetInUse: async () => true,
  };
  const { ProcessAssetLifecycleUseCase } = loadTsModule(
    'packages/application/src/asset-platform/use-cases/ProcessAssetLifecycleUseCase.ts',
    {
      '@manaratak/domain': { ...domainMock() },
      '../mappers/AssetRecordMapper': { AssetRecordMapper: { toDto: (v) => v } },
      '../dtos/AssetDtos': {},
    },
  );
  const useCase = new ProcessAssetLifecycleUseCase(repo, storage, usage);
  await assert.rejects(useCase.purgeAsset({ assetId: 'asset-in-use' }), /currently in use.*CMS_NODE_FEATURED\.featuredAssetId/);
  assert.equal(purgeCalls, 0);
  assert.equal(deleteCalls, 0);
});

test('MNT-AUD-0030 consumer use cases fail closed when an AssetId is supplied without P05 policy', () => {
  const files = [
    'packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts',
    'packages/application/src/cms/use-cases/CmsUseCases.ts',
    'packages/application/src/career-alumni/use-cases/CareerAdminUseCases.ts',
    'packages/application/src/student-tools/use-cases/StudentToolRegistryUseCases.ts',
    'packages/application/src/reference-data/use-cases/ReferenceDataUseCases.ts',
    'packages/application/src/study-destinations/StudyDestinationUseCases.ts',
    'packages/application/src/services-platform/use-cases/AdminServiceCatalogUseCases.ts',
    'packages/application/src/tests-platform/use-cases/InternationalTestUseCases.ts',
    'packages/application/src/universities/use-cases/AdminUniversityUseCases.ts',
    'packages/application/src/courses/use-cases/AdminCourseUseCases.ts',
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /assetReferences\?\.assert(?:Usable|AllUsable)/, file);
  }
  const policy = read('packages/application/src/asset-platform/AssetReferencePolicy.ts');
  assert.match(policy, /ASSET_REFERENCE_POLICY_REQUIRED/);
});

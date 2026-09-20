import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const repo = read('packages/infrastructure/src/cms/PrismaCmsRepository.ts');
const policy = read('packages/domain/src/cms/services/CmsPublishingPolicy.ts');
const contracts = read('packages/domain/src/cms/contracts/ICmsRepository.ts');
const entities = read('packages/domain/src/cms/entities/CmsContent.ts');
const useCases = read('packages/application/src/cms/use-cases/CmsUseCases.ts');
const router = read('apps/api/src/presentation/api/router/CmsAdminRouter.ts');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const adminPage = read('apps/admin/src/pages/CmsAdminPage.tsx');
const operations = read('apps/admin/src/features/cms/CmsOperationsPanels.tsx');
const migrationPath = 'packages/infrastructure/prisma/migrations/20260826194500_w14_cms_integrity/migration.sql';
const migration = exists(migrationPath) ? read(migrationPath) : '';

const rootStatusWrites = [...repo.matchAll(/cmsContentNode\.update\([\s\S]{0,260}?status:\s*([^,\n}]+)/g)].map((m) => m[1]);

const checks = {
  'P16-LOCALE-001':
    /aggregateRootStatus\(states/.test(policy) &&
    /states\.includes\(CmsContentStatus\.PUBLISHED\)/.test(policy) &&
    /states\.every\(\(state\) => state === CmsContentStatus\.ARCHIVED\)/.test(policy) &&
    /syncRootLifecycle\(tx, content\.id/.test(repo) &&
    rootStatusWrites.length === 1 &&
    rootStatusWrites[0].includes('aggregateStatus') &&
    !/data:\s*\{\s*status:\s*next/.test(repo),

  'P16-NAV-005':
    /publishNavigation\(id: string, expectedVersion: number, actorId: string\)/.test(contracts) &&
    /status:\s*CmsContentStatus\.DRAFT/.test(repo) &&
    /publishedContentHash:\s*null/.test(repo) &&
    /assertMakerChecker\(existing\.updatedBy, actorId\)/.test(repo) &&
    /navigationContentHash\(existing\)/.test(repo) &&
    /reviewedVersion:\s*existing\.version/.test(repo) &&
    /navigation\/:id\/publish/.test(router) &&
    !/navigation\/:id\/publish[\s\S]{0,280}nodes:/.test(router),

  'P16-ANN-006':
    /publishAnnouncement\(id: string, expectedVersion: number, actorId: string\)/.test(contracts) &&
    /updatedBy\s+String/.test(schema) &&
    /publishedContentHash\s+String\?/.test(schema) &&
    /CMS_ANNOUNCEMENT_DRAFT_REQUIRED/.test(repo) &&
    /assertMakerChecker\(existing\.updatedBy \?\? existing\.createdBy, actorId\)/.test(repo) &&
    /announcementContentHash\(existing\)/.test(repo) &&
    /announcements\/:id\/publish/.test(router) &&
    !/announcements\/:id\/publish[\s\S]{0,260}title:/.test(router),

  'P16-SCHED-002':
    /status:\s*'PROCESSING'/.test(repo) &&
    /FOR UPDATE SKIP LOCKED/.test(repo) &&
    /TransactionIsolationLevel\.Serializable/.test(repo) &&
    /leaseExpiresAt/.test(repo) &&
    /claimedBy/.test(repo) &&
    /current\?\.state === targetState/.test(repo) &&
    /completeScheduledJob/.test(repo) &&
    /leaseExpiresAt\s+DateTime\?/.test(schema),

  'P16-SEO-004':
    !/canonicalUrl:\s*z\.string\(\)\.url/.test(router) &&
    /authoringSeo/.test(useCases) &&
    /canonicalUrl:\s*CmsPublishingPolicy\.canonicalPath/.test(repo) &&
    !/canonicalUrl:\s*input\.canonicalUrl/.test(repo) &&
    !/canonicalUrl:\s*currentEditor\.canonicalUrl/.test(adminPage),

  'P16-SEO-003':
    /CmsContentType\.ARTICLE\]:\s*'articles'/.test(policy) &&
    /CmsContentType\.STUDY_GUIDE\]:\s*'study-guides'/.test(policy) &&
    /CmsContentType\.NEWS\]:\s*'news'/.test(policy) &&
    /CmsContentType\.STATIC_PAGE\]:\s*'pages'/.test(policy) &&
    /canonicalPath\(data\.locale, content\.contentType/.test(repo) &&
    !/`\/\$\{data\.locale\}\/articles\//.test(repo) &&
    !/`\/\$\{locale\}\/articles\//.test(repo),

  'P16-REDIR-008':
    /assertRedirectGraphSafe/.test(repo) &&
    /const visited = new Set<string>\(\[sourcePath\]\)/.test(repo) &&
    /for \(let depth = 0; depth < 256; depth \+= 1\)/.test(repo) &&
    /visited\.has\(cursor\)/.test(repo) &&
    (repo.match(/assertRedirectGraphSafe\(tx/g) ?? []).length >= 2,

  'P16-NAV-010':
    /CMS_NAVIGATION_PARENT_NOT_FOUND/.test(policy) &&
    /node\.parentNodeId && !ids\.has\(node\.parentNodeId\)/.test(policy) &&
    /CMS_NAVIGATION_DUPLICATE_NODE_ID/.test(policy),

  'P16-BLOCK-009':
    /assertBlockPayload/.test(policy) &&
    /validateSchemaNode/.test(policy) &&
    /CMS_BLOCK_FIELD_UNDECLARED/.test(policy) &&
    /schema\.items !== undefined/.test(policy) &&
    /additionalProperties === true/.test(policy) &&
    /CmsPublishingPolicy\.assertBlockPayload/.test(repo),

  'P16-TAG-007':
    /tags:\s*\{\s*array_contains:\s*\[\{ normalizedValue: tag \}\]/.test(repo) &&
    /cmsPublishedContent\.count\(\{ where \}\)/.test(repo) &&
    !/const filtered = tag/.test(repo) &&
    /totalPages:\s*Math\.ceil\(total \/ pageSize\)/.test(repo),

  'GUARD-W14-MIGRATION-SOURCE-ONLY':
    exists(migrationPath) &&
    /publishedContentHash/.test(migration) &&
    /leaseExpiresAt/.test(migration) &&
    /updatedBy/.test(migration) &&
    /Google Studio remediation gate/.test(migration),

  'GUARD-MAKER-CHECKER-PROOF-PERSISTED':
    /publishedContentHash\s+String\?/.test(schema) &&
    /publishedBy\s+String\?/.test(schema) &&
    /publishedAt\s+DateTime\?/.test(schema) &&
    /contentHash/.test(repo),

  'GUARD-ADMIN-CONSUMERS-UPDATED':
    !/locationKey: form\.get\('locationKey'\), status: 'DRAFT'/.test(operations) &&
    !/startsAt: new Date\(\)\.toISOString\(\), status: 'DRAFT'/.test(operations) &&
    !/block-schemas[^\n]+method: 'POST'/.test(operations) &&
    /additionalProperties === true/.test(policy) &&
    /Canonical URL يُولَّد تلقائيًا/.test(adminPage),

  'GUARD-PHASE16-API-SEPARATION':
    /publishNavigation/.test(useCases) &&
    /publishAnnouncement/.test(useCases) &&
    /archiveAnnouncement/.test(useCases) &&
    /CMS_NAVIGATION_DRAFT_REQUIRED/.test(repo) &&
    /CMS_ANNOUNCEMENT_PUBLISHED_REQUIRED/.test(repo),
};

for (const [name, ok] of Object.entries(checks)) console.log(`${name}=${ok ? 'PASS' : 'FAIL'}`);
if (Object.values(checks).some((ok) => !ok)) process.exit(1);
console.log(`W14_SOURCE_VERIFIER=PASS ${Object.keys(checks).length}/${Object.keys(checks).length}`);

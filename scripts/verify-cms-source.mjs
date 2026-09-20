import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const checks = [];
const expect = (condition, label) => { checks.push({ label, ok: Boolean(condition) }); };

const typeEnum = read('packages/domain/src/cms/enums/CmsContentType.ts');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const adminPage = read('apps/admin/src/pages/CmsAdminPage.tsx');
const operations = read('apps/admin/src/features/cms/CmsOperationsPanels.tsx');
const adminRouter = read('apps/api/src/presentation/api/router/CmsAdminRouter.ts');
const publicRouter = read('apps/api/src/presentation/api/router/CmsPublicRouter.ts');
const graph = read('packages/application/src/read-models/CrossDomainGraphReadService.ts');
const migration = read('packages/infrastructure/prisma/migrations/20260905014500_cms_domain_links_source_only/migration.sql');
const cmsUseCases = read('packages/application/src/cms/use-cases/CmsUseCases.ts');
const previewIndex = existsSync('apps/web/src/features/admin-preview/index.ts') ? read('apps/web/src/features/admin-preview/index.ts') : '';
const scheduledHandler = read('packages/application/src/background-jobs/handlers/CmsScheduledPublishingBackgroundJobHandler.ts');
const apiServer = read('apps/api/src/server.ts');
const appConfig = read('packages/config/src/AppConfig.ts');

expect(!typeEnum.includes('ANNOUNCEMENT') && !typeEnum.includes('CONTENT_BLOCK'), 'operational content removed from editorial content enum');
expect(schema.includes('model CmsAnnouncement') && schema.includes('model CmsContentBlock'), 'announcements and blocks retain dedicated SSOT models');
expect(schema.includes('model CmsContentDomainLink') && schema.includes('domainLinks         CmsContentDomainLink[]'), 'CMS canonical domain-link model wired to content root');
expect(existsSync('packages/infrastructure/prisma/migrations/20260905014500_cms_domain_links_source_only/migration.sql'), 'source-only CMS domain-link migration present');
expect(adminRouter.includes("'/content/:id/domain-links'"), 'admin domain-link API present');
expect(publicRouter.includes("'/related'"), 'public related-content API present');
expect(graph.includes('editorialContent') && graph.includes('CmsDomainTargetType.MAJOR') && graph.includes('CmsDomainTargetType.UNIVERSITY') && graph.includes('CmsDomainTargetType.SCHOLARSHIP'), 'cross-domain graph projects related editorial content');
expect(!operations.includes('locale=ar') && !operations.includes("locale: 'ar'"), 'site operations are locale-aware rather than Arabic-hardcoded');
expect(!operations.includes('/admin/cms/block-schemas\', { method: \'POST\''), 'technical block-schema creation removed from ordinary editor UI');
expect(adminPage.includes('DomainLinksPanel') && adminPage.includes('#142B5F') && adminPage.includes('#0E7C86'), 'admin CMS exposes canonical linking and current MANARATAK brand tokens');
expect(!adminPage.includes("'ANNOUNCEMENT',") && !adminPage.includes("'CONTENT_BLOCK',"), 'editorial create form does not duplicate site-operation types');
expect(!read('packages/domain/src/cms/enums/CmsDomainTargetType.ts').includes('STUDY_DESTINATION'), 'study destinations reuse canonical ReferenceCountry ownership rather than a duplicate CMS target type');
expect(cmsUseCases.includes('CMS_DOMAIN_TARGET_OWNER_ID_REQUIRED') && adminRouter.includes('targetId: z.string().trim().uuid()') && publicRouter.includes('targetId: z.string().trim().uuid()'), 'CMS domain links accept canonical owner UUIDs only across admin and public boundaries');
expect(!previewIndex.includes('AdminCmsTranslationsPreviewPage') && !previewIndex.includes('AdminCmsReviewQueuePage'), 'obsolete duplicate CMS translation/review preview surfaces removed');
expect(operations.includes('preservedNodes') && operations.includes('expectedVersion: existing?.version'), 'navigation editor preserves existing nodes and uses optimistic concurrency');
expect(
  !existsSync('apps/web/src/features/admin-preview/AdminCmsArticlesPreviewPage.tsx') &&
  !existsSync('apps/web/src/features/admin-preview/AdminCmsFaqsPreviewPage.tsx') &&
  !existsSync('apps/web/src/features/admin-preview/AdminCmsPagesPreviewPage.tsx') &&
  !existsSync('apps/web/src/features/admin-preview/AdminCmsCategoriesPreviewPage.tsx'),
  'fake-data CMS local preview CRUD surfaces removed in favor of canonical admin control plane',
);

expect(existsSync('docs/implementation-status/MANARATAK_CMS_DEEP_RESTRUCTURE_SOURCE_CLOSURE_2026-09-05.md'), 'CMS deep-restructure closure report is present');
expect(scheduledHandler.includes('processDueSchedules') && apiServer.includes('CMS_SCHEDULED_PUBLISH_JOB_TYPE'), 'CMS due schedules execute through the canonical durable background worker');
expect(appConfig.includes('BACKGROUND_CMS_CRON must be explicitly configured in production/staging'), 'CMS worker cadence is explicit in production configuration');

expect(migration.includes('targetId_uuid_check') && migration.includes('targetType_check') && migration.includes('relationType_check'), 'source-only migration enforces UUID and allowed domain/relation types at the database boundary');

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.label}`);
if (failed.length) {
  console.error(`CMS_SOURCE_VERIFY_FAILED=${failed.length}`);
  process.exit(1);
}
console.log(`CMS_SOURCE_VERIFY_PASS=${checks.length}`);
console.log('DATABASE_CONNECTED=NO');
console.log('MIGRATIONS_APPLIED=0');
console.log('CLOUD_SQL_MUTATIONS=0');

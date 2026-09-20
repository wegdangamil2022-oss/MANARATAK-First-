import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['CMS lifecycle', 'packages/domain/src/cms/enums/CmsContentStatus.ts', 'READY_TO_PUBLISH'],
  ['publishing readiness', 'packages/domain/src/cms/services/CmsPublishingPolicy.ts', 'CMS_MAKER_CHECKER_VIOLATION'],
  ['CMS persistence', 'packages/infrastructure/prisma/schema.prisma', 'model CmsPublishedContent'],
  ['revision ledger', 'packages/infrastructure/prisma/schema.prisma', 'model CmsContentRevision'],
  ['asset boundary', 'packages/application/src/cms/use-cases/CmsUseCases.ts', 'assertAssetHandle'],
  ['atomic audit/outbox', 'packages/infrastructure/src/cms/PrismaCmsRepository.ts', 'transactionalOutboxRecord.create'],
  ['published projection', 'packages/infrastructure/src/cms/PrismaCmsRepository.ts', 'cmsPublishedContent.upsert'],
  ['public CMS API', 'apps/api/src/presentation/api/router/CmsPublicRouter.ts', 'PublicCmsUseCases'],
  ['web CMS API client', 'apps/web/src/api/client.ts', 'getCmsContentBySlug'],
  ['public route composition', 'apps/web/src/features/public-template/PublicTemplateApp.tsx', "section === 'content'"],
  ['type-aware live mapper', 'apps/web/src/features/public-template/publicLiveDataSource.ts', 'CMS_CONTENT_TYPE_UNSUPPORTED'],
  ['published discovery', 'apps/web/src/features/public-template/publicLiveDataSource.ts', 'loadPublishedArticles'],
  ['slug redirects', 'packages/infrastructure/src/cms/PrismaCmsRepository.ts', 'changeLocalizedSlug'],
  ['navigation governance', 'packages/infrastructure/prisma/schema.prisma', 'model CmsNavigationMenu'],
  ['announcements', 'packages/infrastructure/prisma/schema.prisma', 'model CmsAnnouncement'],
  ['scheduled worker', 'packages/infrastructure/src/cms/PrismaCmsRepository.ts', 'processDueSchedules'],
  ['rich-text safety', 'packages/domain/src/cms/services/CmsPublishingPolicy.ts', 'CMS_UNSAFE_RICH_TEXT'],
  ['multi-site slug identity', 'packages/infrastructure/prisma/schema.prisma', '@@unique([siteIdentifier, locale, localizedSlug])'],
  ['delivery cache', 'packages/infrastructure/src/cms/RedisCmsDeliveryCache.ts', 'CmsDeliveryInvalidated'],
  ['admin workflow', 'apps/api/src/presentation/api/router/CmsAdminRouter.ts', 'req.authUserId'],
];

let failed = false;
for (const [name, relative, token] of checks) {
  const absolute = path.join(root, relative);
  const exists = fs.existsSync(absolute);
  const passed = exists && fs.readFileSync(absolute, 'utf8').includes(token);
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  failed ||= !passed;
}


if (failed) process.exit(1);
console.log(`Phase 16 source verification passed (${checks.length}/${checks.length}).`);

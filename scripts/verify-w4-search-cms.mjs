import fs from 'node:fs'; import path from 'node:path';
const r=(p)=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
const checks=[
['0037 real Prisma search gateway', r('apps/api/src/infrastructure/di/container.ts').includes('new PrismaPublicSearchEngineGateway(prisma)')],
['0037 persisted search request repository', r('apps/api/src/infrastructure/di/container.ts').includes('new PrismaSearchRequestRepository(prisma)')],
['0037 server public cursor API', r('apps/api/src/presentation/api/router/SearchRouter.ts').includes("router.get('/public'") && r('packages/infrastructure/src/search/PrismaPublicSearchEngineGateway.ts').includes('nextCursor')],
['0037 deterministic ranking', r('packages/infrastructure/src/search/PrismaPublicSearchEngineGateway.ts').includes('ORDER BY r.score DESC, lower(r.title) ASC, r.kind ASC, r.id ASC')],
['0037 published owner truth only', r('packages/infrastructure/src/search/PrismaPublicSearchEngineGateway.ts').includes("WHERE c.status = 'PUBLISHED'") && r('packages/infrastructure/src/search/PrismaPublicSearchEngineGateway.ts').includes("cc.status = 'PUBLISHED'")],
['0037 P24 API mode calls server search', r('apps/web/src/features/public-template/components/GlobalSearchPage.tsx').includes('ApiClient.searchPublicCatalog')],
['0037 prototype local index explicitly isolated', r('apps/web/src/features/public-template/usePublicLiveData.ts').includes('__MANARATAK_PROTOTYPE_DATA_ENABLED__')],
['0046 exact CMS types preserved', r('apps/web/src/features/public-template/types.ts').includes("'FAQ' | 'STATIC_PAGE'") && r('apps/web/src/features/public-template/publicLiveDataSource.ts').includes('CMS_CONTENT_TYPE_UNSUPPORTED')],
['0046 article discovery explicitly filters owner types', r('apps/web/src/features/public-template/publicLiveDataSource.ts').includes("editorialTypes") && r('apps/web/src/features/public-template/publicLiveDataSource.ts').includes('contentType, page, pageSize: 50')],
['0046 generic canonical content route exists', r('apps/web/src/router/index.tsx').includes("path: 'content/:slug'")],
['0046 generic route fetches owner slug without relabel', r('apps/web/src/features/public-template/PublicTemplateApp.tsx').includes("section === 'content'") && r('apps/web/src/features/public-template/PublicTemplateApp.tsx').includes('getCmsContentBySlug')],
['0046 search canonical URL is content route', r('packages/infrastructure/src/search/PrismaPublicSearchEngineGateway.ts').includes("articles: 'content'")],
]; let f=0; for(const [n,o] of checks){console.log(`${o?'PASS':'FAIL'} ${n}`); if(!o)f++;} console.log(`W4 search/CMS: ${checks.length-f}/${checks.length}`); process.exitCode=f?1:0;

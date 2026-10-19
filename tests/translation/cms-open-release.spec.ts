import { describe, expect, it, vi } from 'vitest';
vi.mock('@absheer/shared', async (original) => ({
  ...(await original<typeof import('@absheer/shared')>()),
  PUBLIC_TEMPLATE_LOCALES: ['ar', 'en'],
}));
import { buildCmsSitemapXml } from '../../packages/application/src/cms/use-cases/CmsSeoSitemap';
import { renderCmsPublishedPage } from '../../packages/application/src/cms/use-cases/CmsPublishedPage';
import type { PublicCmsContentDto } from '@absheer/domain';
describe('CMS locale release with a synthetic approved policy only', () => {
  it('preserves actual translated slugs when an isolated release policy enables both languages', () => {
    const entries = [
      { contentId: 'content', locale: 'ar' as const, canonicalPath: '/ar/news/arabic-news' },
      { contentId: 'content', locale: 'en' as const, canonicalPath: '/en/news/english-news' },
    ];
    const xml = buildCmsSitemapXml(entries, 'https://example.test');
    expect(xml).toContain('<loc>https://example.test/en/news/english-news</loc>');
    const content = {
      contentId: 'content',
      siteIdentifier: 'absheer',
      locale: 'en',
      slug: 'english-news',
      contentType: 'NEWS',
      canonicalUrl: '/en/news/english-news',
      publishedAt: new Date('2026-10-14T00:00:00Z'),
      title: 'News',
      body: '<p>Published copy</p>',
      availableLocales: [
        { locale: 'ar', slug: 'arabic-news' },
        { locale: 'en', slug: 'english-news' },
      ],
    } as PublicCmsContentDto;
    const html = renderCmsPublishedPage(content, 'https://example.test');
    expect(html).toContain('<html lang="en" dir="ltr">');
    expect(html).toContain('hreflang="ar" href="https://example.test/ar/news/arabic-news"');
  });
});

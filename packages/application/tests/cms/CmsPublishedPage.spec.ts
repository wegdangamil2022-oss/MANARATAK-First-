import { describe, expect, it } from 'vitest';
import { CmsContentType, PublicCmsContentDto } from '@manaratak/domain';
import { renderCmsPublishedPage } from '../../src/cms/use-cases/CmsPublishedPage';
const publication = (): PublicCmsContentDto => ({
  publicId: 'public-1',
  contentId: 'node-1',
  siteIdentifier: 'manaratak',
  locale: 'ar',
  slug: 'arabic-news',
  canonicalUrl: '/ar/news/arabic-news',
  contentType: CmsContentType.NEWS,
  title: '<img src=x onerror=alert(1)>',
  summary: 'Summary <script>unsafe</script>',
  body: '<p>Current approved text</p><a href="https://example.com" target="_blank">Source</a>',
  categorySlug: null,
  featuredAssetId: null,
  attachmentAssetIds: [],
  tags: [],
  publishedAt: new Date('2026-10-11'),
  versionNumber: 3,
  seoMetadata: {
    title: 'Current SEO',
    description: 'Current description',
    keywords: [],
    noIndex: false,
    noFollow: false,
  },
  availableLocales: [
    { locale: 'ar', slug: 'arabic-news' },
    { locale: 'en', slug: 'english-news' },
  ],
  localizedPayload: {} as PublicCmsContentDto['localizedPayload'],
});
describe('Live CMS publication HTML', () => {
  it('renders approved text, exact canonical, localized alternates and escaped editorial fields', () => {
    const html = renderCmsPublishedPage(publication(), 'https://manaratak.example');
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('<p>Current approved text</p>');
    expect(html).toContain('href="https://manaratak.example/ar/news/arabic-news"');
    expect(html).not.toContain('hreflang="en"');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>unsafe');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it('does not invent English alternates for Arabic-only publications', () => {
    const content = publication();
    content.availableLocales = [{ locale: 'ar', slug: content.slug }];
    const html = renderCmsPublishedPage(content, 'https://manaratak.example');
    expect(html).not.toContain('hreflang="en"');
    expect(html).not.toContain('og:locale:alternate');
  });
  it('rejects untrusted body HTML, foreign sites and incorrect canonical paths', () => {
    for (const content of [
      { ...publication(), body: '<img src="x" onerror="alert(1)">' },
      { ...publication(), siteIdentifier: 'foreign' },
      { ...publication(), canonicalUrl: '/ar/articles/arabic-news' },
    ])
      expect(() => renderCmsPublishedPage(content, 'https://manaratak.example')).toThrow();
  });
  it('rejects spoofed origins and preserves explicit noindex/nofollow', () => {
    for (const origin of [
      'https://user:pass@example.com',
      'http://example.com',
      'https://example.com:8443',
      'https://example.com/path',
    ]) {
      expect(() => renderCmsPublishedPage(publication(), origin)).toThrow();
    }
    const content = publication();
    content.seoMetadata.noIndex = true;
    content.seoMetadata.noFollow = true;
    expect(renderCmsPublishedPage(content, 'https://manaratak.example')).toContain(
      'content="noindex,nofollow"',
    );
  });
});

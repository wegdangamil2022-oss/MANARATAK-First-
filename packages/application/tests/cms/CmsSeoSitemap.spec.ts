import { describe, expect, it } from 'vitest';
import { buildCmsSitemapXml } from '../../src/cms/use-cases/CmsSeoSitemap';

const paths = [
  { contentId: 'news-1', locale: 'ar' as const, canonicalPath: '/ar/news/arabic-news' },
  { contentId: 'news-1', locale: 'en' as const, canonicalPath: '/en/news/english-news' },
  { contentId: 'guide-1', locale: 'ar' as const, canonicalPath: '/ar/study-guides/guide-only' },
];

describe('live CMS sitemap authority', () => {
  it('emits per-content multilingual links using each published locale own slug', () => {
    const xml = buildCmsSitemapXml(paths, 'https://manaratak.example');
    expect(xml).toContain('<loc>https://manaratak.example/ar/news/arabic-news</loc>');
    expect(xml).toContain('<loc>https://manaratak.example/en/news/english-news</loc>');
    expect(xml).toContain('hreflang="en" href="https://manaratak.example/en/news/english-news"');
    const single = xml.split('<loc>https://manaratak.example/ar/study-guides/guide-only</loc>')[1].split('</url>')[0];
    expect(single).not.toContain('hreflang="en"');
    expect(single).toContain('hreflang="x-default"');
  });

  it('never allows caller-controlled domains, credentials, port/path queries or unsafe CMS paths', () => {
    for (const origin of ['http://unsafe.example', 'https://evil@valid.example', 'https://valid.example/subpath', 'https://valid.example:8443', 'not-a-url']) {
      expect(() => buildCmsSitemapXml(paths, origin)).toThrow('CMS_SITEMAP_PUBLIC_URL_INVALID');
    }
    expect(() => buildCmsSitemapXml([
      { contentId: 'draft', locale: 'ar', canonicalPath: '/ar/news/<script>alert(1)</script>' },
    ], 'https://manaratak.example')).toThrow('CMS_SITEMAP_CANONICAL_INVALID');
    expect(() => buildCmsSitemapXml([
      { contentId: 'other', locale: 'en', canonicalPath: '/ar/articles/arabic-only' },
    ], 'https://manaratak.example')).toThrow('CMS_SITEMAP_CANONICAL_INVALID');
  });

  it('rejects duplicate locale publications instead of emitting an ambiguous hreflang graph', () => {
    expect(() => buildCmsSitemapXml([
      paths[0], { contentId: 'news-1', locale: 'ar', canonicalPath: '/ar/news/conflicting-slug' },
    ], 'https://manaratak.example')).toThrow('CMS_SITEMAP_DUPLICATE_LOCALE');
  });

  it('emits a well-formed empty XML sitemap when there are no published CMS pages', () => {
    const xml = buildCmsSitemapXml([], 'https://manaratak.example');
    expect(xml).toContain('<urlset ');
    expect(xml).toContain('</urlset>');
    expect(xml).not.toContain('<url>');
  });
});

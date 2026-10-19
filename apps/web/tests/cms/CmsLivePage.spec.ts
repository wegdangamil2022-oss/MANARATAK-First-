import { describe, expect, it } from 'vitest';
import { cmsAppEntrySource } from '../../config/CmsAppEntryPlugin';
import { cmsArticleSeoProjection } from '../../src/features/public-template/components/CmsArticleSeo';
import type { PublicArticle } from '../../src/features/public-template/types';
const article = (): PublicArticle => ({
  id: 'news',
  slug: 'news',
  titleAr: 'News',
  titleEn: 'News',
  contentType: 'NEWS',
  canonicalUrl: '/ar/news/news',
  contentTypeLabelAr: '',
  categoryAr: '',
  author: '',
  updatedAt: '2026-10-11',
  excerptAr: '',
  sections: [],
  cmsSeo: {
    locale: 'ar',
    availableLocales: [{ locale: 'ar', slug: 'news' }],
    title: 'Owner title',
    description: 'Owner description',
    noIndex: true,
    noFollow: true,
  },
});
describe('CMS progressive HTML and owner SEO', () => {
  it('boots the actual generated entry and CSS without guessed asset hashes', () => {
    const source = cmsAppEntrySource(
      '<script type="module" crossorigin src="/assets/index-A1.js"></script><link rel="stylesheet" crossorigin href="/assets/index-B1.css">',
    );
    expect(source).toContain('import("/assets/index-A1.js")');
    expect(source).toContain('/assets/index-B1.css');
    expect(() =>
      cmsAppEntrySource('<script type="module" src="https://unsafe.example/app.js">'),
    ).toThrow('CMS_APP_ENTRY_MISSING');
  });
  it('retains noindex and never invents unpublished English alternate', () => {
    const result = cmsArticleSeoProjection(article(), 'https://absheer.example');
    expect(result?.robots).toBe('noindex,nofollow');
    expect(result?.alternates).toEqual([
      { locale: 'ar', href: 'https://absheer.example/ar/news/news' },
    ]);
  });
  it('uses distinct published translated slugs and rejects canonical mismatch', () => {
    const item = article();
    item.cmsSeo!.availableLocales.push({ locale: 'en', slug: 'english-news' });
    expect(cmsArticleSeoProjection(item, 'https://absheer.example')?.alternates).toEqual([
      {locale:'ar',href:'https://absheer.example/ar/news/news'},
    ]);
    item.canonicalUrl = '/ar/news/old';
    expect(cmsArticleSeoProjection(item, 'https://absheer.example')).toBeNull();
  });
  it('never indexes a gated English CMS page even with a published owner locale',()=>{
    const item=article();item.cmsSeo!.locale='en';item.cmsSeo!.noIndex=false;
    item.canonicalUrl='/en/news/news';
    expect(cmsArticleSeoProjection(item,'https://absheer.example')?.robots).toBe('noindex,nofollow');
  });

});

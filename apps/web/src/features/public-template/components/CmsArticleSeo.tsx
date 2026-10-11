import { useEffect } from 'react';
import type { PublicArticle } from '../types';

const segments: Record<PublicArticle['contentType'], string> = {
  ARTICLE: 'articles',
  NEWS: 'news',
  STUDY_GUIDE: 'study-guides',
  CHECKLIST: 'checklists',
  FAQ: 'faqs',
  STATIC_PAGE: 'pages',
  LANDING_PAGE: 'landing',
};

export function cmsArticleSeoProjection(article: PublicArticle, baseUrl: string) {
  const seo = article.cmsSeo;
  if (!seo || !['ar', 'en'].includes(seo.locale)) return null;
  const origin = new URL(baseUrl);
  if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password)
    return null;
  const path = (locale: string, slug: string) => {
    if (!['ar', 'en'].includes(locale) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      throw new Error('CMS_SEO_PATH_INVALID');
    return `/${locale}/${segments[article.contentType]}/${slug}`;
  };
  const canonical = path(seo.locale, article.slug);
  if (canonical !== article.canonicalUrl) return null;
  const alternates = seo.availableLocales.map((entry) => ({
    locale: entry.locale,
    href: origin.origin + path(entry.locale, entry.slug),
  }));
  if (new Set(alternates.map((entry) => entry.locale)).size !== alternates.length) return null;
  return {
    title: `${seo.title} | MANARATAK`,
    description: seo.description,
    canonical: origin.origin + canonical,
    robots: `${seo.noIndex ? 'noindex' : 'index'},${seo.noFollow ? 'nofollow' : 'follow'}`,
    locale: seo.locale,
    alternates,
    updatedAt: article.updatedAt,
  };
}

/** CMS alternates come only from the canonical owner's published locale set. */
export function CmsArticleSeo({ article }: { article: PublicArticle }) {
  useEffect(() => {
    let projection: ReturnType<typeof cmsArticleSeoProjection>;
    try {
      projection = cmsArticleSeoProjection(
        article,
        import.meta.env.VITE_PUBLIC_WEB_URL || window.location.origin,
      );
    } catch {
      projection = null;
    }
    if (!projection) return;
    document.head
      .querySelectorAll(
        'meta[name="description"],meta[name="robots"],meta[property^="og:"],link[rel="canonical"],link[rel="alternate"][hreflang],[data-cms-owner-seo]',
      )
      .forEach((node) => node.remove());
    const elements: HTMLElement[] = [];
    const append = (tag: string, attributes: Record<string, string>) => {
      const element = document.createElement(tag);
      element.dataset.cmsOwnerSeo = '';
      for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
      document.head.appendChild(element);
      elements.push(element);
      return element;
    };
    document.title = projection.title;
    for (const [name, content] of [
      ['description', projection.description],
      ['robots', projection.robots],
    ])
      append('meta', { name, content });
    for (const [property, content] of [
      ['og:title', projection.title],
      ['og:description', projection.description],
      ['og:url', projection.canonical],
      ['og:type', 'article'],
      ['og:locale', projection.locale === 'ar' ? 'ar_AR' : 'en_US'],
    ])
      append('meta', { property, content });
    append('link', { rel: 'canonical', href: projection.canonical });
    for (const entry of projection.alternates)
      append('link', { rel: 'alternate', hreflang: entry.locale, href: entry.href });
    const arabic = projection.alternates.find((entry) => entry.locale === 'ar');
    if (arabic) append('link', { rel: 'alternate', hreflang: 'x-default', href: arabic.href });
    if (projection.alternates.length > 1)
      append('meta', {
        property: 'og:locale:alternate',
        content: projection.locale === 'ar' ? 'en_US' : 'ar_AR',
      });
    const structured = append('script', { type: 'application/ld+json' });
    structured.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.titleAr,
      url: projection.canonical,
      inLanguage: projection.locale,
      datePublished: projection.updatedAt,
    });
    return () => {
      elements.forEach((element) => element.remove());
      document.title = 'MANARATAK';
    };
  }, [article]);
  return null;
}

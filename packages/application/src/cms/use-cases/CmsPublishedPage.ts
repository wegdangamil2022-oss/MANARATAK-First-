import { CmsPublishingPolicy, PublicCmsContentDto, PublicCmsBlockDto } from '@manaratak/domain';
import { cmsPublicOrigin } from './CmsSeoSitemap';

const escape = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/** Render only the current immutable publication, never an editor draft or build artifact. */
export function renderCmsPublishedPage(
  content: PublicCmsContentDto,
  baseUrl: string,
  blocks: readonly PublicCmsBlockDto[] = [],
): string {
  const origin = cmsPublicOrigin(baseUrl);
  if (content.siteIdentifier !== 'manaratak' || !['ar', 'en'].includes(content.locale)) {
    throw new Error('CMS_PAGE_SCOPE_INVALID');
  }
  const canonical = CmsPublishingPolicy.canonicalPath(
    content.locale,
    content.contentType,
    content.slug,
  );
  if (canonical !== content.canonicalUrl) throw new Error('CMS_PAGE_CANONICAL_INVALID');
  CmsPublishingPolicy.assertSafeRichText(content.body);
  const seo = content.seoMetadata;
  const title = seo?.title || content.title;
  const description = seo?.description || content.summary || '';
  const languages = new Map<string, string>();
  for (const entry of content.availableLocales) {
    if (!['ar', 'en'].includes(entry.locale) || languages.has(entry.locale)) {
      throw new Error('CMS_PAGE_ALTERNATE_INVALID');
    }
    languages.set(
      entry.locale,
      origin + CmsPublishingPolicy.canonicalPath(entry.locale, content.contentType, entry.slug),
    );
  }
  const alternates = [...languages]
    .map(([locale, url]) => `<link rel="alternate" hreflang="${locale}" href="${escape(url)}">`)
    .join('\n');
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: content.title,
    description,
    url: origin + canonical,
    inLanguage: content.locale,
    datePublished: new Date(content.publishedAt).toISOString(),
  })
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
  const ar = content.locale === 'ar';
  // All rich-text tags/attributes were checked above; no raw JS, images or asset URLs.
  const body = content.body
    .replace(/\srel=(['"])[^'"]*\1/gi, '')
    .replace(/<a\s/gi, '<a rel="noopener noreferrer" ');
  const publishedBlocks = blocks
    .filter(
      (block) => block.siteIdentifier === content.siteIdentifier && block.locale === content.locale,
    )
    .map((block) => {
      // Public block presentation supports title/body/summary. Unknown schema
      // extensions and EAP handles never become raw markup or image URLs.
      const title = typeof block.payload.title === 'string' ? block.payload.title : block.name;
      const text =
        typeof block.payload.body === 'string'
          ? block.payload.body
          : typeof block.payload.summary === 'string'
            ? block.payload.summary
            : '';
      return `<section><h2>${escape(title)}</h2>${text ? `<p>${escape(text)}</p>` : ''}</section>`;
    })
    .join('');
  return `<!doctype html><html lang="${content.locale}" dir="${ar ? 'rtl' : 'ltr'}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} | MANARATAK</title>
<meta name="description" content="${escape(description)}">
<meta name="robots" content="${seo?.noIndex ? 'noindex' : 'index'},${seo?.noFollow ? 'nofollow' : 'follow'}">
<link rel="canonical" href="${escape(origin + canonical)}">${alternates}
${languages.has('ar') ? `<link rel="alternate" hreflang="x-default" href="${escape(languages.get('ar'))}">` : ''}
<meta property="og:title" content="${escape(seo?.openGraphTitle || title)}">
<meta property="og:description" content="${escape(seo?.openGraphDescription || description)}">
<meta property="og:url" content="${escape(origin + canonical)}"><meta property="og:type" content="article">
<meta property="og:locale" content="${ar ? 'ar_AR' : 'en_US'}">
${languages.has('ar') && languages.has('en') ? `<meta property="og:locale:alternate" content="${ar ? 'en_US' : 'ar_AR'}">` : ''}
<script data-cms-owner-seo type="application/ld+json">${jsonLd}</script>
<style>body{margin:0;background:#f8fafc;color:#142b5f;font:18px/1.8 system-ui}header,main{max-width:900px;margin:auto;padding:24px}header{display:flex;flex-wrap:wrap;gap:20px}a{color:#0e7c86}article{background:white;padding:32px;border-radius:20px;overflow-wrap:anywhere}h1{line-height:1.4}nav{display:flex;gap:16px}</style>
</head><body><div id="root"><header><a href="/${content.locale}">MANARATAK</a><a href="/${content.locale}/articles">${ar ? 'المقالات' : 'Articles'}</a><nav aria-label="${ar ? 'لغة المحتوى' : 'Content language'}">${[...languages].map(([locale, url]) => `<a href="${escape(url)}" lang="${locale}" hreflang="${locale}">${locale === 'ar' ? 'العربية' : 'English'}</a>`).join('')}</nav></header>
<main><article><h1>${escape(content.title)}</h1>${content.summary ? `<p>${escape(content.summary)}</p>` : ''}<div>${body}</div></article>${publishedBlocks}</main></div><script type="module" src="/cms-app-entry.js"></script></body></html>`;
}

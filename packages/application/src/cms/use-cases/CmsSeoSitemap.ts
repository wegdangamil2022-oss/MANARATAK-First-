import { CmsSitemapEntryDto } from '@manaratak/domain';

const CMS_CANONICAL_PATH = /^\/(?:ar|en)\/(?:articles|news|study-guides|checklists|faqs|pages|landing)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

function xml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function publicOrigin(raw: string): string {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('CMS_SITEMAP_PUBLIC_URL_INVALID'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
      (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new Error('CMS_SITEMAP_PUBLIC_URL_INVALID');
  }
  return url.origin;
}

/** A live, publication-aware CMS-only sitemap. It never reads authoring rows. */
export function buildCmsSitemapXml(entries: readonly CmsSitemapEntryDto[], baseUrl: string): string {
  const base = publicOrigin(baseUrl);
  if (entries.length > 50_000) throw new Error('CMS_SITEMAP_SPLIT_REQUIRED');
  const groups = new Map<string, Partial<Record<'ar' | 'en', string>>>();
  for (const entry of entries) {
    if ((entry.locale !== 'ar' && entry.locale !== 'en') ||
        !CMS_CANONICAL_PATH.test(entry.canonicalPath) ||
        !entry.canonicalPath.startsWith(`/${entry.locale}/`) ||
        !entry.contentId.trim()) {
      throw new Error('CMS_SITEMAP_CANONICAL_INVALID');
    }
    const locales = groups.get(entry.contentId) ?? {};
    if (locales[entry.locale]) throw new Error('CMS_SITEMAP_DUPLICATE_LOCALE');
    locales[entry.locale] = `${base}${entry.canonicalPath}`;
    groups.set(entry.contentId, locales);
  }
  const rows = entries.map((entry) => {
    const languages = groups.get(entry.contentId)!;
    const alternates = (['ar', 'en'] as const)
      .filter((locale) => languages[locale])
      .map((locale) =>
        `    <xhtml:link rel="alternate" hreflang="${locale}" href="${xml(languages[locale]!)}" />`);
    if (languages.ar) {
      alternates.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xml(languages.ar)}" />`);
    }
    return [
      '  <url>',
      `    <loc>${xml(`${base}${entry.canonicalPath}`)}</loc>`,
      ...alternates, '  </url>',
    ].join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...rows, '</urlset>', '',
  ].join('\n');
}

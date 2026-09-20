import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const STATIC_ROUTES = [
  ['/', 'MANARATAK', 'Discover scholarships, universities, majors, courses, services, international tests and student tools.', 'website'],
  ['/scholarships', 'Scholarships', 'Discover verified scholarship opportunities.', 'CollectionPage'],
  ['/universities', 'Universities', 'Explore universities and study destinations.', 'CollectionPage'],
  ['/countries', 'Study destinations', 'Explore countries and study destinations.', 'CollectionPage'],
  ['/majors', 'Majors', 'Explore academic majors and study paths.', 'CollectionPage'],
  ['/courses', 'Courses', 'Explore MANARATAK and global learning opportunities.', 'CollectionPage'],
  ['/international-tests', 'International tests', 'Explore international admissions and language tests.', 'CollectionPage'],
  ['/articles', 'Articles', 'Read verified student and study guidance.', 'CollectionPage'],
  ['/services', 'Student services', 'Explore governed MANARATAK student services.', 'CollectionPage'],
  ['/careers', 'Careers', 'Explore career opportunities and guidance.', 'CollectionPage'],
  ['/tools', 'Student tools', 'Explore MANARATAK student tools and planning utilities.', 'CollectionPage'],
  ['/certificates/verify', 'Verify certificate', 'Verify a MANARATAK certificate.', 'WebPage'],
];

const DYNAMIC_CATALOGS = [
  { route: '/scholarships', api: '/public/scholarships', type: 'Scholarship' },
  { route: '/universities', api: '/public/universities', type: 'CollegeOrUniversity' },
  { route: '/countries', api: '/public/study-destinations', type: 'Place' },
  { route: '/majors', api: '/public/majors', type: 'EducationalOccupationalProgram' },
  { route: '/courses', api: '/public/courses', type: 'Course' },
  { route: '/international-tests', api: '/public/international-tests', type: 'EducationalOccupationalCredential' },
  { route: '/services', api: '/public/services', type: 'Service' },
  { route: '/careers', api: '/public/careers/jobs', type: 'JobPosting' },
];

function arg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function stripLocale(pathname) {
  const value = pathname.replace(/^\/(?:ar|en)(?=\/|$)/, '');
  return value || '/';
}

function localizedPath(pathname, locale) {
  const bare = stripLocale(pathname);
  return bare === '/' ? `/${locale}` : `/${locale}${bare}`;
}

function normalizeBase(value) {
  const base = String(value || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(base)) throw new Error('PUBLIC_WEB_URL must be an absolute http(s) URL');
  return base;
}

function titleOf(item, locale) {
  const preferred = locale === 'ar'
    ? [item.titleAr, item.nameAr, item.canonicalNameAr, item.title, item.name, item.canonicalName]
    : [item.titleEn, item.nameEn, item.canonicalNameEn, item.title, item.name, item.canonicalName];
  return preferred.find((value) => typeof value === 'string' && value.trim())?.trim() || String(item.slug || item.publicId || item.id || 'MANARATAK');
}

function descriptionOf(item, locale, fallback) {
  const values = locale === 'ar'
    ? [item.summaryAr, item.descriptionAr, item.overviewAr, item.summary, item.description]
    : [item.summaryEn, item.descriptionEn, item.overviewEn, item.summary, item.description];
  return values.find((value) => typeof value === 'string' && value.trim())?.trim().slice(0, 320) || fallback;
}

function inject(html, meta) {
  const robots = meta.noIndex ? 'noindex,nofollow' : 'index,follow';
  const jsonLd = JSON.stringify(meta.jsonLd).replaceAll('<', '\\u003c');
  const tags = `\n    <title>${escapeHtml(meta.title)} | MANARATAK</title>\n` +
    `    <meta name="description" content="${escapeHtml(meta.description)}" />\n` +
    `    <meta name="robots" content="${robots}" />\n` +
    `    <link rel="canonical" href="${escapeHtml(meta.canonical)}" />\n` +
    `    <link rel="alternate" hreflang="ar" href="${escapeHtml(meta.ar)}" />\n` +
    `    <link rel="alternate" hreflang="en" href="${escapeHtml(meta.en)}" />\n` +
    `    <link rel="alternate" hreflang="x-default" href="${escapeHtml(meta.ar)}" />\n` +
    `    <meta property="og:title" content="${escapeHtml(meta.title)} | MANARATAK" />\n` +
    `    <meta property="og:description" content="${escapeHtml(meta.description)}" />\n` +
    `    <meta property="og:type" content="website" />\n` +
    `    <meta property="og:url" content="${escapeHtml(meta.canonical)}" />\n` +
    `    <meta property="og:locale" content="${meta.locale === 'ar' ? 'ar_AR' : 'en_US'}" />\n` +
    `    <meta property="og:locale:alternate" content="${meta.locale === 'ar' ? 'en_US' : 'ar_AR'}" />\n` +
    `    <script type="application/ld+json">${jsonLd}</script>\n`;
  return html
    .replace(/\s*<title>[^<]*<\/title>/i, '')
    .replace(/\s*<meta\s+name="description"[^>]*>/i, '')
    .replace(/\s*<meta\s+property="og:title"[^>]*>/i, '')
    .replace(/\s*<meta\s+property="og:description"[^>]*>/i, '')
    .replace(/\s*<meta\s+property="og:type"[^>]*>/i, '')
    .replace('</head>', `${tags}  </head>`)
    .replace('<html lang="ar" dir="rtl">', `<html lang="${meta.locale}" dir="${meta.locale === 'ar' ? 'rtl' : 'ltr'}">`);
}

async function fetchAll(apiBase, catalog, locale) {
  const results = [];
  let cursor = null;
  for (let guard = 0; guard < 1000; guard += 1) {
    const url = new URL(`${apiBase}${catalog.api}`);
    url.searchParams.set('locale', locale);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Prerender discovery failed ${response.status} ${url}`);
    const body = await response.json();
    const items = Array.isArray(body.items) ? body.items : Array.isArray(body.data) ? body.data : [];
    results.push(...items);
    cursor = body.nextCursor || null;
    if (!cursor) break;
  }
  return results;
}

async function writeRoute(distDir, pathname, html) {
  const clean = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  const output = resolve(distDir, clean || '.', 'index.html');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html, 'utf8');
}

async function main() {
  const distDir = resolve(arg('dist') || 'apps/web/dist');
  const publicBase = normalizeBase(arg('public-url') || process.env.PUBLIC_WEB_URL || process.env.VITE_PUBLIC_WEB_URL);
  const apiBaseRaw = arg('api-url') || process.env.PUBLIC_PRERENDER_API_URL || process.env.VITE_API_URL;
  const apiBase = apiBaseRaw ? String(apiBaseRaw).replace(/\/+$/, '') : null;
  const staticOnly = process.argv.includes('--static-only');
  if (!apiBase && !staticOnly) throw new Error('PUBLIC_PRERENDER_API_URL/VITE_API_URL is required for canonical detail prerendering; use --static-only only for local source verification.');

  const template = await readFile(resolve(distDir, 'index.html'), 'utf8');
  const manifest = [];
  for (const locale of ['ar', 'en']) {
    for (const [route, title, description, schemaType] of STATIC_ROUTES) {
      const path = localizedPath(route, locale);
      const canonical = `${publicBase}${path}`;
      const ar = `${publicBase}${localizedPath(route, 'ar')}`;
      const en = `${publicBase}${localizedPath(route, 'en')}`;
      const jsonLd = { '@context': 'https://schema.org', '@type': schemaType, name: title, description, url: canonical, inLanguage: locale };
      await writeRoute(distDir, path, inject(template, { title, description, canonical, ar, en, locale, jsonLd }));
      manifest.push({ path, canonical, kind: 'static' });
    }
  }

  if (apiBase) {
    for (const catalog of DYNAMIC_CATALOGS) {
      for (const locale of ['ar', 'en']) {
        const items = await fetchAll(apiBase, catalog, locale);
        for (const item of items) {
          const slug = item.slug || item.publicSlug;
          if (!slug) continue;
          const bare = `${catalog.route}/${encodeURIComponent(String(slug))}`;
          const path = localizedPath(bare, locale);
          const canonical = `${publicBase}${path}`;
          const ar = `${publicBase}${localizedPath(bare, 'ar')}`;
          const en = `${publicBase}${localizedPath(bare, 'en')}`;
          const title = titleOf(item, locale);
          const description = descriptionOf(item, locale, title);
          const jsonLd = { '@context': 'https://schema.org', '@type': catalog.type, name: title, description, url: canonical, identifier: item.publicId || item.id || slug, inLanguage: locale };
          await writeRoute(distDir, path, inject(template, { title, description, canonical, ar, en, locale, jsonLd }));
          manifest.push({ path, canonical, kind: 'detail', source: catalog.api });
        }
      }
    }
  }

  await writeFile(resolve(distDir, 'prerender-manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), staticOnly, routes: manifest }, null, 2), 'utf8');
  await writeFile(resolve(distDir, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /student\nDisallow: /login\nSitemap: ${publicBase}/sitemap.xml\n`, 'utf8');
  console.log(`PUBLIC_PRERENDER=PASS routes=${manifest.length} staticOnly=${staticOnly}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

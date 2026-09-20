import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@manaratak/shared';
import { localizePathname } from '../apps/web/src/i18n/localeRouting';
import { normalizePublicBaseUrl } from '../apps/web/src/seo/localeSeo';

export const STATIC_INDEXABLE_PUBLIC_PATHS = [
  '/',
  '/scholarships',
  '/universities',
  '/majors',
  '/courses',
  '/international-tests',
  '/articles',
  '/services',
  '/tools',
] as const;

export function generateLocalizedPublicSitemap(baseUrlInput: string): string {
  const baseUrl = normalizePublicBaseUrl(baseUrlInput);

  const urls = STATIC_INDEXABLE_PUBLIC_PATHS.flatMap((pathname) =>
    SUPPORTED_LOCALES.map((locale) =>
      buildUrlEntry(baseUrl, pathname, locale),
    ),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

function buildUrlEntry(
  baseUrl: string,
  pathname: string,
  locale: SupportedLocale,
): string {
  const current = `${baseUrl}${localizePathname(pathname, locale)}`;
  const ar = `${baseUrl}${localizePathname(pathname, 'ar')}`;
  const en = `${baseUrl}${localizePathname(pathname, 'en')}`;

  return [
    '  <url>',
    `    <loc>${escapeXml(current)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(ar)}" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(en)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(ar)}" />`,
    '  </url>',
  ].join('\n');
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const cliBaseUrl = args
    .find((arg) => arg.startsWith('--base-url='))
    ?.slice('--base-url='.length);

  const baseUrl =
    cliBaseUrl ??
    process.env.VITE_PUBLIC_WEB_URL ??
    process.env.PUBLIC_WEB_URL;

  if (!baseUrl) {
    throw new Error(
      'Set VITE_PUBLIC_WEB_URL/PUBLIC_WEB_URL or pass --base-url=https://...',
    );
  }

  const sitemap = generateLocalizedPublicSitemap(baseUrl);

  if (dryRun) {
    process.stdout.write(sitemap);
    return;
  }

  const outputPath = resolve(
    process.cwd(),
    'apps/web/public/sitemap.xml',
  );

  await writeFile(outputPath, sitemap, 'utf8');
  process.stdout.write(`Wrote ${outputPath}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

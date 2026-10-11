import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const ar = {
  publicId: 'cms-public-1', contentId: 'node-1', siteIdentifier: 'manaratak',
  locale: 'ar', slug: 'arabic-news', canonicalUrl: '/ar/news/arabic-news',
  contentType: 'NEWS', title: 'خبر عربي', summary: 'ملخص',
  publishedAt: '2026-10-10T10:00:00.000Z',
  seoMetadata: { title: 'العنوان العربي', description: 'الوصف العربي', noIndex: false },
  availableLocales: [{ locale: 'ar', slug: 'arabic-news' }, { locale: 'en', slug: 'english-news' }],
};
const en = {
  ...ar, locale: 'en', slug: 'english-news', canonicalUrl: '/en/news/english-news',
  title: 'English news', summary: 'Summary',
  seoMetadata: { title: 'English SEO title', description: 'English SEO description', noIndex: false },
};
const excluded = {
  ...en, contentId: 'node-private', publicId: 'cms-private',
  slug: 'no-index', canonicalUrl: '/en/news/no-index',
  seoMetadata: { ...en.seoMetadata, noIndex: true },
};

async function runPrerender(dist: string, apiUrl: string): Promise<{ code: number; output: string }> {
  const args = [
    resolve(process.cwd(), 'scripts/prerender-public-seo.mjs'),
    `--dist=${dist}`, '--public-url=https://manaratak.example',
    `--api-url=${apiUrl}`,
  ];
  const child = spawn(process.execPath, args, { cwd: process.cwd(), env: process.env });
  let output = '';
  child.stdout.on('data', (part: Buffer) => { output += part.toString(); });
  child.stderr.on('data', (part: Buffer) => { output += part.toString(); });
  const code = await new Promise<number>((resolveRun, reject) => {
    child.on('error', reject);
    child.on('close', (status) => resolveRun(status ?? -1));
  });
  return { code, output };
}

describe('CMS prerender source contract (local mock API, no database/provider)', () => {
  let server: Server | null = null;
  let dist = '';

  afterEach(async () => {
    if (server) await new Promise<void>((done) => server!.close(() => done()));
    server = null;
    if (dist) await rm(dist, { recursive: true, force: true });
    dist = '';
  });

  it('renders published CMS canonical paths, real alternate slugs and indexable sitemap only', async () => {
    dist = await mkdtemp(resolve(tmpdir(), 'cms-seo-source-'));
    await writeFile(resolve(dist, 'index.html'), '<html lang="ar" dir="rtl"><head><title>Base</title></head><body>Public</body></html>');
    server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://localhost');
      res.setHeader('content-type', 'application/json');
      if (url.pathname === '/public/cms/content') {
        const locale = url.searchParams.get('locale');
        res.end(JSON.stringify({ data: locale === 'ar' ? [ar] : [en, excluded], totalPages: 1 }));
      } else {
        res.end(JSON.stringify({ data: [], nextCursor: null }));
      }
    });
    await new Promise<void>((done) => server!.listen(0, '127.0.0.1', done));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('LOCAL_FIXTURE_PORT_MISSING');
    const result = await runPrerender(dist, `http://127.0.0.1:${address.port}`);
    expect(result.code, result.output).toBe(0);

    const arHtml = await readFile(resolve(dist, 'ar/news/arabic-news/index.html'), 'utf8');
    const enHtml = await readFile(resolve(dist, 'en/news/english-news/index.html'), 'utf8');
    const sitemap = await readFile(resolve(dist, 'sitemap.xml'), 'utf8');
    const manifest = JSON.parse(await readFile(resolve(dist, 'prerender-manifest.json'), 'utf8'));

    expect(arHtml).toContain('rel="canonical" href="https://manaratak.example/ar/news/arabic-news"');
    expect(arHtml).toContain('hreflang="en" href="https://manaratak.example/en/news/english-news"');
    expect(enHtml).toContain('English SEO title');
    expect(sitemap).toContain('<loc>https://manaratak.example/ar/news/arabic-news</loc>');
    expect(sitemap).toContain('<loc>https://manaratak.example/en/news/english-news</loc>');
    expect(sitemap).not.toContain('/en/news/no-index');
    expect(manifest.routes.filter((entry: { kind: string }) => entry.kind === 'cms')).toHaveLength(2);
  });
});

import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { PrismaPublicSearchEngineGateway } from '../../src/search/PrismaPublicSearchEngineGateway';

describe('public search CMS publication boundary', () => {
  it('reads the live localized snapshot while excluding drafts, archived pages and other sites', async () => {
    let sql = '';
    const gateway = new PrismaPublicSearchEngineGateway({
      $queryRaw: async (query: { sql: string }) => {
        sql = query.sql;
        return [];
      },
    } as never);
    await gateway.searchPublic({ query: 'approved', locale: 'ar', limit: 20, kinds: ['articles'] });

    // Execute the actual CMS candidate SELECT emitted by the gateway against
    // synthetic rows. SQLite supports this subset of the PostgreSQL query.
    const fragment = sql.match(/SELECT 'articles'[\s\S]*?(?=\s+UNION ALL\s+SELECT 'services')/)?.[0];
    expect(fragment).toBeTruthy();
    const db = new DatabaseSync(':memory:');
    try {
      db.function('concat_ws', { varargs: true }, (...parts) =>
        parts.slice(1).filter((part) => part !== null).join(String(parts[0])),
      );
      db.exec(`
        CREATE TABLE "CmsPublishedContent" (
          "contentId" TEXT, slug TEXT, title TEXT, summary TEXT, "contentType" TEXT,
          "categorySlug" TEXT, status TEXT, locale TEXT, "siteIdentifier" TEXT
        );
        CREATE TABLE "CmsContentNode" (id TEXT, status TEXT, slug TEXT, title TEXT, summary TEXT, "contentType" TEXT, "categorySlug" TEXT);
        CREATE TABLE "CmsLocalizedContent" ("contentId" TEXT, locale TEXT, state TEXT, "localizedSlug" TEXT, title TEXT, summary TEXT);
        INSERT INTO "CmsPublishedContent" VALUES
          ('article-1', 'published-ar', 'approved Arabic title', 'approved Arabic summary', 'ARTICLE', 'news', 'PUBLISHED', 'ar', 'manaratak'),
          ('article-1', 'published-en', 'approved English title', 'approved English summary', 'ARTICLE', 'news', 'PUBLISHED', 'en', 'manaratak'),
          ('article-2', 'archived', 'archived title', '', 'ARTICLE', 'news', 'ARCHIVED', 'ar', 'manaratak'),
          ('article-3', 'other-site', 'other site title', '', 'ARTICLE', 'news', 'PUBLISHED', 'ar', 'other-site');
        INSERT INTO "CmsContentNode" VALUES ('article-1', 'PUBLISHED', 'root-slug', 'secret draft title', 'secret draft summary', 'ARTICLE', 'news');
        INSERT INTO "CmsLocalizedContent" VALUES ('article-1', 'ar', 'DRAFT', 'draft-slug', 'secret draft title', 'secret draft summary');
        INSERT INTO "CmsLocalizedContent" VALUES ('article-1', 'en', 'PUBLISHED', 'published-en', 'approved English title', 'approved English summary');
      `);
      const candidateRows = db.prepare(`WITH candidate(kind, id, slug, title, subtitle, originType, contentType, document) AS (${fragment}) SELECT * FROM candidate`);
      const arabic = candidateRows.all('ar');
      expect(arabic).toHaveLength(1);
      expect(arabic[0]).toMatchObject({ id: 'article-1', slug: 'published-ar', title: 'approved Arabic title', subtitle: 'approved Arabic summary' });
      expect(JSON.stringify(arabic)).not.toContain('secret draft');
      expect(candidateRows.all('en')).toEqual([
        expect.objectContaining({ id: 'article-1', slug: 'published-en', title: 'approved English title' }),
      ]);
    } finally {
      db.close();
    }
  });
});

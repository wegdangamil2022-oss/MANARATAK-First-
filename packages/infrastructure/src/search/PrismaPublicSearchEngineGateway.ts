import { Prisma, PrismaClient } from '@prisma/client';
import { SearchRequest, SearchResult, type SearchMatch } from '@manaratak/domain';
import type {
  IPublicSearchGateway,
  PublicSearchCursorPage,
  PublicSearchInput,
  PublicSearchKind,
} from '@manaratak/application';

type SearchRow = {
  kind: PublicSearchKind;
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  originType: string | null;
  contentType: string | null;
  score: number;
};

type CursorShape = { score: number; title: string; kind: PublicSearchKind; id: string };

const ALL_KINDS: readonly PublicSearchKind[] = [
  'scholarships',
  'universities',
  'majors',
  'countries',
  'courses',
  'exams',
  'articles',
  'services',
  'tools',
  'jobs',
];

function encodeCursor(value: CursorShape): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}
function decodeCursor(value?: string): CursorShape | null {
  if (!value) return null;
  try {
    const raw = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<CursorShape>;
    if (
      !Number.isFinite(raw.score) ||
      typeof raw.title !== 'string' ||
      typeof raw.id !== 'string' ||
      !ALL_KINDS.includes(raw.kind as PublicSearchKind)
    )
      return null;
    return raw as CursorShape;
  } catch {
    return null;
  }
}

export class PrismaPublicSearchEngineGateway implements IPublicSearchGateway {
  public constructor(private readonly prisma: PrismaClient) {}

  public async execute(request: SearchRequest): Promise<SearchResult> {
    if (request.scope.getValue() !== 'PUBLIC_CATALOG') throw new Error('SEARCH_SCOPE_UNSUPPORTED');
    if (request.pagination.page !== 1) throw new Error('PUBLIC_SEARCH_REQUIRES_CURSOR_PAGINATION');
    const startedAt = Date.now();
    const page = await this.searchPublic({
      query: request.criteria.query,
      locale: 'ar',
      limit: request.pagination.limit,
    });
    return new SearchResult(
      page.items.length + (page.hasMore ? 1 : 0),
      Date.now() - startedAt,
      page.items,
    );
  }

  public async searchPublic(input: PublicSearchInput): Promise<PublicSearchCursorPage> {
    const query = input.query.trim();
    if (!query) return { items: [], hasMore: false, nextCursor: null };
    const limit = Math.max(1, Math.min(input.limit, 50));
    const cursor = decodeCursor(input.cursor);
    if (input.cursor && !cursor) throw new Error('SEARCH_CURSOR_INVALID');
    const kinds = (input.kinds?.length ? input.kinds : [...ALL_KINDS]).filter(
      (kind, index, values) => ALL_KINDS.includes(kind) && values.indexOf(kind) === index,
    );
    if (!kinds.length) return { items: [], hasMore: false, nextCursor: null };

    const titleCourse =
      input.locale === 'en' ? Prisma.sql`c."canonicalName"` : Prisma.sql`c."displayName"`;
    const titleUniversity =
      input.locale === 'en' ? Prisma.sql`u."canonicalName"` : Prisma.sql`u."displayName"`;
    const titleScholarship =
      input.locale === 'en' ? Prisma.sql`s."canonicalName"` : Prisma.sql`s."displayName"`;
    const titleMajor =
      input.locale === 'en'
        ? Prisma.sql`COALESCE(m."localizedNameEn", m."canonicalName")`
        : Prisma.sql`COALESCE(m."localizedNameAr", m."displayName")`;
    const titleExam =
      input.locale === 'en'
        ? Prisma.sql`COALESCE(t."localizedNameEn", t."canonicalName")`
        : Prisma.sql`COALESCE(t."localizedNameAr", t."displayName")`;
    const titleCountry =
      input.locale === 'en' ? Prisma.sql`co."name"` : Prisma.sql`COALESCE(co."nameAr", co."name")`;
    const titleTool = input.locale === 'en' ? Prisma.sql`st."nameEn"` : Prisma.sql`st."nameAr"`;

    const cursorClause = cursor
      ? Prisma.sql`
      AND (
        r.score < ${cursor.score}
        OR (r.score = ${cursor.score} AND lower(r.title) > lower(${cursor.title}))
        OR (r.score = ${cursor.score} AND lower(r.title) = lower(${cursor.title}) AND r.kind > ${cursor.kind})
        OR (r.score = ${cursor.score} AND lower(r.title) = lower(${cursor.title}) AND r.kind = ${cursor.kind} AND r.id > ${cursor.id})
      )`
      : Prisma.empty;
    const kindClause = Prisma.sql`AND r.kind IN (${Prisma.join(kinds)})`;

    const rows = await this.prisma.$queryRaw<SearchRow[]>(Prisma.sql`
      WITH candidates AS (
        SELECT 'courses'::text AS kind, c.id, c.slug, ${titleCourse}::text AS title,
          COALESCE(c."providerName", c."platformName", '')::text AS subtitle,
          c."originType"::text AS "originType", NULL::text AS "contentType",
          concat_ws(' ', c."displayName", c."canonicalName", c."providerName", c."platformName", c.category, c."learningLanguage") AS document
        FROM "Course" c WHERE c.status = 'PUBLISHED'
        UNION ALL
        SELECT 'universities', u.id, u.slug, ${titleUniversity}, concat_ws(' · ', u.country, u.city), NULL, NULL,
          concat_ws(' ', u."displayName", u."canonicalName", u.country, u.city, u."institutionType")
        FROM "University" u WHERE u.status = 'PUBLISHED'
        UNION ALL
        SELECT 'scholarships', s.id, s.slug, ${titleScholarship}, COALESCE(s."providerName", ''), NULL, NULL,
          concat_ws(' ', s."displayName", s."canonicalName", s."providerName", s."academicYear", s."cycleName")
        FROM "Scholarship" s WHERE s."publicationStatus" = 'PUBLISHED'
        UNION ALL
        SELECT 'majors', m.id, m.slug, ${titleMajor}, COALESCE(m."facultyName", ''), NULL, NULL,
          concat_ws(' ', m."displayName", m."canonicalName", m."localizedNameAr", m."localizedNameEn", m."facultyName")
        FROM "Major" m WHERE m.status = 'PUBLISHED'
        UNION ALL
        SELECT 'exams', t.id, t.slug, ${titleExam}, COALESCE(t."providerName", ''), NULL, NULL,
          concat_ws(' ', t."displayName", t."canonicalName", t."localizedNameAr", t."localizedNameEn", t.abbreviation, t."providerName", t."testCategory")
        FROM "InternationalTest" t WHERE t.status = 'PUBLISHED' AND t."isPubliclyVisible" = true
        UNION ALL
        SELECT 'articles', cc.id, COALESCE(lc."localizedSlug", cc.slug), COALESCE(lc.title, cc.title), COALESCE(lc.summary, cc.summary, ''), NULL, cc."contentType",
          concat_ws(' ', COALESCE(lc.title, cc.title), COALESCE(lc.summary, cc.summary), cc."contentType", cc."categorySlug")
        FROM "CmsContentNode" cc
        LEFT JOIN "CmsLocalizedContent" lc ON lc."contentId" = cc.id AND lc.locale = ${input.locale} AND lc.state = 'PUBLISHED'
        WHERE cc.status = 'PUBLISHED'
        UNION ALL
        SELECT 'services', sv.id, sv.slug, sv."displayName", sv."serviceDescription", NULL, NULL,
          concat_ws(' ', sv."displayName", sv."canonicalName", sv."serviceDescription", sv."serviceCategory", sv."providerName")
        FROM "ServiceCatalogRecord" sv WHERE sv.status = 'PUBLISHED'
        UNION ALL
        SELECT 'jobs', j.id, j.slug, j.title, concat_ws(' · ', e."displayName", j.country, j.city), NULL, NULL,
          concat_ws(' ', j.title, j."canonicalTitle", j.description, j."jobCategory", j.country, j.city, e."displayName")
        FROM "CareerJobPostingRecord" j JOIN "CareerEmployerRecord" e ON e.id = j."employerId" WHERE j.status = 'PUBLISHED'
        UNION ALL
        SELECT 'countries', co.id, lower(co."iso2Code"), ${titleCountry}, COALESCE(co.region, ''), NULL, NULL,
          concat_ws(' ', co.name, co."nameAr", co."officialName", co."iso2Code", co."iso3Code", co.region, co.subregion)
        FROM "ReferenceCountry" co WHERE co."isActive" = true AND co."lifecycleState" = 'ACTIVE'
        UNION ALL
        SELECT 'tools', st.id, st."toolKey", ${titleTool}, ${input.locale === 'en' ? Prisma.sql`st."descriptionEn"` : Prisma.sql`st."descriptionAr"`}, NULL, NULL,
          concat_ws(' ', st."nameAr", st."nameEn", st."descriptionAr", st."descriptionEn", st.category)
        FROM "StudentToolDefinitionRecord" st WHERE st.lifecycle = 'ACTIVE' AND st.visibility = 'PUBLIC'
      ), ranked AS (
        SELECT c.*,
          GREATEST(
            ts_rank_cd(to_tsvector('simple', c.document), plainto_tsquery('simple', ${query})),
            CASE
              WHEN lower(c.title) = lower(${query}) THEN 10.0
              WHEN lower(c.title) LIKE lower(${query}) || '%' THEN 5.0
              WHEN c.document ILIKE '%' || ${query} || '%' THEN 1.0
              ELSE 0.0
            END
          )::double precision AS score
        FROM candidates c
        WHERE to_tsvector('simple', c.document) @@ plainto_tsquery('simple', ${query})
           OR c.document ILIKE '%' || ${query} || '%'
      )
      SELECT r.kind, r.id, r.slug, r.title, r.subtitle, r."originType", r."contentType", r.score
      FROM ranked r
      WHERE 1=1 ${kindClause} ${cursorClause}
      ORDER BY r.score DESC, lower(r.title) ASC, r.kind ASC, r.id ASC
      LIMIT ${limit + 1}
    `);

    const visible = rows.slice(0, limit);
    const items: SearchMatch[] = visible.map((row) => ({
      target: { entityNamespace: row.kind, resourceKey: row.id },
      score: Number(row.score),
      payload: {
        kind: row.kind,
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle ?? undefined,
        originType: row.originType ?? undefined,
        contentType: row.contentType ?? undefined,
        url: `/${input.locale}/${this.routeSegment(row.kind)}/${encodeURIComponent(row.slug)}`,
      },
    }));
    const last = visible.at(-1);
    return {
      items,
      hasMore: rows.length > limit,
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({
              score: Number(last.score),
              title: last.title,
              kind: last.kind,
              id: last.id,
            })
          : null,
    };
  }

  private routeSegment(kind: PublicSearchKind): string {
    const map: Record<PublicSearchKind, string> = {
      scholarships: 'scholarships',
      universities: 'universities',
      majors: 'majors',
      countries: 'countries',
      courses: 'courses',
      exams: 'tests',
      articles: 'content',
      services: 'services',
      tools: 'tools',
      jobs: 'careers',
    };
    return map[kind];
  }
}

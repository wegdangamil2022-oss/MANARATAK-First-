import { describe, expect, it, vi } from 'vitest';
import { PrismaTranslationWorkspaceReadGateway } from '../../src/translation-import/PrismaTranslationWorkspaceReadGateway';
function fixture() {
  const tx = {
    $queryRaw: vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'owner',
          publicId: 'INS-X',
          localizedNameAr: 'اسم',
          localizedNameEn: 'Name',
          translationStateAr: 'PUBLISHED',
          translationStateEn: 'APPROVED',
        },
      ])
      .mockResolvedValueOnce([
        {
          total: 80n,
          complete: 40n,
          pending: 40n,
          rejected: 0n,
          published: 0n,
          missingAr: 0n,
          missingEn: 40n,
          publicReadyAr: 40n,
          publicReadyEn: 0n,
        },
      ]),
  };
  const db = { $transaction: vi.fn((operation: (client: typeof tx) => unknown) => operation(tx)) };
  return { tx, db, reader: new PrismaTranslationWorkspaceReadGateway(db as any) };
}
describe('Translation workspace global owner projection contracts', () => {
  it('returns server totals instead of counting the current page and preserves review/public readiness separately', async () => {
    const { reader, db, tx } = fixture();
    const result = await reader.search({
      domain: 'UNIVERSITY',
      page: 2,
      pageSize: 40,
      coverage: 'MISSING_EN',
      locale: 'en',
      reviewState: 'NEEDS_REVIEW',
      updatedFrom: new Date('2026-10-01'),
    });
    expect(result).toMatchObject({
      total: 80,
      totalPages: 2,
      page: 2,
      coverageScope: 'GLOBAL',
      runtimeProof: 'UNVERIFIED',
      publicationReadiness: 'UNKNOWN_OWNER_SOURCE_EVIDENCE',
      importSupported: true,
      stats: { pending: 40, published: 0, publicReadyEn: 0 },
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].translations).toContainEqual({
      locale: 'en',
      displayName: 'Name',
      reviewStatus: 'APPROVED',
    });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
    const [page, count] = tx.$queryRaw.mock.calls.map(([query]) => query);
    expect(page.sql).toMatch(
      /WHERE .*NOT "hasEn".*"translationStateEn" <> 'PUBLISHED'.*ORDER BY.*LIMIT/s,
    );
    expect(count.sql).toContain('count(*) AS total');
    expect(count.sql).toMatch(/FROM coverage WHERE .*NOT "hasEn"/s);
    expect(page.values).toContain(40);
    expect(page.sql).toContain('false AS "publicReadyAr"');
    expect(page.sql).toContain('false AS "publicReadyEn"');
  });
  it('binds user search values and does not invent publication evidence for legacy owner storage', async () => {
    const { reader, tx } = fixture();
    const q = "'; DROP TABLE University; --";
    const result = await reader.search({
      domain: 'COURSE',
      page: 1,
      pageSize: 20,
      q,
      locale: 'en',
    });
    const query = tx.$queryRaw.mock.calls[0][0];
    expect(query.sql).not.toContain(q);
    expect(query.values).toContain('%' + q + '%');
    expect(query.sql).toContain('"Course"');
    expect(result).toMatchObject({
      publicationReadiness: 'UNKNOWN_OWNER_FIELD_EVIDENCE',
      migrationRequired: true,
      importSupported: false,
    });
    expect(result.data[0].translations).toBeUndefined();
  });
  it('searches translated names before counting and paging and escapes literal wildcard characters', async () => {
    const { reader, tx } = fixture();
    await reader.search({
      domain: 'SCHOLARSHIP',
      page: 3,
      pageSize: 20,
      q: 'منحة_100%',
      locale: 'ar',
      sort: 'NAME_ASC',
      reviewState: 'REJECTED',
    });
    const [page, count] = tx.$queryRaw.mock.calls.map(([query]) => query);
    for (const query of [page, count]) {
      expect(query.sql).toContain('"localizedNameAr" ILIKE');
      expect(query.sql).toContain('"localizedNameEn" ILIKE');
      expect(query.sql).toContain('"translationStateAr" = \'REJECTED\'');
      expect(query.sql).not.toContain('منحة_100%');
      expect(query.values).toContain('%منحة\\_100\\%%');
    }
    expect(page.sql).toMatch(/ORDER BY COALESCE\(NULLIF\("localizedNameAr"/);
    expect(page.values.slice(-2)).toEqual([20, 40]);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { currentPublicCourseEligibility } from '../../src/courses/CoursePublicEligibility';

function fixture(reviewed = true) {
  const row = {
    id: 'external-course',
    directCourseUrl: 'https://official.example/course',
    externalProviderId: 'provider',
    externalProvider: { allowedDomains: [{ normalizedDomain: 'official.example' }] },
    sourceIdentities: [
      {
        providerId: 'provider',
        currentUrl: 'https://official.example/course',
        urlHistory: [
          {
            url: 'https://official.example/course',
            normalizedUrl: 'https://official.example/course',
            isCurrent: true,
            verificationState: 'VERIFIED',
            checkedAt: new Date(),
          },
        ],
      },
    ],
  };
  const db = {
    course: { findMany: vi.fn(async () => [row]) },
    $queryRaw: vi.fn(async () => (reviewed ? [{ id: row.id }] : [])),
  };
  return { row, db };
}

describe('public course source approval boundary shared by list, count and owner links', () => {
  it('excludes a source with a valid provider/link but no current independent approval', async () => {
    const { db } = fixture(false);
    const where = await currentPublicCourseEligibility(db as never);
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { OR: [{ originType: { not: 'EXTERNAL_LINKED_COURSE' } }, { id: { in: [] } }] },
      ]),
    );
    const sql = db.$queryRaw.mock.calls[0][0];
    expect(sql.text).toContain('CourseSourceApproval');
    expect(sql.text).toContain('providerRevision');
    expect(sql.text).toContain('CourseVersion');
  });
  it('admits only the intersection of current approval, provider domain and URL-history proof', async () => {
    const { db, row } = fixture();
    const where = await currentPublicCourseEligibility(db as never);
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { OR: [{ originType: { not: 'EXTERNAL_LINKED_COURSE' } }, { id: { in: [row.id] } }] },
      ]),
    );
    row.sourceIdentities[0].urlHistory[0].verificationState = 'BROKEN';
    const revoked = await currentPublicCourseEligibility(db as never);
    expect(revoked.AND).toEqual(
      expect.arrayContaining([
        { OR: [{ originType: { not: 'EXTERNAL_LINKED_COURSE' } }, { id: { in: [] } }] },
      ]),
    );
  });
});

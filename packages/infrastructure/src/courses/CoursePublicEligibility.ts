import { Prisma } from '@prisma/client';
import { courseSourceApprovalPredicate } from './CoursePublicTrustPredicate';
import { publicCourseLanguageProof } from './CoursePublicLanguageProof';

/** Shared current owner proof for public detail, search/count, relations and CMS. */
export function publicCourseEligibility(): Prisma.CourseWhereInput {
  return {
    status: 'PUBLISHED',
    completenessStatus: 'COMPLETE',
    AND: [{ OR: [
      { originType: { not: 'EXTERNAL_LINKED_COURSE' } },
      {
        originType: 'EXTERNAL_LINKED_COURSE',
        accessType: { in: ['FREE_STUDY', 'FREE_STUDY_AND_CERTIFICATE'] },
        isStudyFree: true,
        externalProvider: { is: { status: 'APPROVED' } },
      },
    ] }, publicCourseLanguageProof()],
  };
}

function normalizedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_') || ['gclid', 'fbclid'].includes(key.toLowerCase())) url.searchParams.delete(key);
    }
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch { return null; }
}

/** Resolve cross-owner URL/provider equality in the caller's public-read snapshot.
 * Prisma relation filters cannot compare a child's URL/provider to its Course.
 * Batch proof hydration to avoid one query per Course; apply the allowlist before
 * pagination/count so withdrawn records cannot produce short pages or bad totals.
 */
export async function currentPublicCourseEligibility(
  db: Pick<Prisma.TransactionClient, 'course' | '$queryRaw'>,
  scope: Prisma.CourseWhereInput = {},
): Promise<Prisma.CourseWhereInput> {
  const base = publicCourseEligibility();
  const allowed: string[] = [];
  let cursor: string | undefined;
  for (;;) {
    const rows = await db.course.findMany({
      where: { AND: [base, scope], originType: 'EXTERNAL_LINKED_COURSE' },
      orderBy: { id: 'asc' }, take: 500,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true, directCourseUrl: true, externalProviderId: true,
        externalProvider: { select: { allowedDomains: { select: { normalizedDomain: true } } } },
        sourceIdentities: { where: { status: 'ACTIVE' }, select: {
          providerId: true, currentUrl: true,
          urlHistory: { where: { isCurrent: true }, select: { url: true, normalizedUrl: true, verificationState: true, checkedAt: true } },
        } },
      },
    });
    const reviewed = rows.length ? new Set((await db.$queryRaw<Array<{id:string}>>(Prisma.sql`
      SELECT c.id FROM "Course" c WHERE c.id IN (${Prisma.join(rows.map(row => row.id))})
      AND ${courseSourceApprovalPredicate()}
    `)).map(row => row.id)) : new Set<string>();
    for (const row of rows) {
      if (!reviewed.has(row.id)) continue;
      const url = normalizedUrl(row.directCourseUrl);
      if (!url) continue;
      const host = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
      const domainAllowed = row.externalProvider?.allowedDomains.some(domain => {
        const allowedDomain = domain.normalizedDomain.trim().toLowerCase().replace(/\.$/, '');
        return allowedDomain && (host === allowedDomain || host.endsWith(`.${allowedDomain}`));
      });
      if (!domainAllowed) continue;
      if (row.sourceIdentities.some(identity => identity.providerId === row.externalProviderId
        && normalizedUrl(identity.currentUrl) === url
        && identity.urlHistory.length === 1
        && identity.urlHistory.some(history => history.checkedAt !== null
          && ['VERIFIED', 'REDIRECTED'].includes(history.verificationState)
          && normalizedUrl(history.url) === url && normalizedUrl(history.normalizedUrl) === url))) allowed.push(row.id);
    }
    if (rows.length < 500) break;
    cursor = rows[rows.length - 1].id;
  }
  return { ...scope, ...base, AND: [base, scope, { OR: [
    { originType: { not: 'EXTERNAL_LINKED_COURSE' } }, { id: { in: allowed } },
  ] }] };
}

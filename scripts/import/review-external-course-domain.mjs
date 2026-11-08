import assert from 'node:assert/strict';
import { courseBulkHash } from './persist-external-course-batch.mjs';
/** Append one reviewed publisher domain; never replaces other mappings,
 * approval state, trust, connectors, aliases or provider profile fields. */
export async function reviewExternalCourseDomain(tx, snapshot, evidence, article) {
  assert.equal(snapshot.provider.canonicalName, 'freeCodeCamp');
  assert.equal(evidence.results.length, 57);
  assert.equal(
    evidence.results.filter(
      (r) => r.status === 200 && r.authorUrl === 'https://www.youtube.com/@freecodecamp',
    ).length,
    56,
  );
  assert.equal(article.url, 'https://www.freecodecamp.org/news/learn-big-o-notation');
  assert.equal(article.status, 200);
  assert.equal(article.linkedCourseUrl, 'https://www.youtube.com/watch?v=Mo4vesaut8g');
  assert.ok(
    evidence.results.every((r) =>
      /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(r.url),
    ),
  );
  await tx.$queryRawUnsafe(
    'SELECT id FROM "ExternalCourseProvider" WHERE id=$1 FOR UPDATE',
    snapshot.provider.id,
  );
  await tx.$queryRawUnsafe(
    'SELECT id FROM "ExternalCourseProviderDomain" WHERE "providerId"=$1 FOR UPDATE',
    snapshot.provider.id,
  );
  const provider = await tx.externalCourseProvider.findUnique({
    where: { id: snapshot.provider.id },
  });
  assert.equal(
    courseBulkHash(provider),
    courseBulkHash(snapshot.provider),
    'COURSE_PROVIDER_REVIEW_CHANGED',
  );
  const domains = await tx.externalCourseProviderDomain.findMany({
      where: { providerId: provider.id },
    }),
    sort = (rows) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
  assert.equal(
    courseBulkHash(sort(domains)),
    courseBulkHash(sort(snapshot.domains)),
    'COURSE_PROVIDER_DOMAIN_REVIEW_CHANGED',
  );
  assert.equal(provider.status, 'APPROVED');
  if (!domains.some((d) => d.normalizedDomain === 'youtube.com')) {
    await tx.externalCourseProviderDomain.createMany({
      data: [
        {
          id: 'reviewed-youtube-' + courseBulkHash(provider.id).slice(0, 32),
          providerId: provider.id,
          domain: 'youtube.com',
          normalizedDomain: 'youtube.com',
        },
      ],
    });
    await tx.$executeRawUnsafe(
      'UPDATE "ExternalCourseProvider" SET "updatedAt"=GREATEST(now(),"updatedAt"+interval \'1 millisecond\') WHERE id=$1',
      provider.id,
    );
  }
  return {
    providerId: provider.id,
    addedDomain: 'youtube.com',
    evidenceRows: 57,
    availabilityReviewRequired: 1,
    connectorsActivated: false,
  };
}

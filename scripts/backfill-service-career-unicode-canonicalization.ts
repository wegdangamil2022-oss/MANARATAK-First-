import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  canonicalizeCareerIdentityText,
  canonicalizeServiceIdentityName,
} from '../packages/application/src/canonicalization/OwnerDomainIdentityPolicies';
import { unicodeSlugSegment } from '../packages/application/src/canonicalization/UnicodeCanonicalization';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const rewriteFallbackSlugs = !process.argv.includes('--preserve-fallback-slugs');

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 8);
}

function isServiceFallbackSlug(slug: string): boolean {
  return /^service-[0-9a-f]{8}$/u.test(slug);
}
function isCareerFallbackSlug(slug: string): boolean {
  return /^career-[0-9a-f]{8}$/u.test(slug);
}

type Proposal = {
  kind: 'SERVICE' | 'CAREER_EMPLOYER' | 'CAREER_JOB';
  id: string;
  publicId: string;
  sourceLabel: string;
  oldCanonical: string;
  newCanonical: string;
  oldDedupKey: string;
  newDedupKey: string;
  oldSlug: string;
  newSlug: string;
  rewriteSlug: boolean;
};

function duplicateGroups(values: Array<{ id: string; value: string }>): Array<{ value: string; ids: string[] }> {
  const groups = new Map<string, string[]>();
  for (const item of values) {
    const ids = groups.get(item.value) ?? [];
    ids.push(item.id);
    groups.set(item.value, ids);
  }
  return [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([value, ids]) => ({ value, ids }));
}

async function buildPlan(): Promise<Proposal[]> {
  const [services, employers, jobs] = await Promise.all([
    prisma.serviceCatalogRecord.findMany({
      select: {
        id: true, publicId: true, displayName: true, serviceCategory: true, fulfillmentType: true, deliveryMode: true,
        canonicalName: true, canonicalDedupKey: true, slug: true,
      },
    }),
    prisma.careerEmployerRecord.findMany({
      select: {
        id: true, publicId: true, displayName: true, employerType: true, countryReferenceId: true,
        canonicalName: true, canonicalDedupKey: true, slug: true,
      },
    }),
    prisma.careerJobPostingRecord.findMany({
      select: {
        id: true, publicId: true, title: true, employerId: true, countryReferenceId: true, cityReferenceId: true,
        employmentType: true, canonicalTitle: true, canonicalDedupKey: true, slug: true,
        employer: { select: { displayName: true } },
      },
    }),
  ]);

  const proposals: Proposal[] = [];
  for (const row of services) {
    const canonical = canonicalizeServiceIdentityName(row.displayName);
    const dedup = [canonical, row.serviceCategory, row.fulfillmentType, row.deliveryMode].join('|');
    const rewriteSlug = rewriteFallbackSlugs && isServiceFallbackSlug(row.slug);
    proposals.push({
      kind: 'SERVICE', id: row.id, publicId: row.publicId, sourceLabel: row.displayName,
      oldCanonical: row.canonicalName, newCanonical: canonical,
      oldDedupKey: row.canonicalDedupKey, newDedupKey: dedup,
      oldSlug: row.slug,
      newSlug: rewriteSlug && canonical ? `${unicodeSlugSegment(row.displayName)}-${shortHash(dedup)}` : row.slug,
      rewriteSlug,
    });
  }
  for (const row of employers) {
    const canonical = canonicalizeCareerIdentityText(row.displayName);
    const dedup = [canonical, row.countryReferenceId || 'GLOBAL', row.employerType].join('|');
    const rewriteSlug = rewriteFallbackSlugs && isCareerFallbackSlug(row.slug);
    proposals.push({
      kind: 'CAREER_EMPLOYER', id: row.id, publicId: row.publicId, sourceLabel: row.displayName,
      oldCanonical: row.canonicalName, newCanonical: canonical,
      oldDedupKey: row.canonicalDedupKey, newDedupKey: dedup,
      oldSlug: row.slug,
      newSlug: rewriteSlug && canonical ? `${unicodeSlugSegment(row.displayName)}-${shortHash(dedup)}` : row.slug,
      rewriteSlug,
    });
  }
  for (const row of jobs) {
    const canonical = canonicalizeCareerIdentityText(row.title);
    const dedup = [canonical, row.employerId, row.countryReferenceId, row.cityReferenceId || 'REMOTE_OR_GLOBAL', row.employmentType].join('|');
    const rewriteSlug = rewriteFallbackSlugs && isCareerFallbackSlug(row.slug);
    proposals.push({
      kind: 'CAREER_JOB', id: row.id, publicId: row.publicId, sourceLabel: row.title,
      oldCanonical: row.canonicalTitle, newCanonical: canonical,
      oldDedupKey: row.canonicalDedupKey, newDedupKey: dedup,
      oldSlug: row.slug,
      newSlug: rewriteSlug && canonical
        ? `${unicodeSlugSegment(`${row.title}-${row.employer.displayName}`)}-${shortHash(dedup)}`
        : row.slug,
      rewriteSlug,
    });
  }
  return proposals;
}

async function main(): Promise<void> {
  const proposals = await buildPlan();
  const emptyCanonical = proposals.filter((row) => !row.newCanonical);
  const byKind = (kind: Proposal['kind']) => proposals.filter((row) => row.kind === kind);
  const dedupCollisions = (['SERVICE', 'CAREER_EMPLOYER', 'CAREER_JOB'] as const).flatMap((kind) =>
    duplicateGroups(byKind(kind).map((row) => ({ id: row.id, value: row.newDedupKey }))).map((collision) => ({ kind, ...collision })),
  );
  const slugCollisions = (['SERVICE', 'CAREER_EMPLOYER', 'CAREER_JOB'] as const).flatMap((kind) =>
    duplicateGroups(byKind(kind).map((row) => ({ id: row.id, value: row.newSlug }))).map((collision) => ({ kind, ...collision })),
  );
  const changed = proposals.filter((row) =>
    row.oldCanonical !== row.newCanonical || row.oldDedupKey !== row.newDedupKey || row.oldSlug !== row.newSlug,
  );
  const blockers = [
    ...emptyCanonical.map((row) => ({ kind: row.kind, id: row.id, issue: 'EMPTY_CANONICAL_IDENTITY' })),
    ...dedupCollisions.map((row) => ({ ...row, issue: 'CANONICAL_DEDUP_COLLISION' })),
    ...slugCollisions.map((row) => ({ ...row, issue: 'SLUG_COLLISION' })),
  ];

  const report = {
    authority: 'MNT-AUD-0091',
    mode: apply ? 'APPLY' : 'DRY_RUN',
    rewriteFallbackSlugs,
    scanned: {
      services: byKind('SERVICE').length,
      employers: byKind('CAREER_EMPLOYER').length,
      jobs: byKind('CAREER_JOB').length,
    },
    changedRows: changed.length,
    degenerateExisting: {
      emptyCanonical: proposals.filter((row) => !row.oldCanonical).map((row) => ({ kind: row.kind, id: row.id, publicId: row.publicId })),
      fallbackSlugs: proposals.filter((row) => isServiceFallbackSlug(row.oldSlug) || isCareerFallbackSlug(row.oldSlug))
        .map((row) => ({ kind: row.kind, id: row.id, publicId: row.publicId, slug: row.oldSlug })),
    },
    blockers,
    databaseWrites: 0,
  };

  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (blockers.length > 0) throw new Error(`MNT_AUD_0091_BACKFILL_BLOCKED:${blockers.length}`);
  requireDatabaseMutationGate('MNT-AUD-0091 Unicode canonicalization backfill', { allowedPurposes: ['backfill'] });

  let databaseWrites = 0;
  await prisma.$transaction(async (tx) => {
    // Two-phase re-keying avoids transient unique-key conflicts during a collision-free swap.
    for (const row of changed) {
      const temporary = `__mntaud0091__${row.id}`;
      if (row.kind === 'SERVICE') {
        await tx.serviceCatalogRecord.update({ where: { id: row.id }, data: { canonicalDedupKey: temporary, ...(row.oldSlug !== row.newSlug ? { slug: `${temporary}-slug` } : {}) } });
      } else if (row.kind === 'CAREER_EMPLOYER') {
        await tx.careerEmployerRecord.update({ where: { id: row.id }, data: { canonicalDedupKey: temporary, ...(row.oldSlug !== row.newSlug ? { slug: `${temporary}-slug` } : {}) } });
      } else {
        await tx.careerJobPostingRecord.update({ where: { id: row.id }, data: { canonicalDedupKey: temporary, ...(row.oldSlug !== row.newSlug ? { slug: `${temporary}-slug` } : {}) } });
      }
      databaseWrites += 1;
    }
    for (const row of changed) {
      if (row.kind === 'SERVICE') {
        await tx.serviceCatalogRecord.update({ where: { id: row.id }, data: { canonicalName: row.newCanonical, canonicalDedupKey: row.newDedupKey, slug: row.newSlug } });
      } else if (row.kind === 'CAREER_EMPLOYER') {
        await tx.careerEmployerRecord.update({ where: { id: row.id }, data: { canonicalName: row.newCanonical, canonicalDedupKey: row.newDedupKey, slug: row.newSlug } });
      } else {
        await tx.careerJobPostingRecord.update({ where: { id: row.id }, data: { canonicalTitle: row.newCanonical, canonicalDedupKey: row.newDedupKey, slug: row.newSlug } });
      }
      databaseWrites += 1;
    }
  });

  console.log(JSON.stringify({ ...report, databaseWrites }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

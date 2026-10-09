import { Prisma, PrismaClient } from '@prisma/client';
import { ASSET_REFERENCE_OWNER_GUARDS } from './AssetReferenceIntegrityReadiness';

/** Read-only owner-derived usage snapshot, bounded to one scanned asset page. */
export async function findUsedAssetIds(
  prisma: Pick<PrismaClient, '$queryRaw'>, ids: readonly string[],
): Promise<Set<string>> {
  if (ids.length > 100) throw new Error('ASSET_USAGE_BATCH_LIMIT_EXCEEDED');
  if (!ids.length) return new Set();
  // Identifier SQL comes exclusively from the schema-checked static owner inventory.
  // Every user-controlled value remains a bound Prisma SQL parameter.
  const checks = ASSET_REFERENCE_OWNER_GUARDS.flatMap(owner => {
    const table = Prisma.raw(`"${owner.table}"`);
    const predicates = owner.fields.map(field =>
      Prisma.sql`o.${Prisma.raw(`"${field}"`)} = candidate.id`);
    if (owner.attachments) predicates.push(Prisma.sql`o."attachmentAssetIds" @> jsonb_build_array(candidate.id)`);
    if (owner.seo) predicates.push(Prisma.sql`o."seoMetadata"->>'openGraphAssetId' = candidate.id`);
    return [Prisma.sql`EXISTS (SELECT 1 FROM ${table} o WHERE ${Prisma.join(predicates, ' OR ')})`];
  });
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT candidate.id FROM unnest(ARRAY[${Prisma.join([...ids])}]::text[]) AS candidate(id)
    WHERE ${Prisma.join(checks, ' OR ')}
  `);
  return new Set(rows.map(row => row.id));
}

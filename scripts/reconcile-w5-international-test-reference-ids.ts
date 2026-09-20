import { PrismaClient } from '@prisma/client';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

/**
 * W5 Google Studio reconciliation utility.
 * Default mode is read-only. Pass --apply only after the recovery/database mutation gate is closed.
 */
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

type LegacyRow = {
  id: string;
  testId: string;
  code: string;
  relationshipType: string;
};

type Resolution = LegacyRow & { canonicalReferenceId?: string; issue?: string };

async function main(): Promise<void> {
  if (apply) requireDatabaseMutationGate('W5 international-test canonical reference reconciliation', { allowedPurposes: ['backfill'] });

  const db = prisma as any;
  const countryRows = (await db.internationalTestCountryRelationship.findMany({
    where: { canonicalReferenceId: null },
    select: { id: true, testId: true, countryIso2Code: true, relationshipType: true },
  })) as Array<{ id: string; testId: string; countryIso2Code: string; relationshipType: string }>;
  const languageRows = (await db.internationalTestLanguageRelationship.findMany({
    where: { canonicalReferenceId: null },
    select: { id: true, testId: true, languageIsoCode: true, relationshipType: true },
  })) as Array<{ id: string; testId: string; languageIsoCode: string; relationshipType: string }>;

  const countryResolutions: Resolution[] = [];
  for (const row of countryRows) {
    const canonical = await db.referenceCountry.findUnique({ where: { iso2Code: row.countryIso2Code.toUpperCase() } });
    countryResolutions.push({
      id: row.id,
      testId: row.testId,
      code: row.countryIso2Code,
      relationshipType: row.relationshipType,
      canonicalReferenceId: canonical?.isActive ? canonical.id : undefined,
      issue: canonical?.isActive ? undefined : 'ACTIVE_CANONICAL_COUNTRY_NOT_FOUND',
    });
  }

  const languageResolutions: Resolution[] = [];
  for (const row of languageRows) {
    const canonical = await db.referenceLanguage.findUnique({ where: { isoCode: row.languageIsoCode.toLowerCase() } });
    languageResolutions.push({
      id: row.id,
      testId: row.testId,
      code: row.languageIsoCode,
      relationshipType: row.relationshipType,
      canonicalReferenceId: canonical?.isActive ? canonical.id : undefined,
      issue: canonical?.isActive ? undefined : 'ACTIVE_CANONICAL_LANGUAGE_NOT_FOUND',
    });
  }

  const unresolved = [...countryResolutions, ...languageResolutions].filter((item) => !item.canonicalReferenceId);
  const report = {
    mode: apply ? 'APPLY' : 'DRY_RUN',
    countryLegacyRows: countryResolutions.length,
    languageLegacyRows: languageResolutions.length,
    resolvableRows: countryResolutions.length + languageResolutions.length - unresolved.length,
    unresolvedRows: unresolved.length,
    unresolved,
    databaseWrites: 0,
    runtimeClosure: 'PENDING_GOOGLE_STUDIO',
  };

  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (unresolved.length > 0) {
    throw new Error(`W5_RECONCILIATION_BLOCKED_UNRESOLVED_REFERENCES:${unresolved.length}`);
  }

  let writes = 0;
  await db.$transaction(async (tx: any) => {
    for (const item of countryResolutions) {
      await tx.internationalTestCountryRelationship.update({
        where: { id: item.id },
        data: { canonicalReferenceId: item.canonicalReferenceId },
      });
      writes += 1;
    }
    for (const item of languageResolutions) {
      await tx.internationalTestLanguageRelationship.update({
        where: { id: item.id },
        data: { canonicalReferenceId: item.canonicalReferenceId },
      });
      writes += 1;
    }
  });

  console.log(JSON.stringify({ ...report, databaseWrites: writes }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

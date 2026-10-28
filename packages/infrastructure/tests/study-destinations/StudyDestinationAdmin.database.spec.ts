import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma } from '@prisma/client';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import { StudyDestinationCompletenessStatus, StudyDestinationStatus } from '@manaratak/domain';
import { PrismaStudyDestinationRepository } from '../../src/study-destinations/PrismaStudyDestinationRepository';

describe('Destination owner persistence on attested disposable PostgreSQL16', () => {
  let db: PrismaClient, other: PrismaClient, profileId: string;
  const run = randomUUID(),
    countryId = randomUUID(),
    otherCountryId = randomUUID(),
    cityId = randomUUID(),
    languageId = randomUUID(),
    currencyId = randomUUID();
  const name = 'Synthetic destination ' + run;
  const refs = {
    countryReferenceId: countryId,
    cityReferenceIds: [cityId],
    studyLanguageReferenceIds: [languageId],
    livingCostCurrencyReferenceId: currencyId,
  };
  const bound = (tx: Prisma.TransactionClient) => new PrismaStudyDestinationRepository(tx, true);
  beforeAll(async () => {
    if (
      process.env.DESTINATION_ADMIN_DATABASE_TESTS !== 'YES' ||
      process.env.NODE_ENV !== 'test' ||
      process.env.POST28_TARGET_LABEL !== 'DB-T' ||
      process.env.DATABASE_URL !== process.env.DIRECT_URL
    )
      throw Error('ISOLATED_DESTINATION_TEST_AUTHORIZATION_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE!, 'utf8'));
    await preflightTargets(
      contract,
      [{ label: 'DB-T', url: process.env.DATABASE_URL }],
      process.env,
      contract.sourceSha,
      readDatabaseIdentity,
      { requireValidatedCatalog: true },
    );
    db = new PrismaClient();
    other = new PrismaClient();
    await Promise.all([db.$connect(), other.$connect()]);
    await db.referenceCountry.createMany({
      data: [
        { id: countryId, iso2Code: 'QZ', iso3Code: 'QZZ', name, region: 'Asia' },
        {
          id: otherCountryId,
          iso2Code: 'QY',
          iso3Code: 'QYY',
          name: name + ' other',
          region: 'Asia',
        },
      ],
    });
    await db.referenceLanguage.create({
      data: { id: languageId, isoCode: 'qzz', name, direction: 'ltr' },
    });
    await db.referenceCurrency.create({
      data: { id: currencyId, isoCode: 'QZZ', name, minorUnit: 2 },
    });
    await db.referenceCity.create({
      data: { id: cityId, countryReferenceId: countryId, countryIso2Code: 'QZ', name },
    });
  });
  afterAll(async () => {
    if (db) {
      await db.studyDestinationProfile.deleteMany({ where: { countryReferenceId: countryId } });
      await db.referenceCity.deleteMany({ where: { id: cityId, countryReferenceId: countryId } });
      await db.referenceLanguage.deleteMany({ where: { id: languageId, name } });
      await db.referenceCurrency.deleteMany({ where: { id: currencyId, name } });
      await db.referenceCountry.deleteMany({
        where: { id: { in: [countryId, otherCountryId] }, name: { startsWith: name } },
      });
      await db.$disconnect();
    }
    if (other) await other.$disconnect();
  });
  it('keeps canonical country discovery separate from editorial profiles', async () => {
    const result = await new PrismaStudyDestinationRepository(db).listAdminCountries({
      q: name,
      region: 'Asia',
      status: 'NO_PROFILE',
      page: 1,
      pageSize: 20,
    });
    expect(result.data.find((row) => row.country.id === countryId)?.profile).toBeNull();
    expect(
      await new PrismaStudyDestinationRepository(db).findByCountryReferenceId(countryId),
    ).toBeNull();
  });
  it('creates a draft under the locked country and preserves canonical language, currency and city ownership', async () => {
    const profile = await db.$transaction(async (tx) => {
      const repo = bound(tx);
      await repo.lockCountry(countryId);
      await repo.lockReferences(refs);
      return repo.create({
        ...refs,
        publicId: 'SYN-' + run,
        slug: 'synthetic-' + run,
        status: StudyDestinationStatus.DRAFT,
        completenessStatus: StudyDestinationCompletenessStatus.INCOMPLETE,
        overviewAr: 'Arabic draft',
        overviewEn: 'Retained English',
      });
    });
    profileId = profile.id;
    expect(profile).toMatchObject({
      ...refs,
      revision: 1,
      status: 'DRAFT',
      overviewEn: 'Retained English',
    });
    const visible = await new PrismaStudyDestinationRepository(db).listPublished({
      q: name,
      page: 1,
      pageSize: 20,
    });
    expect(visible.data).toHaveLength(0);
  });
  it('rejects a concurrent stale writer while preserving references and untouched translations', async () => {
    const results = await Promise.allSettled(
      [db, other].map((client, index) =>
        client.$transaction((tx) =>
          bound(tx).update(profileId, { overviewAr: 'Reviewed ' + index }, undefined, 1),
        ),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' ? String(rejected.reason) : '').toContain(
      'STUDY_DESTINATION_VERSION_CONFLICT',
    );
    expect(await new PrismaStudyDestinationRepository(db).findById(profileId)).toMatchObject({
      ...refs,
      revision: 2,
      overviewEn: 'Retained English',
    });
  });
  it('rejects a city from another canonical country before allowing an owner write', async () => {
    await expect(
      db.$transaction((tx) =>
        bound(tx).lockReferences({ ...refs, countryReferenceId: otherCountryId }),
      ),
    ).rejects.toThrow('INVALID_STUDY_CITY_REFERENCE');
  });
});

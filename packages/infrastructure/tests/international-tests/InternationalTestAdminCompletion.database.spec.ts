import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import { PrismaInternationalTestRepository } from '../../src/international-tests/PrismaInternationalTestRepository';
import { InternationalTestStatus, InternationalTestCategory } from '@manaratak/domain';
import {
  sourceSections,
  type TestSourceVersion,
} from '../../../../apps/admin/src/features/international-tests/TestSourceSections';

describe('Section 06 on attested isolated PostgreSQL16', () => {
  let db: PrismaClient,
    repo: PrismaInternationalTestRepository,
    country: { id: string; name: string; nameAr: string | null },
    language: { id: string; name: string; nameAr: string | null },
    degree: { id: string; nameAr: string };
  const run = randomUUID(),
    provider = 'Synthetic section06 ' + run,
    ids: string[] = [],
    versions: string[] = [];
  let taxonomyId: string;
  beforeAll(async () => {
    if (
      process.env.TEST_ADMIN_DATABASE_TESTS !== 'YES' ||
      process.env.NODE_ENV !== 'test' ||
      process.env.POST28_TARGET_LABEL !== 'DB-T' ||
      process.env.DATABASE_URL !== process.env.DIRECT_URL
    )
      throw Error('ISOLATED_TEST_ADMIN_AUTHORIZATION_REQUIRED');
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
    await db.$connect();
    repo = new PrismaInternationalTestRepository(db);
    country = await db.referenceCountry.upsert({
      where: { iso2Code: 'ZX' },
      create: {
        iso2Code: 'ZX',
        iso3Code: 'ZXX',
        name: 'Isolated country',
        nameAr: 'دولة اختبار معزولة',
      },
      update: {},
    });
    language = await db.referenceLanguage.upsert({
      where: { isoCode: 'en' },
      create: { isoCode: 'en', name: 'English', nameAr: 'الإنجليزية', direction: 'LTR' },
      update: {},
    });
    degree = await db.degreeLevel.findUniqueOrThrow({ where: { canonicalCode: 'BACHELOR' } });
    taxonomyId = (
      await db.academicTaxonomyNode.create({
        data: {
          deterministicKey: 'test06-' + run,
          nodeType: 'DISCIPLINE',
          canonicalCode: 'TEST06-' + run,
          canonicalName: 'Isolated taxonomy',
          localizedNames: { ar: 'تصنيف اختبار' },
          status: 'ACTIVE',
        },
      })
    ).id;
    for (let i = 0; i < 28; i++) {
      const id = randomUUID();
      ids.push(id);
      await db.internationalTest.create({
        data: {
          id,
          publicId: 'TST06-' + id,
          slug: 'test06-' + id,
          canonicalName: 'Synthetic06 ' + String(i).padStart(2, '0') + ' ' + run,
          canonicalDedupKey: 'test06-' + id,
          displayName: 'اختبار معزول ' + i,
          localizedNameAr: 'اختبار واجهة معزول ' + i,
          localizedNameEn: 'Synthetic UI test ' + i,
          abbreviation: 'S06-' + i,
          providerName: provider,
          testCategory: 'ENGLISH_LANGUAGE',
          status: i % 2 ? 'READY_TO_REVIEW' : 'IMPORTED',
          completenessStatus: i % 3 ? 'COMPLETE' : 'INCOMPLETE',
          availability: { create: { availableCountryIds: i % 2 ? [country.id] : [] } },
          ...(i === 0
            ? {
                evidence: {
                  create: {
                    sourceUrl: 'https://example.org/section06',
                    retrievedAt: new Date(),
                    sourceTrustLevel: 'OFFICIAL',
                  },
                },
              }
            : {}),
        },
      });
    }
    for (const [index, count] of [5, 12, 18].entries()) {
      const v = await db.internationalTestVersion.create({
        data: {
          testId: ids[0],
          versionNumber: index + 1,
          status: 'DRAFT',
          sourceHash: String(index + 1).repeat(64),
          sourceFileName: 'Synthetic-' + count + '.md',
          sourceLocale: 'ar',
          importedAt: new Date(),
          metadata: {
            detectedSections: Array.from({ length: count }, (_, i) => ({
              sectionNumber: i + 1,
              blockKey: 'sec-' + (i + 1),
              title: i + 1 + '. عنوان أصلي',
            })),
          },
          contentBlocks: {
            create: [
              {
                blockKey: 'source.raw',
                blockType: 'RAW_SOURCE',
                content: 'exact source ' + count,
                locale: 'ar',
              },
              ...Array.from({ length: count }, (_, i) => ({
                blockKey: 'sec-' + (i + 1),
                blockType: i === count - 1 ? 'UNMAPPED_SOURCE_SECTION' : 'SOURCE_SECTION',
                title: i + 1 + '. عنوان أصلي ' + count,
                content:
                  '## ' +
                  (i + 1) +
                  '. المصدر\n\n| مفتاح | قيمة |\n|---|---|\n| دقيقة | ' +
                  count +
                  ' |',
                locale: 'ar',
                reviewStatus: 'NEEDS_REVIEW',
              })),
            ],
          },
        },
      });
      versions.push(v.id);
    }
    await db.internationalTestCountryRelationship.create({
      data: {
        testId: ids[0],
        canonicalReferenceId: country.id,
        countryIso2Code: 'ZX',
        relationshipType: 'AVAILABLE_IN',
      },
    });
    await db.internationalTestLanguageRelationship.create({
      data: {
        testId: ids[0],
        canonicalReferenceId: language.id,
        languageIsoCode: 'en',
        relationshipType: 'EXAM_LANGUAGE',
      },
    });
    await db.internationalTestAcademicTaxonomyRelationship.create({
      data: { testId: ids[0], taxonomyNodeId: taxonomyId, relationshipType: 'RELATED_TO' },
    });
    await db.internationalTestDegreeRelationship.create({
      data: {
        testId: ids[0],
        degreeLevelId: degree.id,
        degreeLevelCode: 'BACHELOR',
        relationshipType: 'ADMISSION_TO',
      },
    });
  }, 60000);
  afterAll(async () => {
    if (!db) return;
    await db.internationalTest.deleteMany({ where: { id: { in: ids } } });
    if (taxonomyId) await db.academicTaxonomyNode.delete({ where: { id: taxonomyId } });
    await db.$disconnect();
  });
  it('pages complete server results and keeps all four metrics within the same filtered scope', async () => {
    const first = await repo.list({ providerName: provider, page: 1, pageSize: 20 }),
      second = await repo.list({ providerName: provider, page: 2, pageSize: 20 });
    expect(first.total).toBe(28);
    expect(first.data).toHaveLength(20);
    expect(second.data).toHaveLength(8);
    expect(new Set([...first.data, ...second.data].map((row) => row.id)).size).toBe(28);
    expect(first.statistics).toMatchObject({
      scope: 'FILTERED',
      underReview: 14,
      published: 0,
      incomplete: 10,
    });
  });
  it('combines country, status, search, provider and completeness on the server', async () => {
    const result = await repo.list({
      providerName: provider,
      countryIso2Code: 'ZX',
      status: InternationalTestStatus.READY_TO_REVIEW,
      category: InternationalTestCategory.ENGLISH_LANGUAGE,
      completenessStatus: 'COMPLETE' as never,
      searchQuery: run,
    });
    expect(result.total).toBe(9);
    expect(
      result.data.every(
        (row) =>
          row.providerName === provider &&
          row.status === 'READY_TO_REVIEW' &&
          row.completenessStatus === 'COMPLETE',
      ),
    ).toBe(true);
    expect(result.statistics?.underReview).toBe(9);
  });
  it('keeps missing evidence distinct from fresh evidence when filtering stale sources', async () => {
    const result = await repo.list({ providerName: provider, staleOnly: true, pageSize: 100 });
    expect(result.total).toBe(27);
    expect(result.data.some((row) => row.id === ids[0])).toBe(false);
  });
  it.each([5, 12, 18])(
    'reads %s original source sections without counting backup or changing source bytes',
    async (count) => {
      const before = await db.internationalTestContentBlock.findMany({
          where: { versionId: { in: versions } },
          orderBy: { id: 'asc' },
        }),
        read = await repo.listImportVersions(ids[0]);
      const version = read.find((row) => row.sourceFileName === 'Synthetic-' + count + '.md')!;
      expect(sourceSections(version as TestSourceVersion)).toHaveLength(count);
      expect(version.contentBlocks?.find((row) => row.blockKey === 'source.raw')?.content).toBe(
        'exact source ' + count,
      );
      expect(sourceSections(version as TestSourceVersion).at(-1)?.block.blockType).toBe(
        'UNMAPPED_SOURCE_SECTION',
      );
      expect(
        await db.internationalTestContentBlock.findMany({
          where: { versionId: { in: versions } },
          orderBy: { id: 'asc' },
        }),
      ).toEqual(before);
    },
  );
  it('returns canonical relationship names from the actual referenced records', async () => {
    const value = await repo.findById(ids[0]);
    expect(value?.countryRelationships?.[0]).toMatchObject({
      canonicalReferenceId: country.id,
      referenceNameEn: country.name,
      referenceNameAr: country.nameAr,
    });
    expect(value?.languageRelationships?.[0]).toMatchObject({
      canonicalReferenceId: language.id,
      referenceNameEn: language.name,
    });
    expect(value?.degreeRelationships?.[0]).toMatchObject({
      degreeLevelId: degree.id,
      referenceNameAr: degree.nameAr,
    });
    expect(value?.academicTaxonomyRelationships?.[0]).toMatchObject({
      taxonomyNodeId: taxonomyId,
      referenceNameAr: 'تصنيف اختبار',
      referenceCode: 'TEST06-' + run,
    });
  });
});

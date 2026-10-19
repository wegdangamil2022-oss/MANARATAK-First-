import { Prisma, type PrismaClient } from '@prisma/client';

import type {
  TranslationWorkspaceQuery,
  ITranslationWorkspaceReadGateway,
} from '@absheer/application';
/** Read projection only: owner rows retain all authoring/review/publication authority. */
export class PrismaTranslationWorkspaceReadGateway implements ITranslationWorkspaceReadGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async search(input: TranslationWorkspaceQuery) {
    const tables = {
      UNIVERSITY: '"University"',
      MAJOR: '"Major"',
      INTERNATIONAL_TEST: '"InternationalTest"',
      SCHOLARSHIP: '"Scholarship"',
      COURSE: '"Course"',
    } as const;
    const table = Prisma.raw(tables[input.domain]);
    const university = input.domain === 'UNIVERSITY';
    const explicit = input.domain === 'MAJOR' || input.domain === 'INTERNATIONAL_TEST';
    const name = (locale: 'ar' | 'en') =>
      university
        ? Prisma.sql`(SELECT COALESCE(t.metadata->'pendingTranslationFields'->'displayName'->>'value',t."displayName") FROM "UniversityTranslation" t WHERE t."universityId"=o.id AND t.locale=${locale} AND t."reviewStatus" <> 'REJECTED')`
        : input.domain === 'MAJOR'
          ? Prisma.sql`COALESCE(o."optionalFields"->'translationNameCandidates'->${locale}->>'value',${Prisma.raw(locale === 'ar' ? 'o."localizedNameAr"' : 'o."localizedNameEn"')})`
          : explicit
            ? Prisma.raw(locale === 'ar' ? 'o."localizedNameAr"' : 'o."localizedNameEn"')
            : Prisma.sql`o."optionalFields"->'localizedNames'->>${locale}`;
    const state = (locale: 'ar' | 'en') =>
      university
        ? Prisma.sql`COALESCE((SELECT CASE WHEN t.metadata->'pendingTranslationFields'->'displayName' IS NOT NULL OR t.metadata->'pendingTranslationFields'->'description' IS NOT NULL THEN 'APPROVED' ELSE t."reviewStatus" END FROM "UniversityTranslation" t WHERE t."universityId"=o.id AND t.locale=${locale}), 'MISSING')`
        : input.domain === 'MAJOR'
          ? Prisma.sql`COALESCE(o."optionalFields"->'translationNameCandidates'->${locale}->>'reviewStatus',CASE WHEN NULLIF(trim(${name(locale)}),'') IS NULL THEN 'MISSING' ELSE 'VALUE_PRESENT_NOT_PUBLIC_READY' END)`
          : Prisma.sql`CASE WHEN NULLIF(trim(${name(locale)}), '') IS NULL THEN 'MISSING' ELSE 'VALUE_PRESENT_NOT_PUBLIC_READY' END`;
    // This SQL coverage projection does not compute the owner source/value proof.
    // A stored PUBLISHED state is never promoted into verified public readiness here.
    const published = () => Prisma.sql`false`;
    const coverage =
      input.coverage === 'MISSING_AR'
        ? Prisma.sql`NOT "hasAr"`
        : input.coverage === 'MISSING_EN'
          ? Prisma.sql`NOT "hasEn"`
          : input.coverage === 'COMPLETE'
            ? Prisma.sql`"hasAr" AND "hasEn"`
            : Prisma.sql`true`;
    const statusField =
      input.locale === 'ar'
        ? Prisma.raw('"translationStateAr"')
        : Prisma.raw('"translationStateEn"');
    const review =
      input.reviewState === 'NEEDS_REVIEW'
        ? Prisma.sql`${statusField} <> 'PUBLISHED'`
        : input.reviewState === 'PUBLISHED'
          ? Prisma.sql`${statusField} = 'PUBLISHED'`
          : Prisma.sql`true`;
    const where = Prisma.sql`${coverage} AND ${review} AND (${input.updatedFrom ?? null}::timestamptz IS NULL OR "updatedAt" >= ${input.updatedFrom ?? null})`;
    const cte = Prisma.sql`WITH source AS (SELECT o.id,o."publicId",o.slug,o."displayName",o.status,o."updatedAt", ${name('ar')} AS "localizedNameAr",${name('en')} AS "localizedNameEn",${state('ar')} AS "translationStateAr",${state('en')} AS "translationStateEn", ${published()} AS "publicReadyAr",${published()} AS "publicReadyEn" FROM ${table} o WHERE (${input.q ?? ''}='' OR o."displayName" ILIKE ${'%' + (input.q ?? '') + '%'} OR o."publicId" ILIKE ${'%' + (input.q ?? '') + '%'})), coverage AS (SELECT *,NULLIF(trim("localizedNameAr"),'') IS NOT NULL AS "hasAr",NULLIF(trim("localizedNameEn"),'') IS NOT NULL AS "hasEn" FROM source)`;
    // Stable owner ordering, server-side filtering before count and pagination.
    return this.prisma.$transaction(
      async (tx) => {
        const data = await tx.$queryRaw<Array<Record<string, unknown>>>(
          Prisma.sql`${cte} SELECT * FROM coverage WHERE ${where} ORDER BY "updatedAt" DESC,id ASC LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`,
        );
        const [counts] = await tx.$queryRaw<
          Array<{
            total: bigint;
            missingAr: bigint;
            missingEn: bigint;
            publicReadyAr: bigint;
            publicReadyEn: bigint;
            complete: bigint;
            pending: bigint;
            rejected: bigint;
            published: bigint;
          }>
        >(
          Prisma.sql`${cte} SELECT count(*) AS total,count(*) FILTER(WHERE "hasAr" AND "hasEn") AS complete,count(*) FILTER(WHERE ${statusField} IN ('APPROVED','NEEDS_REVIEW','VALUE_PRESENT_NOT_PUBLIC_READY')) AS pending,count(*) FILTER(WHERE ${statusField}='REJECTED') AS rejected,count(*) FILTER(WHERE ${statusField}='PUBLISHED') AS published,count(*) FILTER(WHERE NOT "hasAr") AS "missingAr",count(*) FILTER(WHERE NOT "hasEn") AS "missingEn",count(*) FILTER(WHERE "publicReadyAr") AS "publicReadyAr",count(*) FILTER(WHERE "publicReadyEn") AS "publicReadyEn" FROM coverage WHERE ${where}`,
        );
        const total = Number(counts.total);
        return {
          data: data.map((row) => ({
            ...row,
            translations: university
              ? ['ar', 'en'].map((locale) => ({
                  locale,
                  displayName: row[locale === 'ar' ? 'localizedNameAr' : 'localizedNameEn'],
                  reviewStatus: row[locale === 'ar' ? 'translationStateAr' : 'translationStateEn'],
                }))
              : undefined,
          })),
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
          coverageScope: 'GLOBAL' as const,
          fieldScope: 'NAME_AND_OWNER_READINESS',
          ownerSourceStatus: 'CANONICAL_OWNER_READ',
          runtimeProof: 'UNVERIFIED',
          migrationRequired: input.domain === 'SCHOLARSHIP' || input.domain === 'COURSE',
          publicationReadiness: university ? 'UNKNOWN_OWNER_SOURCE_EVIDENCE' : 'UNKNOWN_OWNER_FIELD_EVIDENCE',
          importSupported: ['UNIVERSITY', 'MAJOR'].includes(input.domain),
          stats: {
            complete: Number(counts.complete),
            pending: Number(counts.pending),
            rejected: Number(counts.rejected),
            published: Number(counts.published),
            missingAr: Number(counts.missingAr),
            missingEn: Number(counts.missingEn),
            publicReadyAr: Number(counts.publicReadyAr),
            publicReadyEn: Number(counts.publicReadyEn),
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}

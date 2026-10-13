import { Prisma, type PrismaClient } from '@prisma/client';
import {
  type IUniversityProgramWorkspaceGateway,
  type ProgramQuery,
  type UniversityMutationContext,
} from '@manaratak/application';
import {
  type AtomicPersistenceContext,
  type ProgramStudy,
  type ProgramIntake,
  intakeWindow,
  assertProgramEvidenceUrl,
} from '@manaratak/domain';
import { PrismaUniversityRepository } from './PrismaUniversityRepository';
export class PrismaUniversityProgramWorkspaceGateway implements IUniversityProgramWorkspaceGateway {
  constructor(private readonly db: PrismaClient) {}
  async query(input: ProgramQuery, publicOnly = false) {
    const clauses: Prisma.Sql[] = [Prisma.sql`TRUE`];
    const fields: Record<string, Prisma.Sql> = {
      universityId: Prisma.sql`p."universityId"`,
      universityPublicId: Prisma.sql`u."publicId"`,
      majorId: Prisma.sql`p."majorId"`,
      degreeLevelId: Prisma.sql`p."degreeLevelId"`,
      countryReferenceId: Prisma.sql`u."countryReferenceId"`,
      regionReferenceId: Prisma.sql`u."regionReferenceId"`,
      cityReferenceId: Prisma.sql`u."cityReferenceId"`,
      programStatus: Prisma.sql`p.status`,
      parentStatus: Prisma.sql`u.status::text`,
      studyMode: Prisma.sql`s."studyMode"`,
      teachingDelivery: Prisma.sql`s."teachingDelivery"`,
    };
    for (const [key, column] of Object.entries(fields)) {
      const value = (input as unknown as Record<string, unknown>)[key];
      if (publicOnly && ['studyMode', 'teachingDelivery'].includes(key) && value === 'UNKNOWN') {
        clauses.push(
          Prisma.sql`(${column}='UNKNOWN' OR s."programId" IS NULL OR s."verificationStatus"!='VERIFIED')`,
        );
        continue;
      }
      if (typeof value === 'string' && value) clauses.push(Prisma.sql`${column}=${value}`);
    }
    if (input.search)
      clauses.push(
        Prisma.sql`(p."sourceProgramName" ILIKE ${'%' + input.search + '%'} OR u."displayName" ILIKE ${'%' + input.search + '%'})`,
      );
    if (input.internationalTestId)
      clauses.push(
        Prisma.sql`EXISTS(SELECT 1 FROM "UniversityProgramAdmissionRequirement" r WHERE r."academicProgramId"=p.id AND r."internationalTestId"=${input.internationalTestId} AND r.status='ACTIVE' ${publicOnly ? Prisma.sql`AND EXISTS(SELECT 1 FROM "InternationalTest" t WHERE t.id=r."internationalTestId" AND t.status='PUBLISHED' AND t."isPubliclyVisible")` : Prisma.empty})`,
      );
    if (input.languageReferenceId)
      clauses.push(
        Prisma.sql`EXISTS(SELECT 1 FROM "UniversityProgramStudyLanguage" pl JOIN "ReferenceLanguage" l ON l.id=pl."languageReferenceId" WHERE pl."programId"=p.id AND l.id=${input.languageReferenceId} AND l."isActive" AND l."lifecycleState"='ACTIVE')${publicOnly ? Prisma.sql` AND s."verificationStatus"='VERIFIED'` : Prisma.empty}`,
      );
    const scholarship = Prisma.sql`EXISTS(SELECT 1 FROM "ScholarshipUniversityLink" sl JOIN "Scholarship" sh ON sh.id=sl."scholarshipId" WHERE sl."academicProgramId"=p.id ${publicOnly ? Prisma.sql`AND sh."publicationStatus"='PUBLISHED' AND sh."verificationStatus"='VERIFIED'` : Prisma.empty})`;
    if (input.hasScholarships !== undefined)
      clauses.push(input.hasScholarships ? scholarship : Prisma.sql`NOT ${scholarship}`);
    if (publicOnly)
      clauses.push(Prisma.sql`u.status='PUBLISHED' AND p.status='ACTIVE' AND p."majorMappingState"='CANONICALLY_MAPPED'
      AND EXISTS(SELECT 1 FROM "Major" m JOIN "MajorLevelProfile" ml ON ml."majorId"=m.id WHERE m.id=p."majorId" AND m.status='PUBLISHED' AND ml."degreeLevelId"=p."degreeLevelId" AND ml.status='PUBLISHED' AND ml."currentPublishedVersionId" IS NOT NULL)
      AND EXISTS(SELECT 1 FROM "DegreeLevel" dl WHERE dl.id=p."degreeLevelId" AND dl.status='ACTIVE')`);
    if (
      publicOnly &&
      (input.languageReferenceId ||
        (input.studyMode && input.studyMode !== 'UNKNOWN') ||
        (input.teachingDelivery && input.teachingDelivery !== 'UNKNOWN'))
    )
      clauses.push(Prisma.sql`s."verificationStatus"='VERIFIED'`);
    const where = Prisma.join(clauses, ' AND ');
    const cursor = input.cursor ? Prisma.sql`AND p.id>${input.cursor}` : Prisma.empty;
    return this.db.$transaction(
      async (tx) => {
        const ids = await tx.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT p.id FROM "UniversityAcademicProgram" p JOIN "University" u ON u.id=p."universityId" LEFT JOIN "UniversityProgramStudyProfile" s ON s."programId"=p.id WHERE ${where} ${cursor} ORDER BY p.id LIMIT ${input.limit + 1}`,
        );
        const count = await tx.$queryRaw<Array<{ total: bigint }>>(
          Prisma.sql`SELECT count(*)::bigint AS total FROM "UniversityAcademicProgram" p JOIN "University" u ON u.id=p."universityId" LEFT JOIN "UniversityProgramStudyProfile" s ON s."programId"=p.id WHERE ${where}`,
        );
        const rows = await tx.universityAcademicProgram.findMany({
          where: { id: { in: ids.slice(0, input.limit).map((row) => row.id) } },
          orderBy: { id: 'asc' },
          include: {
            university: {
              select: {
                id: true,
                displayName: true,
                slug: true,
                status: true,
                updatedAt: true,
                countryReferenceId: true,
                regionReferenceId: true,
                cityReferenceId: true,
              },
            },
            studyProfile: { include: { languages: { include: { language: true } } } },
            intakes: { orderBy: [{ applicationClose: 'asc' }, { id: 'asc' }] },
            _count: {
              select: {
                scholarshipLinks: publicOnly
                  ? {
                      where: {
                        scholarship: {
                          publicationStatus: 'PUBLISHED',
                          verificationStatus: 'VERIFIED',
                        },
                      },
                    }
                  : true,
              },
            },
          },
        });
        const items = rows.map((row) => {
          const profile = row.studyProfile;
          let verified = profile?.verificationStatus === 'VERIFIED';
          if (verified)
            try {
              assertProgramEvidenceUrl(profile!.officialSourceUrl ?? '');
            } catch {
              verified = false;
            }
          const study =
            profile && (!publicOnly || verified)
              ? {
                  languages: profile.languages
                    .filter(
                      (link) => link.language.isActive && link.language.lifecycleState === 'ACTIVE',
                    )
                    .map((link) => ({
                      id: link.languageReferenceId,
                      name: link.language.name,
                      nameAr: link.language.nameAr,
                      isoCode: link.language.isoCode,
                    })),
                  languageReferenceIds: profile.languages
                    .filter(
                      (link) => link.language.isActive && link.language.lifecycleState === 'ACTIVE',
                    )
                    .map((link) => link.languageReferenceId),
                  studyMode: profile.studyMode,
                  teachingDelivery: profile.teachingDelivery,
                  durationValue: profile.durationValue,
                  durationUnit: profile.durationUnit,
                  entryEligibility: profile.entryEligibility,
                  verificationStatus: profile.verificationStatus,
                  officialSourceUrl: profile.officialSourceUrl,
                  ...(publicOnly
                    ? {}
                    : {
                        verifiedBy: profile.verifiedBy,
                        verifiedAt: profile.verifiedAt?.toISOString() ?? null,
                      }),
                }
              : null;
          const intakes = row.intakes
            .filter(
              (intake) =>
                !publicOnly ||
                (intake.status === 'ACTIVE' && intake.verificationStatus === 'VERIFIED'),
            )
            .flatMap((intake) => {
              try {
                assertProgramEvidenceUrl(intake.officialSourceUrl);
              } catch {
                return [];
              }
              const item = {
                id: intake.id,
                intakeStart: intake.intakeStart.toISOString(),
                applicationOpen: intake.applicationOpen.toISOString(),
                applicationClose: intake.applicationClose.toISOString(),
                applicantSegment: intake.applicantSegment,
                timezone: intake.timezone,
                officialSourceUrl: intake.officialSourceUrl,
                status: intake.status,
                verificationStatus: intake.verificationStatus,
              };
              return [
                {
                  ...item,
                  window: intakeWindow(item as ProgramIntake),
                  ...(publicOnly
                    ? {}
                    : {
                        verifiedBy: intake.verifiedBy,
                        verifiedAt: intake.verifiedAt?.toISOString() ?? null,
                      }),
                },
              ];
            });
          return {
            id: row.id,
            universityId: row.universityId,
            universityName: row.university.displayName,
            universitySlug: row.university.slug,
            ...(publicOnly
              ? {}
              : {
                  parentStatus: row.university.status,
                  parentRevision: row.university.updatedAt.getTime(),
                  majorMappingState: row.majorMappingState,
                }),
            sourceProgramName: row.sourceProgramName,
            degreeLevelId: row.degreeLevelId,
            majorId: row.majorId,
            status: row.status,
            study,
            intakes,
            scholarshipCount: row._count.scholarshipLinks,
          };
        });
        return {
          items,
          total: Number(count[0]?.total ?? 0),
          nextCursor: ids.length > input.limit ? (items.at(-1)?.id ?? null) : null,
          hasMore: ids.length > input.limit,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async save(
    programId: string,
    input: { study?: ProgramStudy; intake?: ProgramIntake },
    context: UniversityMutationContext,
    tx: AtomicPersistenceContext,
  ) {
    const client = (
      tx as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!client || !tx.boundaryId) throw new Error('UNIVERSITY_PROGRAM_TRANSACTION_REQUIRED');
    const program = await client.universityAcademicProgram.findUnique({ where: { id: programId } });
    if (!program) throw new Error('UNIVERSITY_PROGRAM_NOT_FOUND');
    const owner = new PrismaUniversityRepository(client as unknown as PrismaClient, false, true);
    await owner.lockForRevision(program.universityId, context.expectedRevision!);
    const root = await client.university.findUniqueOrThrow({ where: { id: program.universityId } });
    if (root.status === 'PUBLISHED') throw new Error('UNIVERSITY_PUBLISHED_IMMUTABLE');
    if (program.status === 'ARCHIVED') throw new Error('UNIVERSITY_PROGRAM_INACTIVE_IMMUTABLE');
    const verifiedAt = new Date();
    if (input.study) {
      const { languageReferenceIds, ...fields } = input.study;
      const languages = await client.referenceLanguage.findMany({
        where: { id: { in: languageReferenceIds }, isActive: true, lifecycleState: 'ACTIVE' },
        select: { id: true },
      });
      if (languages.length !== languageReferenceIds.length)
        throw new Error('UNIVERSITY_PROGRAM_LANGUAGE_INVALID');
      const data = {
        ...fields,
        durationValue: fields.durationValue ?? null,
        durationUnit: fields.durationUnit ?? null,
        entryEligibility: fields.entryEligibility ?? null,
        officialSourceUrl: fields.officialSourceUrl ?? null,
        verifiedBy: fields.verificationStatus === 'VERIFIED' ? context.actorId : null,
        verifiedAt: fields.verificationStatus === 'VERIFIED' ? verifiedAt : null,
      };
      await client.universityProgramStudyProfile.upsert({
        where: { programId },
        create: { programId, ...data },
        update: data,
      });
      await client.universityProgramStudyLanguage.deleteMany({
        where: { programId, languageReferenceId: { notIn: languageReferenceIds } },
      });
      await client.universityProgramStudyLanguage.createMany({
        data: languageReferenceIds.map((languageReferenceId) => ({
          programId,
          languageReferenceId,
        })),
        skipDuplicates: true,
      });
    }
    if (input.intake) {
      const intake = input.intake;
      const existing = await client.universityProgramIntake.findUnique({
        where: { id: intake.id },
      });
      if (existing && existing.programId !== programId)
        throw new Error('UNIVERSITY_PROGRAM_INTAKE_OWNERSHIP_CONFLICT');
      const data = {
        ...intake,
        intakeStart: new Date(intake.intakeStart),
        applicationOpen: new Date(intake.applicationOpen),
        applicationClose: new Date(intake.applicationClose),
        verifiedBy: intake.verificationStatus === 'VERIFIED' ? context.actorId : null,
        verifiedAt: intake.verificationStatus === 'VERIFIED' ? verifiedAt : null,
      };
      await client.universityProgramIntake.upsert({
        where: { id: intake.id },
        create: { ...data, programId },
        update: data,
      });
    }
    if (root.status === 'READY_TO_PUBLISH')
      await client.university.update({
        where: { id: root.id },
        data: { status: 'READY_TO_REVIEW' },
      });
    return {
      programId,
      universityId: root.id,
      revision: await owner.advanceRevision(root.id, context.expectedRevision!),
    };
  }
}

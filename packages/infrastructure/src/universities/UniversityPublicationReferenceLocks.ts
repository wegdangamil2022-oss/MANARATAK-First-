import { Prisma, type PrismaClient } from '@prisma/client';

/** Called after the University revision lock, inside its owner mutation transaction.
 * Lock owner rows before their children, then read readiness again at READ COMMITTED.
 * Reference withdrawal may finish before these locks (and is rejected by the reread),
 * or wait until publication commits. No reference data is changed here.
 */
export async function lockUniversityPublicationReferences(client: PrismaClient, universityId: string): Promise<void> {
  const programs = Prisma.sql`SELECT "majorId" FROM "UniversityAcademicProgram" WHERE "universityId"=${universityId} AND status='ACTIVE'`;
  const tests = Prisma.sql`SELECT r."internationalTestId" FROM "UniversityProgramAdmissionRequirement" r JOIN "UniversityAcademicProgram" p ON p.id=r."academicProgramId" WHERE p."universityId"=${universityId} AND p.status='ACTIVE' AND r.status='ACTIVE'`;
  const references: ReadonlyArray<readonly [string, Prisma.Sql]> = [
    ['Major', programs],
    ['MajorLevelProfile', Prisma.sql`SELECT id FROM "MajorLevelProfile" WHERE "majorId" IN (${programs})`],
    ['MajorVersion', Prisma.sql`SELECT id FROM "MajorVersion" WHERE "majorId" IN (${programs})`],
    ['DegreeLevel', Prisma.sql`SELECT "degreeLevelId" FROM "UniversityAcademicProgram" WHERE "universityId"=${universityId} AND status='ACTIVE'`],
    ['InternationalTest', tests],
    ['InternationalTestVariant', Prisma.sql`SELECT id FROM "InternationalTestVariant" WHERE "testId" IN (${tests})`],
    ['InternationalTestVersion', Prisma.sql`SELECT id FROM "InternationalTestVersion" WHERE "testId" IN (${tests})`],
    ['InternationalTestVersionScoreScale', Prisma.sql`SELECT s.id FROM "InternationalTestVersionScoreScale" s JOIN "InternationalTestVersion" v ON v.id=s."versionId" WHERE v."testId" IN (${tests})`],
    ['ReferenceCountry', Prisma.sql`SELECT "countryReferenceId" FROM "University" WHERE id=${universityId} UNION SELECT "countryReferenceId" FROM "UniversityCampus" WHERE "universityId"=${universityId}`],
    ['AdministrativeRegion', Prisma.sql`SELECT "regionReferenceId" FROM "University" WHERE id=${universityId} UNION SELECT "regionReferenceId" FROM "UniversityCampus" WHERE "universityId"=${universityId}`],
    ['ReferenceCity', Prisma.sql`SELECT "cityReferenceId" FROM "University" WHERE id=${universityId} UNION SELECT "cityReferenceId" FROM "UniversityCampus" WHERE "universityId"=${universityId}`],
  ];
  for (const [table, ids] of references) {
    // Table names come only from the fixed list above; all IDs remain parameters.
    await client.$queryRaw(Prisma.sql`SELECT id FROM ${Prisma.raw('"' + table + '"')} WHERE id IN (${ids}) ORDER BY id FOR SHARE`);
  }
}

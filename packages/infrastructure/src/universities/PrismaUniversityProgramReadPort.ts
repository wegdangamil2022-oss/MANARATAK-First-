import { Prisma, type PrismaClient } from '@prisma/client';
import {
  isPublicUniversityProgram,
  type AtomicPersistenceContext,
  type IUniversityProgramReadPort,
  type PublishedUniversityProgramQueryV1,
  type UniversityProgramReferenceV1,
} from '@manaratak/domain';

const proofSelect = {
  id: true,
  universityId: true,
  degreeLevelId: true,
  majorId: true,
  normalizedName: true,
  sourceProgramName: true,
  status: true,
  degreeLevel: { select: { nameAr: true, nameEn: true, canonicalCode: true } },
  majorMappingState: true,
  university: { select: { status: true } },
  major: {
    select: {
      displayName: true,
      status: true,
      levelProfiles: {
        select: { id: true, degreeLevelId: true, status: true, currentPublishedVersionId: true, currentPublishedVersion: { select: { id: true, majorId: true, profileId: true, status: true } } },
      },
    },
  },
} satisfies Prisma.UniversityAcademicProgramSelect;
type Proof = Prisma.UniversityAcademicProgramGetPayload<{ select: typeof proofSelect }>;

export class PrismaUniversityProgramReadPort implements IUniversityProgramReadPort {
  constructor(private readonly prisma: PrismaClient) {}

  withTransaction(context: AtomicPersistenceContext): IUniversityProgramReadPort {
    const client = (
      context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!context.boundaryId || !client)
      throw new Error('UNIVERSITY_PROGRAM_READ_TRANSACTION_REQUIRED');
    return new PrismaUniversityProgramReadPort(client as PrismaClient);
  }

  private validateId(id: string): void {
    if (typeof id !== 'string' || !id.trim() || id.length > 240 || id !== id.trim())
      throw new Error('UNIVERSITY_PROGRAM_READ_ID_INVALID');
  }
  private project(row: Proof): UniversityProgramReferenceV1 {
    return {
      contractVersion: 1,
      id: row.id,
      universityId: row.universityId,
      degreeLevelId: row.degreeLevelId,
      majorId: row.majorId,
      canonicalName: row.normalizedName || row.sourceProgramName,
      displayName: row.sourceProgramName,
      degreeLabel: row.degreeLevel?.nameAr || row.degreeLevel?.nameEn || row.degreeLevel?.canonicalCode,
      majorLabel: row.major?.displayName,
      status: row.status,
      publiclyEligible: row.university?.status === 'PUBLISHED' && isPublicUniversityProgram(row),
    };
  }
  async findByIds(ids: readonly string[]): Promise<UniversityProgramReferenceV1[]> {
    const unique = [...new Set(ids)];
    if (ids.length > 500 || unique.length > 500)
      throw new Error('UNIVERSITY_PROGRAM_READ_SCOPE_TOO_LARGE');
    unique.forEach((id) => this.validateId(id));
    if (!unique.length) return [];
    const rows = await this.prisma.universityAcademicProgram.findMany({
      where: { id: { in: unique } },
      select: proofSelect,
      orderBy: { id: 'asc' },
      take: 501,
    });
    if (rows.length > 500) throw new Error('UNIVERSITY_PROGRAM_READ_SCOPE_TOO_LARGE');
    // Defend the contract even if a delegate/test double returns rows outside the requested scope.
    return rows.filter((row) => unique.includes(row.id)).map((row) => this.project(row));
  }
  async findPublished(
    query: PublishedUniversityProgramQueryV1,
  ): Promise<UniversityProgramReferenceV1[]> {
    const values = [query.universityId, query.academicProgramId, query.degreeLevelId, query.majorId].filter(
      (id): id is string => id !== undefined,
    );
    if (!values.length) throw new Error('UNIVERSITY_PROGRAM_READ_SCOPE_REQUIRED');
    values.forEach((id) => this.validateId(id));
    const rows = await this.prisma.universityAcademicProgram.findMany({
      where: {
        ...(query.universityId ? { universityId: query.universityId } : {}),
        ...(query.academicProgramId ? { id: query.academicProgramId } : {}),
        ...(query.degreeLevelId ? { degreeLevelId: query.degreeLevelId } : {}),
        ...(query.majorId ? { majorId: query.majorId } : {}),
        status: 'ACTIVE',
        majorMappingState: 'CANONICALLY_MAPPED',
        university: { is: { status: 'PUBLISHED' } },
        major: { is: { status: 'PUBLISHED' } },
      },
      select: proofSelect,
      orderBy: { id: 'asc' },
      take: 501,
    });
    if (rows.length > 500) throw new Error('SCHOLARSHIP_PROGRAM_OWNER_SCOPE_REQUIRES_PAGED_QUERY');
    return rows
      .map((row) => this.project(row))
      .filter(
        (row) =>
          row.publiclyEligible &&
          (!query.universityId || row.universityId === query.universityId) &&
          (!query.academicProgramId || row.id === query.academicProgramId) &&
          (!query.degreeLevelId || row.degreeLevelId === query.degreeLevelId) &&
          (!query.majorId || row.majorId === query.majorId),
      );
  }
}

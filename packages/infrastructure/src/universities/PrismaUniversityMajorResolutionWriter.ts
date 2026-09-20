import { PrismaClient } from '@prisma/client';

/** University-owned mutation port used by the Major discovery workflow. */
export class PrismaUniversityMajorResolutionWriter {
  public constructor(private readonly prisma: PrismaClient) {}

  public async resolveProgramMajor(programIds: readonly string[], majorId: string): Promise<number> {
    if (programIds.length === 0) return 0;
    const result = await this.prisma.universityAcademicProgram.updateMany({
      where: {
        id: { in: [...programIds] },
        majorId: null,
        majorMappingState: { in: ['MAJOR_REVIEW_REQUIRED', 'UNMAPPED'] },
      },
      data: { majorId, majorMappingState: 'CANONICALLY_MAPPED' },
    });
    return result.count;
  }
}

import { PrismaClient } from '@prisma/client';
import type {NewMajorCandidateSourceRef} from '@manaratak/domain';

/** University-owned mutation port used by the Major discovery workflow. */
export class PrismaUniversityMajorResolutionWriter {
  public constructor(private readonly prisma: PrismaClient) {}

  public async resolveProgramMajor(sources: readonly NewMajorCandidateSourceRef[], majorId: string): Promise<number> {
    if (sources.length === 0) return 0;
    const result = await this.prisma.universityAcademicProgram.updateMany({
      where: {OR:sources.map(source=>({id:source.sourceId,universityId:source.ownerId,sourceProgramName:source.rawLabel,
        updatedAt:source.sourceUpdatedAt ? new Date(source.sourceUpdatedAt) : undefined,
        degreeLevelId:source.degreeLevelId ?? null,status:source.status ?? undefined})),
        majorId:null,majorMappingState:{in:['MAJOR_REVIEW_REQUIRED','UNMAPPED','AMBIGUOUS']},
        university:{is:{status:{notIn:['ARCHIVED','REJECTED']}}}},
      data: {majorId,majorMappingState:'CANONICALLY_MAPPED'},
    });
    return result.count;
  }
}

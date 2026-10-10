import { PrismaClient } from '@prisma/client';
import type {NewMajorCandidateSourceRef} from '@manaratak/domain';

const RESOLVED_STATES = ['RESOLVED', 'NOT_APPLICABLE'];

/** Scholarship-owned mutation port used by the Major discovery workflow. */
export class PrismaScholarshipMajorResolutionWriter {
  public constructor(private readonly prisma: PrismaClient) {}

  public async resolveMajorReferences(input: {
    targets: readonly NewMajorCandidateSourceRef[];
    eligibility: readonly NewMajorCandidateSourceRef[];
    majorId: string;
  }): Promise<{ scholarshipMajorTargets: number; scholarshipEligibilityItems: number }> {
    const [targets, eligibility] = await Promise.all([
      input.targets.length
        ? this.prisma.scholarshipMajorTarget.updateMany({
            where: {OR:input.targets.map(source=>({id:source.sourceId,scholarshipId:source.ownerId,sourceLabel:source.rawLabel,updatedAt:source.sourceUpdatedAt ? new Date(source.sourceUpdatedAt) : undefined})), majorId:null,resolutionStatus:{notIn:RESOLVED_STATES},scholarship:{is:{status:{notIn:['ARCHIVED','REJECTED']}}}},
            data: { majorId: input.majorId, resolutionStatus: 'RESOLVED' },
          })
        : Promise.resolve({ count: 0 }),
      input.eligibility.length
        ? this.prisma.scholarshipEligibilityItem.updateMany({
            where: {OR:input.eligibility.map(source=>({id:source.sourceId,scholarshipId:source.ownerId,valueText:source.rawLabel,degreeLevelId:source.degreeLevelId ?? null,updatedAt:source.sourceUpdatedAt ? new Date(source.sourceUpdatedAt) : undefined})), majorId:null,resolutionStatus:{notIn:RESOLVED_STATES},scholarship:{is:{status:{notIn:['ARCHIVED','REJECTED']}}}},
            data: { majorId: input.majorId, resolutionStatus: 'RESOLVED' },
          })
        : Promise.resolve({ count: 0 }),
    ]);
    return {
      scholarshipMajorTargets: targets.count,
      scholarshipEligibilityItems: eligibility.count,
    };
  }
}

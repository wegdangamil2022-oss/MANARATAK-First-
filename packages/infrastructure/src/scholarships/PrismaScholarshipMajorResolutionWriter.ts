import { PrismaClient } from '@prisma/client';

const RESOLVED_STATES = ['RESOLVED', 'NOT_APPLICABLE'];

/** Scholarship-owned mutation port used by the Major discovery workflow. */
export class PrismaScholarshipMajorResolutionWriter {
  public constructor(private readonly prisma: PrismaClient) {}

  public async resolveMajorReferences(input: {
    targetIds: readonly string[];
    eligibilityIds: readonly string[];
    majorId: string;
  }): Promise<{ scholarshipMajorTargets: number; scholarshipEligibilityItems: number }> {
    const [targets, eligibility] = await Promise.all([
      input.targetIds.length
        ? this.prisma.scholarshipMajorTarget.updateMany({
            where: { id: { in: [...input.targetIds] }, majorId: null, resolutionStatus: { notIn: RESOLVED_STATES } },
            data: { majorId: input.majorId, resolutionStatus: 'RESOLVED' },
          })
        : Promise.resolve({ count: 0 }),
      input.eligibilityIds.length
        ? this.prisma.scholarshipEligibilityItem.updateMany({
            where: { id: { in: [...input.eligibilityIds] }, majorId: null, resolutionStatus: { notIn: RESOLVED_STATES } },
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

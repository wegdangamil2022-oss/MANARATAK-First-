import { Prisma, PrismaClient } from '@prisma/client';
import {
  CourseEnrollmentPolicyDto,
  ICourseEnrollmentPolicyRepository,
  UpsertCourseEnrollmentPolicyDto,
} from '@manaratak/domain';

const json = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export class PrismaCourseEnrollmentPolicyRepository implements ICourseEnrollmentPolicyRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getPolicy(courseId: string): Promise<CourseEnrollmentPolicyDto | null> {
    const row = await this.prisma.courseEnrollmentPolicy.findUnique({ where: { courseId } });
    return row ? this.map(row) : null;
  }

  public async upsertPolicy(data: UpsertCourseEnrollmentPolicyDto): Promise<CourseEnrollmentPolicyDto> {
    const payload = {
      isCapacityLimited: data.isCapacityLimited,
      maximumSeats: data.maximumSeats ?? null,
      requiresApproval: data.requiresApproval,
      waitlistEnabled: data.waitlistEnabled,
      prerequisiteCourseIds: json(data.prerequisiteCourseIds ?? [])!,
      eligibilityRules: data.eligibilityRules ? json(data.eligibilityRules) : Prisma.JsonNull,
      requiresFinancialClearance: data.requiresFinancialClearance,
    };
    return this.map(await this.prisma.courseEnrollmentPolicy.upsert({
      where: { courseId: data.courseId },
      create: { courseId: data.courseId, ...payload },
      update: payload,
    }));
  }

  private map(row: {
    courseId: string; isCapacityLimited: boolean; maximumSeats: number | null;
    requiresApproval: boolean; waitlistEnabled: boolean; prerequisiteCourseIds: Prisma.JsonValue;
    eligibilityRules: Prisma.JsonValue | null; requiresFinancialClearance: boolean;
    createdAt: Date; updatedAt: Date;
  }): CourseEnrollmentPolicyDto {
    return {
      ...row,
      prerequisiteCourseIds: Array.isArray(row.prerequisiteCourseIds)
        ? row.prerequisiteCourseIds.filter((value): value is string => typeof value === 'string')
        : [],
      eligibilityRules: row.eligibilityRules && typeof row.eligibilityRules === 'object' && !Array.isArray(row.eligibilityRules)
        ? row.eligibilityRules as Record<string, unknown>
        : null,
    };
  }
}

import {
  CourseEnrollmentPolicyDto,
  ICourseEnrollmentPolicyRepository,
  ICourseRepository,
  UpsertCourseEnrollmentPolicyDto,
} from '@manaratak/domain';

export class CourseEnrollmentPolicyUseCases {
  public constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly policyRepository: ICourseEnrollmentPolicyRepository,
  ) {}

  public async get(courseId: string): Promise<CourseEnrollmentPolicyDto | null> {
    await this.requireCourse(courseId);
    return this.policyRepository.getPolicy(courseId);
  }

  public async configure(input: UpsertCourseEnrollmentPolicyDto): Promise<CourseEnrollmentPolicyDto> {
    await this.requireCourse(input.courseId);
    if (input.isCapacityLimited && (!input.maximumSeats || input.maximumSeats < 1)) {
      throw new Error('COURSE_ENROLLMENT_CAPACITY_REQUIRED');
    }
    if (!input.isCapacityLimited && input.maximumSeats != null) {
      throw new Error('COURSE_ENROLLMENT_CAPACITY_NOT_APPLICABLE');
    }
    if (input.prerequisiteCourseIds?.includes(input.courseId)) {
      throw new Error('COURSE_CANNOT_REQUIRE_ITSELF_AS_PREREQUISITE');
    }
    return this.policyRepository.upsertPolicy({
      ...input,
      prerequisiteCourseIds: [...new Set(input.prerequisiteCourseIds ?? [])],
    });
  }

  private async requireCourse(courseId: string): Promise<void> {
    if (!await this.courseRepository.findById(courseId)) throw new Error('COURSE_NOT_FOUND');
  }
}

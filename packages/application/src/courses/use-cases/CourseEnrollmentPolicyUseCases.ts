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
    const owner = await this.courseRepository.findById(input.courseId);
    if (owner && ['PUBLISHED','ARCHIVED','REJECTED'].includes(owner.status)) throw new Error('COURSE_ENROLLMENT_POLICY_IMMUTABLE');
    for (const id of input.prerequisiteCourseIds ?? []) {
      const course = await this.courseRepository.findById(id);
      if (!course || course.originType === 'EXTERNAL_LINKED_COURSE' || ['ARCHIVED','REJECTED'].includes(course.status)) throw new Error('COURSE_PREREQUISITE_NOT_AVAILABLE');
    }
    if (input.maximumSeats != null && !Number.isSafeInteger(input.maximumSeats)) throw new Error('COURSE_ENROLLMENT_CAPACITY_REQUIRED');
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

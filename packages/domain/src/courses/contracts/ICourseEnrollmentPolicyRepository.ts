import { CourseEnrollmentPolicyDto, UpsertCourseEnrollmentPolicyDto } from '../entities/CourseEnrollmentPolicy';

export interface ICourseEnrollmentPolicyRepository {
  getPolicy(courseId: string): Promise<CourseEnrollmentPolicyDto | null>;
  upsertPolicy(data: UpsertCourseEnrollmentPolicyDto): Promise<CourseEnrollmentPolicyDto>;
}

export interface ICourseFinancialClearanceGateway {
  hasCourseFinancialClearance(courseId: string, studentReferenceId: string): Promise<boolean>;
}

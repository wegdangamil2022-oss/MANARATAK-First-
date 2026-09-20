import {
  ICourseProgressRepository,
  ICourseRepository,
  IStudentCertificateReadGateway,
  IStudentLearningReadGateway,
  StudentCertificateProjectionDto,
  StudentCourseProgressDto,
} from '@manaratak/domain';
import { CertificateReadModelService } from '@manaratak/application';

/** P13-owned learning read adapter for P15. P15 stores no Course truth here. */
export class CourseStudentDashboardReadGateway implements IStudentLearningReadGateway {
  constructor(
    private readonly progress: ICourseProgressRepository,
    private readonly courses: ICourseRepository,
  ) {}

  async listForStudent(studentReferenceId: string): Promise<StudentCourseProgressDto[]> {
    const reference = studentReferenceId.trim();
    if (!reference) throw new Error('STUDENT_LEARNING_REFERENCE_REQUIRED');
    const enrollments = await this.progress.listEnrollmentsByStudent(reference);
    return Promise.all(enrollments.map(async (enrollment) => {
      const course = await this.courses.findById(enrollment.courseId);
      if (!course) throw new Error(`STUDENT_LEARNING_OWNER_NOT_FOUND:${enrollment.courseId}`);
      return {
        enrollmentId: enrollment.id,
        courseId: course.id,
        courseSlug: course.slug,
        courseName: course.displayName,
        status: enrollment.status,
        progressPercentage: enrollment.progressPercentage,
        enrolledAt: enrollment.enrolledAt,
        lastAccessedAt: enrollment.lastAccessedAt,
        completedAt: enrollment.completedAt,
      };
    }));
  }
}

/** P14-owned certificate read adapter for P15. Lifecycle/verification remain in P14. */
export class CertificateStudentDashboardReadGateway implements IStudentCertificateReadGateway {
  constructor(private readonly certificates: CertificateReadModelService) {}

  async listForStudent(studentReferenceId: string): Promise<StudentCertificateProjectionDto[]> {
    const rows = await this.certificates.listForStudent(studentReferenceId);
    return rows.map((row) => ({
      id: row.certificateId,
      publicId: row.publicId,
      serialNumber: row.serialNumber,
      verificationCode: row.verificationCode,
      status: row.status,
      courseDisplayName: row.achievementDisplayName,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      certificatePdfAssetId: row.certificatePdfAssetId,
      previewImageAssetId: row.previewImageAssetId,
    }));
  }
}

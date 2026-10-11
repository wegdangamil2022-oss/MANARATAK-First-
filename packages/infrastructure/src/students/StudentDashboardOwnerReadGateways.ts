import {
  ICourseProgressRepository,
  ICourseRepository,
  IStudentCertificateReadGateway,
  IStudentLearningReadGateway,
  StudentCertificateProjectionDto,
  StudentCourseProgressDto,
  StudentOwnerPage,
} from '@manaratak/domain';
import { CertificateReadModelService } from '@manaratak/application';

/** P13-owned learning read adapter for P15. P15 stores no Course truth here. */
export class CourseStudentDashboardReadGateway implements IStudentLearningReadGateway {
  constructor(
    private readonly progress: ICourseProgressRepository,
    private readonly courses: ICourseRepository,
  ) {}

  async listPageForStudent(studentReferenceId:string,limit:number,cursor?:string):Promise<StudentOwnerPage<StudentCourseProgressDto>>{
    if (!this.progress.listEnrollmentsPageByStudent) throw new Error('STUDENT_LEARNING_OWNER_PAGINATION_NOT_SUPPORTED');
    const page=await this.progress.listEnrollmentsPageByStudent(studentReferenceId,limit,cursor);
    const items=await this.hydrate(page.items);
    return {items,nextCursor:page.nextCursor};
  }

  async listForStudent(studentReferenceId: string, maxRows=50): Promise<StudentCourseProgressDto[]> {
    const reference = studentReferenceId.trim();
    if (!reference) throw new Error('STUDENT_LEARNING_REFERENCE_REQUIRED');
    if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 51) throw new Error('STUDENT_OWNER_READ_LIMIT_INVALID');
    const enrollments = await this.progress.listEnrollmentsByStudent(reference,maxRows);
    return this.hydrate(enrollments);
  }

  private hydrate(enrollments:Awaited<ReturnType<ICourseProgressRepository['listEnrollmentsByStudent']>>):Promise<StudentCourseProgressDto[]>{
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

  async listPageForStudent(studentReferenceId:string,limit:number,cursor?:string):Promise<StudentOwnerPage<StudentCertificateProjectionDto>>{
    if (!Number.isSafeInteger(limit)||limit<1||limit>50)throw new Error('STUDENT_OWNER_READ_PAGE_INVALID');
    const rows=await this.certificates.listForStudent(studentReferenceId,cursor,limit+1);
    const items=rows.slice(0,limit);
    return {items:this.project(items),nextCursor:rows.length>limit?items[items.length-1].certificateId:null};
  }

  async listForStudent(studentReferenceId: string, maxRows=50): Promise<StudentCertificateProjectionDto[]> {
    if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 51) throw new Error('STUDENT_OWNER_READ_LIMIT_INVALID');
    const rows = await this.certificates.listForStudent(studentReferenceId,undefined,maxRows);
    return this.project(rows);
  }

  private project(rows:Awaited<ReturnType<CertificateReadModelService['listForStudent']>>):StudentCertificateProjectionDto[]{
    return rows.map((row) => ({
      id: row.certificateId,
      publicId: row.publicId,
      serialNumber: row.serialNumber,
      verificationCode: row.verificationCode,
      verificationUrl: row.verificationUrl,
      status: row.status,
      courseDisplayName: row.achievementDisplayName,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      certificatePdfAssetId: row.certificatePdfAssetId,
      previewImageAssetId: row.previewImageAssetId,
    }));
  }
}

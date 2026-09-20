import {
  IStudentCertificateReadGateway,
  IStudentLearningReadGateway,
  StudentDashboardSummaryDto,
} from '@manaratak/domain';
import { StudentWorkspaceUseCases } from './StudentWorkspaceUseCases';

/**
 * P15 composition read service. Student Workspace owns personal state only;
 * P13 learning and P14 certificate truth are hydrated through owner read gates.
 */
export class StudentDashboardHydrationService {
  constructor(
    private readonly workspace: StudentWorkspaceUseCases,
    private readonly learning: IStudentLearningReadGateway,
    private readonly certificates: IStudentCertificateReadGateway,
  ) {}

  async getDashboard(studentReferenceId: string): Promise<StudentDashboardSummaryDto> {
    const base = await this.workspace.getDashboard(studentReferenceId);
    const [learning, certificates] = await Promise.allSettled([
      this.learning.listForStudent(studentReferenceId),
      this.certificates.listForStudent(studentReferenceId),
    ]);

    const courseEnrollments = learning.status === 'fulfilled' ? learning.value : [];
    const certificateRows = certificates.status === 'fulfilled' ? certificates.value : [];
    const partialFailures = [...base.partialFailures];
    if (learning.status === 'rejected') partialFailures.push('learning-owner-read');
    if (certificates.status === 'rejected') partialFailures.push('certificate-owner-read');

    const activeCourses = courseEnrollments.filter((item) => item.status !== 'COMPLETED').length;
    const completedCourses = courseEnrollments.filter((item) => item.status === 'COMPLETED').length;
    const averageCourseProgress = courseEnrollments.length
      ? Math.round(courseEnrollments.reduce((sum, item) => sum + item.progressPercentage, 0) / courseEnrollments.length)
      : 0;

    return {
      ...base,
      courseEnrollments,
      certificates: certificateRows,
      certificateCount: certificateRows.length,
      activeCourseEnrollmentCount: activeCourses,
      completedCourseEnrollmentCount: completedCourses,
      statistics: {
        ...base.statistics,
        activeCourses,
        completedCourses,
        averageCourseProgress,
        certificates: certificateRows.length,
      },
      capabilityStatus: {
        ...base.capabilityStatus,
        learning: learning.status === 'fulfilled' ? 'AVAILABLE' : 'DEGRADED',
        certificates: certificates.status === 'fulfilled' ? 'AVAILABLE' : 'DEGRADED',
      },
      partialFailures: [...new Set(partialFailures)],
    };
  }
}

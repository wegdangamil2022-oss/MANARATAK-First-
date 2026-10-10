import {
  IStudentCertificateReadGateway,
  IStudentLearningReadGateway,
  StudentDashboardSummaryDto,
  StudentSupportWorkspaceDetailDto,
} from '@manaratak/domain';
import { StudentServiceRequestUseCases } from '../../services-platform/use-cases/ServiceRequestUseCases';
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
    private readonly serviceRequests?: StudentServiceRequestUseCases,
  ) {}

  async getSupportDetail(
    studentReferenceId: string,
    grants: { learning: boolean; certificates: boolean; services: boolean } = {
      learning: false, certificates: false, services: false,
    },
  ): Promise<StudentSupportWorkspaceDetailDto> {
    const base = await this.workspace.getSupportWorkspaceDetail(studentReferenceId);
    // Each owner is invoked only after its own server-side permission has been granted.
    const [learning, certificates, services] = await Promise.allSettled([
      grants.learning ? this.learning.listForStudent(studentReferenceId) : Promise.resolve(null),
      grants.certificates ? this.certificates.listForStudent(studentReferenceId) : Promise.resolve(null),
      grants.services && this.serviceRequests
        ? this.serviceRequests.listMyRequests(studentReferenceId, { page: 1, pageSize: 12 })
        : Promise.resolve(null),
    ]);
    const learningRows = learning.status === 'fulfilled' ? learning.value : null;
    const certificateRows = certificates.status === 'fulfilled' ? certificates.value : null;
    const serviceRows = services.status === 'fulfilled' ? services.value : null;
    return {
      ...base,
      learning: grants.learning && learningRows ? learningRows : undefined,
      certificates: grants.certificates && certificateRows ? certificateRows.map((row) => ({
        id: row.id, publicId: row.publicId, serialNumber: row.serialNumber,
        verificationCode: row.verificationCode, status: row.status,
        courseDisplayName: row.courseDisplayName, issuedAt: row.issuedAt, expiresAt: row.expiresAt,
      })) : undefined,
      linkedSummaries: {
        ...base.linkedSummaries,
        activeCourseCount: grants.learning && learningRows
          ? learningRows.filter((row) => ['ACTIVE', 'ENROLLED', 'IN_PROGRESS'].includes(row.status)).length
          : null,
        certificateCount: grants.certificates && certificateRows ? certificateRows.length : null,
      },
      serviceRequestCount: grants.services && serviceRows ? serviceRows.total : null,
      recentServiceRequests: grants.services && serviceRows
        ? serviceRows.data.map((row) => ({
            id: row.id, publicId: row.publicId, status: row.status,
            createdAt: row.createdAt, updatedAt: row.updatedAt,
          }))
        : undefined,
      ownerReadStatus: {
        learning: !grants.learning ? 'RESTRICTED' : learningRows ? 'AVAILABLE' : 'DEGRADED',
        certificates: !grants.certificates ? 'RESTRICTED' : certificateRows ? 'AVAILABLE' : 'DEGRADED',
        services: !grants.services ? 'RESTRICTED' : serviceRows ? 'AVAILABLE' : 'DEGRADED',
      },
    };
  }

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

    const activeCourses = courseEnrollments.filter((item) =>
      ['ACTIVE', 'ENROLLED', 'IN_PROGRESS'].includes(item.status),
    ).length;
    const completedCourses = courseEnrollments.filter((item) => item.status === 'COMPLETED').length;
    const progressingCourses = courseEnrollments.filter((item) =>
      ['ACTIVE', 'ENROLLED', 'IN_PROGRESS', 'COMPLETED'].includes(item.status),
    );
    const averageCourseProgress = progressingCourses.length
      ? Math.round(
          progressingCourses.reduce((sum, item) => sum + item.progressPercentage, 0) /
            progressingCourses.length,
        )
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

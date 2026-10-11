import {
  IStudentCertificateReadGateway,
  IStudentLearningReadGateway,
  StudentDashboardSummaryDto,
  StudentOwnerPage,
  StudentCourseProgressDto,
  StudentCertificateProjectionDto,
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
    paging: {cursor?:string;page?:number;limit?:number} = {},
  ): Promise<StudentSupportWorkspaceDetailDto> {
    const base = await this.workspace.getSupportWorkspaceDetail(studentReferenceId);
    const limit=paging.limit ?? 12;
    if (!Number.isSafeInteger(limit) || limit<1 || limit>12) throw new Error('STUDENT_OWNER_READ_PAGE_INVALID');
    const bounded = async <T>(owner:{listPageForStudent?:(id:string,limit:number,cursor?:string)=>Promise<StudentOwnerPage<T>>;listForStudent:(id:string,limit?:number)=>Promise<T[]>}) => {
      if (owner.listPageForStudent) {
        const page=await owner.listPageForStudent(studentReferenceId,limit,paging.cursor);
        if(page.items.length>limit) throw new Error('STUDENT_OWNER_READ_PAGE_INVALID');
        return {...page,complete:!paging.cursor && !page.nextCursor};
      }
      if(paging.cursor) throw new Error('STUDENT_OWNER_PAGINATION_REQUIRED');
      const rows=await owner.listForStudent(studentReferenceId,limit+1);
      return {items:rows.slice(0,limit),nextCursor:null,complete:rows.length<=limit};
    };
    // Each owner is invoked only after its own server-side permission has been granted.
    const [learning, certificates, services] = await Promise.allSettled([
      grants.learning ? bounded<StudentCourseProgressDto>(this.learning) : Promise.resolve(null),
      grants.certificates ? bounded<StudentCertificateProjectionDto>(this.certificates) : Promise.resolve(null),
      grants.services && this.serviceRequests
        ? this.serviceRequests.listMyRequests(studentReferenceId, { page: paging.page ?? 1, pageSize: limit })
        : Promise.resolve(null),
    ]);
    const learningPage = learning.status === 'fulfilled' ? learning.value : null;
    const learningRows=learningPage?.items??null;
    const certificatePage = certificates.status === 'fulfilled' ? certificates.value : null;
    const certificateRows=certificatePage?.items??null;
    const serviceRows = services.status === 'fulfilled' ? services.value : null;
    const learningTruncated = Boolean(learningPage && !learningPage.complete);
    const certificatesTruncated = Boolean(certificatePage && !certificatePage.complete);
    // queriedAt is the owner read time, NOT an unverifiable owner last-sync timestamp.
    const queriedAt = new Date().toISOString();
    return {
      ...base,
      ownerPages:{
        ...(learningPage?{learning:{hasMore:Boolean(learningPage.nextCursor),nextCursor:learningPage.nextCursor}}:{}),
        ...(certificatePage?{certificates:{hasMore:Boolean(certificatePage.nextCursor),nextCursor:certificatePage.nextCursor}}:{}),
        ...(serviceRows?{services:{hasMore:(paging.page??1)*limit<serviceRows.total,nextCursor:null,nextPage:(paging.page??1)*limit<serviceRows.total?(paging.page??1)+1:null}}:{}),
      },
      learning: grants.learning && learningRows ? learningRows.slice(0, limit) : undefined,
      certificates: grants.certificates && certificateRows ? certificateRows.slice(0, limit).map((row) => ({
        id: row.id, publicId: row.publicId, serialNumber: row.serialNumber,
        verificationCode: row.verificationCode, status: row.status,
        courseDisplayName: row.courseDisplayName, issuedAt: row.issuedAt, expiresAt: row.expiresAt,
      })) : undefined,
      linkedSummaries: {
        ...base.linkedSummaries,
        activeCourseCount: grants.learning && learningRows && !learningTruncated
          ? learningRows.filter((row) => ['ACTIVE', 'ENROLLED', 'IN_PROGRESS'].includes(row.status)).length
          : null,
        certificateCount: grants.certificates && certificateRows && !certificatesTruncated ? certificateRows.length : null,
      },
      serviceRequestCount: grants.services && serviceRows ? serviceRows.total : null,
      recentServiceRequests: grants.services && serviceRows
        ? serviceRows.data.map((row) => ({
            id: row.id, publicId: row.publicId, status: row.status,
            createdAt: row.createdAt, updatedAt: row.updatedAt,
          }))
        : undefined,
      ownerReadStatus: {
        learning: !grants.learning ? 'RESTRICTED' : !learningRows ? 'DEGRADED' : learningTruncated ? 'TRUNCATED' : 'AVAILABLE',
        certificates: !grants.certificates ? 'RESTRICTED' : !certificateRows ? 'DEGRADED' : certificatesTruncated ? 'TRUNCATED' : 'AVAILABLE',
        services: !grants.services ? 'RESTRICTED' : serviceRows ? 'AVAILABLE' : 'DEGRADED',
      },
      ownerReadProvenance: {
        learning: grants.learning && learningRows ? {source:'P13',countSource:'LIVE_OWNER',freshness:'OWNER_READ',lastSyncedAt:null,queriedAt,returned:Math.min(learningRows.length,limit),limit,complete:!learningTruncated} : null,
        certificates: grants.certificates && certificateRows ? {source:'P14',countSource:'LIVE_OWNER',freshness:'OWNER_READ',lastSyncedAt:null,queriedAt,returned:Math.min(certificateRows.length,limit),limit,complete:!certificatesTruncated} : null,
        services: grants.services && serviceRows ? {
          source:'P20',countSource:'LIVE_OWNER',freshness:'OWNER_READ',lastSyncedAt:null,queriedAt,returned:serviceRows.data.length,limit,
          complete:(paging.page??1)===1 && serviceRows.total <= serviceRows.data.length,
        } : null,
      },
    };
  }

  async getDashboard(studentReferenceId: string): Promise<StudentDashboardSummaryDto> {
    const base = await this.workspace.getDashboard(studentReferenceId);
    const [learning, certificates] = await Promise.allSettled([
      this.learning.listForStudent(studentReferenceId, 51),
      this.certificates.listForStudent(studentReferenceId, 51),
    ]);

    const learningTruncated = learning.status === 'fulfilled' && learning.value.length > 50;
    const certificatesTruncated = certificates.status === 'fulfilled' && certificates.value.length > 50;
    const courseEnrollments = learning.status === 'fulfilled' ? learning.value.slice(0, 50) : [];
    const certificateRows = certificates.status === 'fulfilled' ? certificates.value.slice(0, 50) : [];
    const partialFailures = [...base.partialFailures];
    if (learning.status === 'rejected') partialFailures.push('learning-owner-read');
    if (certificates.status === 'rejected') partialFailures.push('certificate-owner-read');
    if (learningTruncated) partialFailures.push('learning-owner-truncated');
    if (certificatesTruncated) partialFailures.push('certificate-owner-truncated');

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
        learning: learning.status === 'fulfilled' && !learningTruncated ? 'AVAILABLE' : 'DEGRADED',
        certificates: certificates.status === 'fulfilled' && !certificatesTruncated ? 'AVAILABLE' : 'DEGRADED',
      },
      partialFailures: [...new Set(partialFailures)],
    };
  }
}

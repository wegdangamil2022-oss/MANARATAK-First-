import type { StudentWorkspaceIntegrationEventDto } from './StudentIntegrationEvent';

export const STUDENT_OWNER_EVENT_TYPES: Readonly<Record<string, readonly string[]>> = {
  AUTHORIZATION: ['StudentIdentityCreated'],
  IDENTITY: ['StudentIdentityCreated', 'StudentIdentityActivated', 'StudentIdentitySuspended', 'StudentIdentityArchived'],
  COURSES: ['CourseEnrolled', 'CourseProgressUpdated', 'CourseCompleted'],
  CERTIFICATES: ['CertificateIssued', 'CertificateRevoked', 'CertificateReissued', 'CertificateRenewed', 'CertificateExpired', 'CertificateArtifactsRendered', 'CertificateArchived'],
};

/** Internal persisted-owner contract; never exposed as an HTTP ingest endpoint. */
export function assertStudentIntegrationEvent(event: StudentWorkspaceIntegrationEventDto): void {
  if (!Object.hasOwn(STUDENT_OWNER_EVENT_TYPES,event.sourceDomain) || !STUDENT_OWNER_EVENT_TYPES[event.sourceDomain]?.includes(event.eventType))
    throw new Error('STUDENT_EVENT_TYPE_NOT_ALLOWED');
  const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  const invalid = () => { throw new Error('STUDENT_EVENT_PAYLOAD_INVALID'); };
  if (!text(event.eventId, 512) || !text(event.studentReferenceId, 160) || !text(event.title, 240) ||
      (event.description != null && !text(event.description, 2000)) ||
      !(event.occurredAt instanceof Date) || !Number.isFinite(event.occurredAt.getTime()) ||
      (event.eventVersion !== undefined && event.eventVersion !== '1.0') ||
      (event.sourceReferenceId != null && !text(event.sourceReferenceId, 160))) invalid();
  const metadata = event.metadata ?? {};
  if (typeof metadata !== 'object' || Array.isArray(metadata)) invalid();
  let size: number;
  try { size = JSON.stringify({metadata, notification:event.notification}).length; }
  catch { return invalid(); }
  if (size > 5300 || JSON.stringify(metadata).length > 4096) invalid();
  const fields=event.sourceDomain==='COURSES'
    ? ['courseId','enrollmentId','courseSlug','courseName','progressPercentage','status','enrolledAt','lastAccessedAt','completedAt','courseVersion','eventVersion']
    : event.sourceDomain==='CERTIFICATES'
      ? ['certificateId','publicId','serialNumber','verificationCode','status','courseDisplayName','issuedAt','expiresAt','replacesCertificateId','certificatePdfAssetId','previewImageAssetId']
      : ['roleId','oldStatus','newStatus'];
  const allowed=new Set([...fields,'studentReferenceId','identityId','correlationId','causationId']);
  if(Object.keys(metadata).some(field=>!allowed.has(field))) invalid();
  for (const field of ['studentReferenceId', 'identityId']) {
    if (metadata[field] !== undefined && metadata[field] !== event.studentReferenceId) invalid();
  }
  for (const field of ['enrolledAt', 'completedAt', 'lastAccessedAt', 'issuedAt', 'expiresAt']) {
    const value=metadata[field];
    if (value != null && (!(typeof value==='string' || value instanceof Date) || !Number.isFinite(new Date(value).getTime()))) invalid();
  }
  if (event.sourceDomain === 'COURSES') {
    if (!text(metadata.courseId,160) || !text(metadata.enrollmentId,160) ||
        event.sourceReferenceId !== metadata.enrollmentId ||
        (metadata.progressPercentage !== undefined &&
          (typeof metadata.progressPercentage !== 'number' || !Number.isFinite(metadata.progressPercentage) || metadata.progressPercentage<0 || metadata.progressPercentage>100)) ||
        (metadata.status !== undefined && !['ACTIVE','PENDING','WAITLISTED','COMPLETED','CANCELLED','IN_PROGRESS','ENROLLED'].includes(String(metadata.status)))) invalid();
  }
  if (event.sourceDomain === 'CERTIFICATES' &&
      (!text(metadata.certificateId,160) || event.sourceReferenceId !== metadata.certificateId ||
       (metadata.status !== undefined && !['ACTIVE','ISSUED','REVOKED','EXPIRED','REISSUED','PENDING','SUSPENDED','ARCHIVED'].includes(String(metadata.status))))) invalid();
  if (event.notification) {
    const n=event.notification;
    if (!text(n.category,80) || !text(n.title,240) || !text(n.message,800) || JSON.stringify(n).length>1200 ||
        (n.actionUrl != null && (!n.actionUrl.startsWith('/') || n.actionUrl.startsWith('//') || /[\\\u0000-\u001f]/.test(n.actionUrl)))) invalid();
  }
}

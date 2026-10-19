import {
  StudentSavedItemType,
  type IStudentSavedItemHydrationGateway,
  type StudentSavedItemDto,
  type ICertificateRepository,
  type IStudentWorkspaceRepository,
} from '@absheer/domain';
export class CertificateStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly certificates: ICertificateRepository) {}
  supports(type: StudentSavedItemType) {
    return type === StudentSavedItemType.CERTIFICATE;
  }
  async hydrate(item: StudentSavedItemDto) {
    const certificate = await this.certificates.findForStudent(
      item.entityId,
      item.studentReferenceId,
    );
    if (!certificate || certificate.studentReferenceId !== item.studentReferenceId)
      return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    return {
      ownerType: item.entityType,
      ownerId: certificate.id,
      publicId: certificate.publicId,
      displayName: certificate.achievementDisplayName,
      lifecycleStatus: certificate.status,
      available: true,
      visibility: 'STUDENT_PRIVATE' as const,
      privateReference: certificate.id,
    };
  }
}
/** Retained P15 copy proves private ownership, including an explicitly adopted anonymous result. */
export class StudentToolPrivateSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly workspace: IStudentWorkspaceRepository) {}
  supports(type: StudentSavedItemType) {
    return type === StudentSavedItemType.STUDENT_TOOL;
  }
  async hydrate(item: StudentSavedItemDto) {
    const artifact = await this.workspace.inspectPrivateToolResult?.(
      item.studentReferenceId,
      item.entityId,
    );
    if (!artifact) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    return {
      ownerType: item.entityType,
      ownerId: item.entityId,
      displayName: 'نتيجة أداة محفوظة خاصة',
      lifecycleStatus: 'RETAINED_PRIVATE_RESULT',
      available: true,
      visibility: 'STUDENT_PRIVATE' as const,
      privateReference: artifact.savedReference,
    };
  }
}

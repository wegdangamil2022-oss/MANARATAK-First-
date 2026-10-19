import type {
  IIdentityRepository,
  IRoleAssignmentRepository,
  INotificationRecipientGateway,
  IStudentWorkspaceRepository,
} from '@absheer/domain';
/** P15 is the owner of student eligibility; P05 never infers recipients from contact strings. */
export class StudentNotificationRecipientGateway implements INotificationRecipientGateway {
  constructor(
    private readonly identities: IIdentityRepository,
    private readonly roles: IRoleAssignmentRepository,
    private readonly students: IStudentWorkspaceRepository,
  ) {}
  async assertEligible(id: string): Promise<{ locale: string }> {
    const identity = await this.identities.findById(id);
    const assignments = await this.roles.findByIdentityId(id);
    const workspace = await this.students.findWorkspace(id);
    if (
      identity?.type !== 'Human' ||
      identity.status !== 'ACTIVE' ||
      !assignments.some((role) => role.roleId === 'student') ||
      workspace?.status !== 'ACTIVE'
    )
      throw new Error('NOTIFICATION_RECIPIENT_NOT_ELIGIBLE');
    return { locale: workspace.preferredLanguage === 'en' ? 'en' : 'ar' };
  }
}

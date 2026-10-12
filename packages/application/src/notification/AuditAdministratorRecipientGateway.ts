import type {
  INotificationRecipientGateway,
  IIdentityRepository,
  AuthorizationEvaluatorService,
} from '@manaratak/domain';
import type { IPrincipalAccessValidator } from '@manaratak/core';
/** Notification owner eligibility for explicit audit administrators; no contact-string inference. */
export class AuditAdministratorRecipientGateway implements INotificationRecipientGateway {
  constructor(
    private readonly students: INotificationRecipientGateway,
    private readonly identities: IIdentityRepository,
    private readonly authorization: AuthorizationEvaluatorService,
    private readonly lifecycle: IPrincipalAccessValidator,
  ) {}
  async assertEligible(id: string) {
    try {
      return await this.students.assertEligible(id);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'NOTIFICATION_RECIPIENT_NOT_ELIGIBLE')
        throw error;
    }
    const identity = await this.identities.findById(id);
    if (!identity || identity.type !== 'Human' || identity.status !== 'ACTIVE')
      throw new Error('NOTIFICATION_RECIPIENT_NOT_ELIGIBLE');
    if (!(await this.lifecycle.isAuthenticationAllowed(id)))
      throw new Error('NOTIFICATION_RECIPIENT_NOT_ELIGIBLE');
    const permission = await this.authorization.evaluatePermission(id, 'admin:audit:manage', {
      requestTime: new Date(),
    });
    if (!permission.isGranted) throw new Error('NOTIFICATION_RECIPIENT_NOT_ELIGIBLE');
    return { locale: 'ar' };
  }
}

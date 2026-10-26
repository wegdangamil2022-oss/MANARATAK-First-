import type {
  INotificationRecipientGateway,
  IIdentityRepository,
  AuthorizationEvaluatorService,
} from '@manaratak/domain';
import type { IPrincipalAccessValidator } from '@manaratak/core';
/** Reuse notification ownership, retention and encryption. This adds only
 * eligible administrative workbench recipients; it never infers contact data. */
export class ReviewNotificationRecipientGateway implements INotificationRecipientGateway {
  constructor(
    private readonly previous: INotificationRecipientGateway,
    private readonly identities: IIdentityRepository,
    private readonly authorization: AuthorizationEvaluatorService,
    private readonly lifecycle: IPrincipalAccessValidator,
  ) {}
  async assertEligible(id: string) {
    try {
      return await this.previous.assertEligible(id);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'NOTIFICATION_RECIPIENT_NOT_ELIGIBLE')
        throw error;
    }
    const identity = await this.identities.findById(id);
    if (
      !identity ||
      identity.type !== 'Human' ||
      identity.status !== 'ACTIVE' ||
      !(await this.lifecycle.isAuthenticationAllowed(id)) ||
      !(
        await this.authorization.evaluatePermission(id, 'admin:platform:manage', {
          requestTime: new Date(),
        })
      ).isGranted
    )
      throw new Error('NOTIFICATION_RECIPIENT_NOT_ELIGIBLE');
    return { locale: 'ar' };
  }
}

import { IPrincipalAccessValidator } from '@manaratak/core';
import { AccountAccessState, IIdentityRepository, LifeStatus } from '@manaratak/domain';

/**
 * Canonical authentication eligibility policy for human/service identities.
 * Route guards and refresh-token rotation share this policy so lifecycle
 * denial cannot diverge between Admin and learner/control-plane boundaries.
 */
export class IdentityPrincipalAccessValidator implements IPrincipalAccessValidator {
  constructor(private readonly identityRepository: IIdentityRepository) {}

  public async isAuthenticationAllowed(principalId: string): Promise<boolean> {
    try {
      const identity = await this.identityRepository.findById(principalId);
      if (!identity) return false;

      const lifecycleAllowsAuthentication = [LifeStatus.PROVISIONED, LifeStatus.ACTIVE].includes(identity.status);
      return lifecycleAllowsAuthentication && identity.account.accessState === AccountAccessState.ACTIVE;
    } catch {
      return false;
    }
  }
}

import { IPrincipalAccessValidator } from '@manaratak/core';
import { AccountAccessState, IIdentityRepository, IPasswordCredentialRepository, LifeStatus } from '@manaratak/domain';

/**
 * Canonical authentication eligibility policy for human/service identities.
 * Route guards and refresh-token rotation share this policy so lifecycle
 * denial cannot diverge between Admin and learner/control-plane boundaries.
 */
export class IdentityPrincipalAccessValidator implements IPrincipalAccessValidator {
  constructor(private readonly identityRepository: IIdentityRepository, private readonly credentials?: IPasswordCredentialRepository) {}

  public async isAuthenticationAllowed(principalId: string): Promise<boolean> {
    try {
      const identity = await this.identityRepository.findById(principalId);
      if (!identity) return false;

      // Only ACTIVE identity with Active account and verified primary email is eligible
      if (identity.status !== LifeStatus.ACTIVE) return false;
      if (identity.account.accessState !== AccountAccessState.ACTIVE) return false;
      if (identity.user && !identity.user.contactRegistry.isEmailVerified) return false;
      if (identity.user && this.credentials) {
        const credential = await this.credentials.find(principalId);
        if (!credential || credential.disabled) return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}

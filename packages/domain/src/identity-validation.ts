import type { IIdentityRepository } from './identity/repositories/IIdentityRepository';
import type { IdentityType } from './enums/IdentityType';

export class IdentityValidationService {
  constructor(private repo: Pick<IIdentityRepository, 'isEmailUnique' | 'isPhoneUnique'>) {}
  async validateNewIdentity(_type: IdentityType, primaryEmail?: string, primaryPhone?: string): Promise<void> {
    if (primaryEmail && !(await this.repo.isEmailUnique(primaryEmail))) {
      throw new Error('Email must be unique');
    }
    if (primaryPhone && !(await this.repo.isPhoneUnique(primaryPhone))) {
      throw new Error('Phone must be unique');
    }
  }
}

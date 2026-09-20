export class IdentityValidationService {
  constructor(private repo: any) {}
  async validateNewIdentity(_type: any, primaryEmail?: string, primaryPhone?: string): Promise<void> {
    if (primaryEmail && !(await this.repo.isEmailUnique(primaryEmail))) {
      throw new Error('Email must be unique');
    }
    if (primaryPhone && !(await this.repo.isPhoneUnique(primaryPhone))) {
      throw new Error('Phone must be unique');
    }
  }
}

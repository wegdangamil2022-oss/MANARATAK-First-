import type { IPrincipalAccessValidator } from '@manaratak/core';
import type { IPasswordCredentialRepository } from '@manaratak/domain';
import { assertPasswordPolicy } from './PasswordPolicy';

export class ChangePasswordUseCase {
  constructor(
    private readonly credentials: IPasswordCredentialRepository,
    private readonly access: IPrincipalAccessValidator,
    private readonly hasher: { hash(value: string): Promise<string>; verify(value: string, hash: string): Promise<boolean> },
  ) {}

  async execute(identityId: string, input: { currentPassword: string; newPassword: string }): Promise<void> {
    if (!identityId || !await this.access.isAuthenticationAllowed(identityId)) throw new Error('AUTHENTICATION_REQUIRED');
    assertPasswordPolicy(input.newPassword);
    const credential = await this.credentials.find(identityId);
    if (!credential || credential.disabled || !await this.hasher.verify(input.currentPassword, credential.passwordHash)) {
      throw new Error('CURRENT_PASSWORD_INVALID');
    }
    await this.credentials.change(identityId, credential.passwordHash, await this.hasher.hash(input.newPassword));
  }
}

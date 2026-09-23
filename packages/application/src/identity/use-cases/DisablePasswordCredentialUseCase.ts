import type { IPrincipalAccessValidator } from '@manaratak/core';
import type { IPasswordCredentialRepository } from '@manaratak/domain';

export class DisablePasswordCredentialUseCase {
  constructor(
    private readonly credentials: IPasswordCredentialRepository,
    private readonly access: IPrincipalAccessValidator,
    private readonly authorization: { evaluatePermission(actorId: string, permission: string): Promise<{ isGranted: boolean }> },
  ) {}

  async execute(actorId: string, identityId: string, changeId: string): Promise<void> {
    if (!actorId || !await this.access.isAuthenticationAllowed(actorId)
      || !(await this.authorization.evaluatePermission(actorId, 'admin:credentials:manage')).isGranted) {
      throw new Error('CREDENTIAL_PERMISSION_DENIED');
    }
    if (!identityId.trim() || changeId.trim().length < 6) throw new Error('CREDENTIAL_CHANGE_REFERENCE_REQUIRED');
    await this.credentials.disable(identityId, actorId, changeId);
  }
}

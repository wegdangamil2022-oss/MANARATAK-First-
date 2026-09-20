import { ISessionManager, UseCase, Result, ResultFactory } from '@manaratak/core';
import { IIdentityRepository } from '@manaratak/domain';
import { IdentityDto } from './dtos';
import { IdentityDtoMapper } from './mapper';

export class PurgeIdentityUseCase implements UseCase<{ identityId: string; reason?: string }, Result<IdentityDto>> {
  constructor(
    private readonly identityRepository: IIdentityRepository,
    private readonly sessionManager: ISessionManager,
  ) {}

  public async execute(input: { identityId: string; reason?: string }): Promise<Result<IdentityDto>> {
    try {
      const identity = await this.identityRepository.findById(input.identityId);
      if (!identity) {
        return ResultFactory.failure(`Identity with ID ${input.identityId} not found.`);
      }

      identity.purge(input.reason);
      await this.identityRepository.save(identity);
      // Lifecycle denial is enforced at every authentication boundary; revoke
      // persisted sessions as an idempotent server-side cut-off as well.
      await this.sessionManager.revokeAllSessions(input.identityId);

      return ResultFactory.success(IdentityDtoMapper.toDto(identity));
    } catch (error: any) {
      return ResultFactory.failure(error.message);
    }
  }
}

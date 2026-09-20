import { UseCase, Result, ResultFactory } from '@manaratak/core';
import { IIdentityRepository } from '@manaratak/domain';
import { IdentityDto } from './dtos';
import { IdentityDtoMapper } from './mapper';

export class ActivateIdentityUseCase implements UseCase<string, Result<IdentityDto>> {
  constructor(private readonly identityRepository: IIdentityRepository) {}

  public async execute(identityId: string): Promise<Result<IdentityDto>> {
    try {
      const identity = await this.identityRepository.findById(identityId);
      if (!identity) {
        return ResultFactory.failure(`Identity with ID ${identityId} not found.`);
      }

      if (identity.user && !identity.user.contactRegistry.isEmailVerified) {
        identity.user.contactRegistry.verifyEmail();
      }

      identity.activate();
      await this.identityRepository.save(identity);

      return ResultFactory.success(IdentityDtoMapper.toDto(identity));
    } catch (error: any) {
      return ResultFactory.failure(error.message);
    }
  }
}

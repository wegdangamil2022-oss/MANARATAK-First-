import { UseCase, Result, ResultFactory } from '@manaratak/core';
import { IIdentityRepository } from '@manaratak/domain';
import { IdentityDto } from './dtos';
import { IdentityDtoMapper } from './mapper';

export class GetIdentityUseCase implements UseCase<string, Result<IdentityDto>> {
  constructor(private readonly identityRepository: IIdentityRepository) {}

  public async execute(identityId: string): Promise<Result<IdentityDto>> {
    try {
      const identity = await this.identityRepository.findById(identityId);
      if (!identity) {
        return ResultFactory.failure(`Identity with ID ${identityId} not found.`);
      }

      return ResultFactory.success(IdentityDtoMapper.toDto(identity));
    } catch (error: any) {
      return ResultFactory.failure(error.message);
    }
  }
}

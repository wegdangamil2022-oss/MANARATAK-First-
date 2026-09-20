import { UseCase, Result, ResultFactory } from '@manaratak/core';
import { IIdentityRepository, Profile } from '@manaratak/domain';
import { UpdateProfileInput, IdentityDto } from './dtos';
import { IdentityDtoMapper } from './mapper';

export class UpdateProfileUseCase implements UseCase<UpdateProfileInput, Result<IdentityDto>> {
  constructor(private readonly identityRepository: IIdentityRepository) {}

  public async execute(input: UpdateProfileInput): Promise<Result<IdentityDto>> {
    try {
      const identity = await this.identityRepository.findById(input.identityId);
      if (!identity) {
        return ResultFactory.failure(`Identity with ID ${input.identityId} not found.`);
      }

      const newProfile = new Profile({
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        preferredLanguage: input.preferredLanguage,
        timeZone: input.timeZone
      });

      identity.updateProfile(newProfile);
      await this.identityRepository.save(identity);

      return ResultFactory.success(IdentityDtoMapper.toDto(identity));
    } catch (error: any) {
      return ResultFactory.failure(error.message);
    }
  }
}

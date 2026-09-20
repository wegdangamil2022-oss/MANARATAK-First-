import { UseCase, Result, ResultFactory } from '@manaratak/core';
import { IIdentityRepository } from '@manaratak/domain';
import { UpdateContactInput, IdentityDto } from './dtos';
import { IdentityDtoMapper } from './mapper';

export class UpdateContactUseCase implements UseCase<UpdateContactInput, Result<IdentityDto>> {
  constructor(private readonly identityRepository: IIdentityRepository) {}

  public async execute(input: UpdateContactInput): Promise<Result<IdentityDto>> {
    try {
      const identity = await this.identityRepository.findById(input.identityId);
      if (!identity) {
        return ResultFactory.failure(`Identity with ID ${input.identityId} not found.`);
      }

      if (input.email) {
        const isUnique = await this.identityRepository.isEmailUnique(input.email);
        const currentEmail = identity.user?.contactRegistry.primaryEmail;
        if (!isUnique && currentEmail !== input.email) {
          return ResultFactory.failure(`Email ${input.email} is already in use.`);
        }
        identity.updateEmail(input.email);
      }

      if (input.phone !== undefined) {
        if (input.phone) {
          const isUnique = await this.identityRepository.isPhoneUnique(input.phone);
          const currentPhone = identity.user?.contactRegistry.primaryPhone;
          if (!isUnique && currentPhone !== input.phone) {
            return ResultFactory.failure(`Phone number ${input.phone} is already in use.`);
          }
        }
        identity.updatePhone(input.phone);
      }

      if (input.verifyEmail && identity.user) {
        identity.user.contactRegistry.verifyEmail();
      }

      if (input.verifyPhone && identity.user) {
        identity.user.contactRegistry.verifyPhone();
      }

      await this.identityRepository.save(identity);

      return ResultFactory.success(IdentityDtoMapper.toDto(identity));
    } catch (error: any) {
      return ResultFactory.failure(error.message);
    }
  }
}

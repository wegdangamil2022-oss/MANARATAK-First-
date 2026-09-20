import { UseCase, Result, ResultFactory } from '@manaratak/core';
import {
  ContactRegistry,
  Identity,
  IdentityType,
  IdentityValidationService,
  IIdentityRepository,
  Profile,
  TechnicalMetadata,
  User,
} from '@manaratak/domain';
import { ProvisionIdentityInput, IdentityDto } from './dtos';
import { IdentityDtoMapper } from './mapper';

export class ProvisionIdentityUseCase implements UseCase<ProvisionIdentityInput, Result<IdentityDto>> {
  private readonly validationService: IdentityValidationService;

  constructor(private readonly identityRepository: IIdentityRepository) {
    this.validationService = new IdentityValidationService(identityRepository);
  }

  public async execute(input: ProvisionIdentityInput): Promise<Result<IdentityDto>> {
    try {
      await this.validationService.validateNewIdentity(
        input.type,
        input.primaryEmail,
        input.primaryPhone,
      );

      let user: User | null = null;
      if (input.type === IdentityType.Human) {
        if (!input.primaryEmail) {
          return ResultFactory.failure('Primary email is required for a human identity');
        }

        const profile = new Profile({
          displayName: input.displayName ?? 'Unnamed User',
          avatarUrl: input.avatarUrl ?? '',
          preferredLanguage: input.preferredLanguage ?? 'en',
          timeZone: input.timeZone ?? 'UTC',
        });

        const contactRegistry = new ContactRegistry({
          primaryEmail: input.primaryEmail,
          isEmailVerified: false,
          primaryPhone: input.primaryPhone,
          isPhoneVerified: false,
        });

        user = new User({ profile, contactRegistry });
      }

      const technicalMetadata = TechnicalMetadata.create(input.createdBy);
      const identity = Identity.create(
        input.type,
        user,
        {
          storageQuotaBytes: 10 * 1024 * 1024 * 1024,
          rateLimitMax: 100,
          rateLimitWindowMs: 60_000,
        },
        technicalMetadata,
      );

      await this.identityRepository.save(identity);
      return ResultFactory.success(IdentityDtoMapper.toDto(identity));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Identity provisioning failed';
      return ResultFactory.failure(message);
    }
  }
}

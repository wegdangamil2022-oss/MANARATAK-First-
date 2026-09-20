import { Identity, IdentityType, TechnicalMetadataProps } from '@manaratak/domain';
import { IdentityDto } from './dtos';

function mapTechnicalMetadata(metadata: TechnicalMetadataProps): IdentityDto['technicalMetadata'] {
  const mapped: IdentityDto['technicalMetadata'] = {
    createdBy: metadata.createdBy,
    createdAt: metadata.createdAt.toISOString(),
    version: metadata.version,
  };
  if (metadata.updatedBy) mapped.updatedBy = metadata.updatedBy;
  if (metadata.updatedAt) mapped.updatedAt = metadata.updatedAt.toISOString();
  if (metadata.deletedBy) mapped.deletedBy = metadata.deletedBy;
  if (metadata.deletedAt) mapped.deletedAt = metadata.deletedAt.toISOString();
  return mapped;
}

export class IdentityDtoMapper {
  public static toDto(identity: Identity): IdentityDto {
    const dto: IdentityDto = {
      id: identity.id.toString(),
      type: identity.type,
      status: identity.status,
      account: {
        accessState: String(identity.account.accessState),
        storageQuotaBytes: identity.account.storageQuotaBytes,
        rateLimitMax: identity.account.rateLimitMax,
        rateLimitWindowMs: identity.account.rateLimitWindowMs,
        configurationFlags: identity.account.configurationFlags,
      },
      technicalMetadata: mapTechnicalMetadata(identity.technicalMetadata.props),
    };

    if (identity.type === IdentityType.Human && identity.user) {
      dto.user = {
        profile: {
          displayName: identity.user.profile.props.displayName,
          avatarUrl: identity.user.profile.props.avatarUrl ?? '',
          preferredLanguage: identity.user.profile.props.preferredLanguage ?? 'en',
          timeZone: identity.user.profile.props.timeZone ?? 'UTC',
        },
        contactRegistry: {
          primaryEmail: identity.user.contactRegistry.primaryEmail,
          isEmailVerified: identity.user.contactRegistry.isEmailVerified,
          primaryPhone: identity.user.contactRegistry.primaryPhone,
          isPhoneVerified: identity.user.contactRegistry.isPhoneVerified,
          alternativeContacts: identity.user.contactRegistry.alternativeContacts,
        },
      };
    }

    return dto;
  }
}

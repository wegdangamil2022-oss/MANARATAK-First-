import { Identity, IdentityType, LifeStatus, User, Profile, ContactRegistry, Account, TechnicalMetadata } from '@manaratak/domain';
import { Identifier } from '@manaratak/core';

export class IdentityMapper {
  public static toDomain(record: any): Identity {
    const technicalMetadata = new TechnicalMetadata({
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedBy: record.updatedBy || undefined,
      updatedAt: record.updatedAt || undefined,
      deletedBy: record.deletedBy || undefined,
      deletedAt: record.deletedAt || undefined,
      version: record.version,
    });

    let user: User | null = null;
    if (record.user) {
      const profile = new Profile({
        displayName: record.user.displayName,
        avatarUrl: record.user.avatarUrl || undefined,
        preferredLanguage: record.user.preferredLanguage || undefined,
        timeZone: record.user.timeZone || undefined,
      });

      let altContacts = undefined;
      if (record.user.alternativeContacts) {
        altContacts = typeof record.user.alternativeContacts === 'string' 
          ? JSON.parse(record.user.alternativeContacts)
          : record.user.alternativeContacts;
      }

      const contactRegistry = new ContactRegistry({
        primaryEmail: record.user.primaryEmail,
        isEmailVerified: record.user.isEmailVerified,
        primaryPhone: record.user.primaryPhone || undefined,
        isPhoneVerified: record.user.isPhoneVerified,
        alternativeContacts: altContacts
      });

      user = new User({ profile, contactRegistry });
    }

    let account: Account;
    if (record.account) {
      account = new Account({
        identityId: record.account.identityId,
        accessState: record.account.accessState,
        storageQuotaBytes: Number(record.account.storageQuotaBytes),
        rateLimitMax: record.account.rateLimitMax,
        rateLimitWindowMs: record.account.rateLimitWindowMs,
        configurationFlags: typeof record.account.configurationFlags === 'string'
          ? JSON.parse(record.account.configurationFlags)
          : (record.account.configurationFlags || undefined)
      });
    } else {
      throw new Error("Identity record is missing an account");
    }

    const identity = new Identity({
      type: record.type as IdentityType,
      status: record.status as LifeStatus,
      user,
      account,
      technicalMetadata
    }, new Identifier<string>(record.id));

    // Clear domain events that might have been triggered during reconstitution
    identity.clearEvents();
    
    return identity;
  }

  public static toPersistence(identity: Identity): any {
    return {
      id: identity.id.toString(),
      type: identity.type,
      status: identity.status,
      createdBy: identity.technicalMetadata.props.createdBy,
      createdAt: identity.technicalMetadata.props.createdAt,
      updatedBy: identity.technicalMetadata.props.updatedBy || null,
      updatedAt: identity.technicalMetadata.props.updatedAt || new Date(),
      deletedBy: identity.technicalMetadata.props.deletedBy || null,
      deletedAt: identity.technicalMetadata.props.deletedAt || null,
      version: identity.technicalMetadata.props.version,
      user: identity.user ? {
        create: {
          displayName: identity.user.profile.props.displayName,
          avatarUrl: identity.user.profile.props.avatarUrl || null,
          preferredLanguage: identity.user.profile.props.preferredLanguage || null,
          timeZone: identity.user.profile.props.timeZone || null,
          primaryEmail: identity.user.contactRegistry.primaryEmail,
          isEmailVerified: identity.user.contactRegistry.isEmailVerified,
          primaryPhone: identity.user.contactRegistry.primaryPhone || null,
          isPhoneVerified: identity.user.contactRegistry.isPhoneVerified,
          alternativeContacts: identity.user.contactRegistry.alternativeContacts.length > 0 
            ? identity.user.contactRegistry.alternativeContacts 
            : null
        },
        update: {
          displayName: identity.user.profile.props.displayName,
          avatarUrl: identity.user.profile.props.avatarUrl || null,
          preferredLanguage: identity.user.profile.props.preferredLanguage || null,
          timeZone: identity.user.profile.props.timeZone || null,
          primaryEmail: identity.user.contactRegistry.primaryEmail,
          isEmailVerified: identity.user.contactRegistry.isEmailVerified,
          primaryPhone: identity.user.contactRegistry.primaryPhone || null,
          isPhoneVerified: identity.user.contactRegistry.isPhoneVerified,
          alternativeContacts: identity.user.contactRegistry.alternativeContacts.length > 0 
            ? identity.user.contactRegistry.alternativeContacts 
            : null
        }
      } : undefined,
      account: {
        create: {
          accessState: identity.account.accessState,
          storageQuotaBytes: identity.account.storageQuotaBytes,
          rateLimitMax: identity.account.rateLimitMax,
          rateLimitWindowMs: identity.account.rateLimitWindowMs,
          configurationFlags: Object.keys(identity.account.configurationFlags).length > 0
            ? identity.account.configurationFlags
            : null
        },
        update: {
          accessState: identity.account.accessState,
          storageQuotaBytes: identity.account.storageQuotaBytes,
          rateLimitMax: identity.account.rateLimitMax,
          rateLimitWindowMs: identity.account.rateLimitWindowMs,
          configurationFlags: Object.keys(identity.account.configurationFlags).length > 0
            ? identity.account.configurationFlags
            : null
        }
      }
    };
  }
}

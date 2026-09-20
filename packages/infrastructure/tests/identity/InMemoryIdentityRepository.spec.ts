import { describe, it, expect, beforeEach } from 'vitest';
import { Identity, IdentityType, User, Profile, ContactRegistry, TechnicalMetadata, Account } from '@manaratak/domain';
import { InMemoryIdentityRepository } from '../../src/identity/InMemoryIdentityRepository';

describe('InMemoryIdentityRepository', () => {
  let repository: InMemoryIdentityRepository;

  beforeEach(() => {
    repository = new InMemoryIdentityRepository();
  });

  it('should save and find an identity by id', async () => {
    const technicalMetadata = TechnicalMetadata.create('sysadmin');
    const user = new User({
      profile: new Profile({ displayName: 'Test User' }),
      contactRegistry: new ContactRegistry({
        primaryEmail: 'test@manaratak.local',
        isEmailVerified: false,
        isPhoneVerified: false
      })
    });
    
    const identity = Identity.create(
      IdentityType.Human,
      user,
      { storageQuotaBytes: 1000, rateLimitMax: 100, rateLimitWindowMs: 60000 },
      technicalMetadata
    );

    await repository.save(identity);

    const retrieved = await repository.findById(identity.id.toString());
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id.toString()).toBe(identity.id.toString());
    expect(retrieved?.type).toBe(IdentityType.Human);
    expect(retrieved?.user?.contactRegistry.primaryEmail).toBe('test@manaratak.local');
  });

  it('should check email uniqueness', async () => {
    const user = new User({
      profile: new Profile({ displayName: 'Test User' }),
      contactRegistry: new ContactRegistry({
        primaryEmail: 'unique@manaratak.local',
        isEmailVerified: false,
        isPhoneVerified: false
      })
    });
    
    const identity = Identity.create(
      IdentityType.Human,
      user,
      { storageQuotaBytes: 1000, rateLimitMax: 100, rateLimitWindowMs: 60000 },
      TechnicalMetadata.create('sys')
    );

    await repository.save(identity);

    expect(await repository.isEmailUnique('unique@manaratak.local')).toBe(false);
    expect(await repository.isEmailUnique('new@manaratak.local')).toBe(true);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Identity, IdentityType, User, Profile, ContactRegistry, TechnicalMetadata, Account } from '@manaratak/domain';
import { PrismaIdentityRepository } from '../../src/identity/PrismaIdentityRepository';

describe('PrismaIdentityRepository', () => {
  let repository: PrismaIdentityRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      identityRecord: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn()
      },
      transactionalOutboxRecord: { upsert: vi.fn() },
    };
    mockPrisma.$transaction = vi.fn(async (mutation: (tx: any) => Promise<unknown>) => mutation(mockPrisma));
    repository = new PrismaIdentityRepository(mockPrisma);
  });

  it('should save and find an identity by id', async () => {
    const technicalMetadata = TechnicalMetadata.create('sysadmin');
    const user = new User({
      profile: new Profile({ displayName: 'Test Prisma User' }),
      contactRegistry: new ContactRegistry({
        primaryEmail: 'testprisma@manaratak.local',
        isEmailVerified: true,
        isPhoneVerified: false
      })
    });
    
    const identity = Identity.create(
      IdentityType.Human,
      user,
      { storageQuotaBytes: 2000, rateLimitMax: 200, rateLimitWindowMs: 60000 },
      technicalMetadata
    );

    // Mock findUnique to return null for first check (create)
    mockPrisma.identityRecord.findUnique.mockResolvedValueOnce(null);
    mockPrisma.identityRecord.create.mockResolvedValueOnce({});

    await repository.save(identity);
    expect(mockPrisma.identityRecord.create).toHaveBeenCalled();
    expect(mockPrisma.transactionalOutboxRecord.upsert).toHaveBeenCalled();

    // Mock for findById
    mockPrisma.identityRecord.findUnique.mockResolvedValueOnce({
      id: identity.id.toString(),
      type: 'Human',
      status: 'PROVISIONED',
      createdBy: 'sysadmin',
      createdAt: new Date(),
      version: 1,
      user: {
        identityId: identity.id.toString(),
        displayName: 'Test Prisma User',
        primaryEmail: 'testprisma@manaratak.local',
        isEmailVerified: true,
        isPhoneVerified: false,
        alternativeContacts: null
      },
      account: {
        identityId: identity.id.toString(),
        accessState: 'Active',
        storageQuotaBytes: 2000n, // testing that it can parse bigint if returned by prisma
        rateLimitMax: 200,
        rateLimitWindowMs: 60000,
        configurationFlags: null
      }
    });

    const retrieved = await repository.findById(identity.id.toString());
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id.toString()).toBe(identity.id.toString());
    expect(retrieved?.type).toBe(IdentityType.Human);
    expect(retrieved?.user?.contactRegistry.primaryEmail).toBe('testprisma@manaratak.local');
    expect(retrieved?.account.storageQuotaBytes).toBe(2000);
  });
});

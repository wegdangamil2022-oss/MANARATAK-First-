import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaCredentialVerifier } from '../../src/auth/PrismaCredentialVerifier';
import { PasswordHasher } from '../../src/auth/PasswordHasher';

describe('PrismaCredentialVerifier', () => {
  let mockPrisma: any;
  let verifier: PrismaCredentialVerifier;

  beforeEach(() => {
    mockPrisma = {
      identityRecord: {
        findUnique: vi.fn(),
      }
    };
    verifier = new PrismaCredentialVerifier(mockPrisma);
  });

  it('should authenticate a valid active user with correct password', async () => {
    const plainPassword = 'supersecretpassword';
    const passwordHash = await PasswordHasher.hash(plainPassword);

    mockPrisma.identityRecord.findUnique.mockResolvedValue({
      id: 'user-123',
      status: 'PROVISIONED',
      account: {
        accessState: 'Active'
      },
      credentials: [
        {
          type: 'password',
          passwordHash,
          disabled: false
        }
      ]
    });

    const result = await verifier.verify('user-123', plainPassword);
    expect(result).toBe(true);
  });

  it('accepts an activated identity while preserving the active account check', async () => {
    const passwordHash = await PasswordHasher.hash('supersecretpassword');
    mockPrisma.identityRecord.findUnique.mockResolvedValue({
      id: 'user-123',
      status: 'ACTIVE',
      account: { accessState: 'Active' },
      credentials: [{ type: 'password', passwordHash, disabled: false }],
    });

    await expect(verifier.verify('user-123', 'supersecretpassword')).resolves.toBe(true);
  });

  it('should reject incorrect password', async () => {
    const plainPassword = 'supersecretpassword';
    const passwordHash = await PasswordHasher.hash(plainPassword);

    mockPrisma.identityRecord.findUnique.mockResolvedValue({
      id: 'user-123',
      status: 'PROVISIONED',
      account: {
        accessState: 'Active'
      },
      credentials: [
        {
          type: 'password',
          passwordHash,
          disabled: false
        }
      ]
    });

    const result = await verifier.verify('user-123', 'wrongpassword');
    expect(result).toBe(false);
  });

  it('should reject unknown user', async () => {
    mockPrisma.identityRecord.findUnique.mockResolvedValue(null);

    const result = await verifier.verify('unknown-user', 'any-password');
    expect(result).toBe(false);
  });

  it('should reject inactive/suspended user account states', async () => {
    const plainPassword = 'supersecretpassword';
    const passwordHash = await PasswordHasher.hash(plainPassword);

    // Identity suspended
    mockPrisma.identityRecord.findUnique.mockResolvedValue({
      id: 'user-123',
      status: 'PROVISIONED',
      account: {
        accessState: 'Suspended'
      },
      credentials: [
        {
          type: 'password',
          passwordHash,
          disabled: false
        }
      ]
    });

    let result = await verifier.verify('user-123', plainPassword);
    expect(result).toBe(false);

    // Identity status not PROVISIONED
    mockPrisma.identityRecord.findUnique.mockResolvedValue({
      id: 'user-123',
      status: 'DEPROVISIONED',
      account: {
        accessState: 'Active'
      },
      credentials: [
        {
          type: 'password',
          passwordHash,
          disabled: false
        }
      ]
    });

    result = await verifier.verify('user-123', plainPassword);
    expect(result).toBe(false);
  });

  it('should reject if credential is disabled', async () => {
    const plainPassword = 'supersecretpassword';
    const passwordHash = await PasswordHasher.hash(plainPassword);

    mockPrisma.identityRecord.findUnique.mockResolvedValue({
      id: 'user-123',
      status: 'PROVISIONED',
      account: {
        accessState: 'Active'
      },
      credentials: [] // Filtered out by findUnique's where condition in query
    });

    const result = await verifier.verify('user-123', plainPassword);
    expect(result).toBe(false);
  });

  it('should fail closed on database exception', async () => {
    mockPrisma.identityRecord.findUnique.mockRejectedValue(new Error('DB Connection Timeout'));

    const result = await verifier.verify('user-123', 'password');
    expect(result).toBe(false);
  });
});

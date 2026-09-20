import { describe, it, expect, vi } from 'vitest';
import { ProvisionIdentityUseCase } from '../../src/identity/ProvisionIdentityUseCase';
import { IdentityType } from '@manaratak/domain';

describe('ProvisionIdentityUseCase', () => {
  it('should provision a human identity successfully', async () => {
    const mockRepo = {
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(null),
      findByPhone: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      isEmailUnique: vi.fn().mockResolvedValue(true),
      isPhoneUnique: vi.fn().mockResolvedValue(true)
    };
    
    const useCase = new ProvisionIdentityUseCase(mockRepo as any);
    const result = await useCase.execute({
      type: IdentityType.Human,
      primaryEmail: 'newuser@manaratak.local'
    });

    if (!result.isSuccess) {
      throw new Error(String(result.error));
    }

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().type).toBe(IdentityType.Human);
    expect(result.getValue().user?.contactRegistry.primaryEmail).toBe('newuser@manaratak.local');
  });
});

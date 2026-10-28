import { describe, it, expect } from 'vitest';
import { IdentityType, type Identity, type IIdentityRepository } from '@manaratak/domain';

import { ProvisionIdentityUseCase } from '../../src/identity/ProvisionIdentityUseCase';
import { UpdateContactUseCase } from '../../src/identity/UpdateContactUseCase';
import { identityContactUpdateSchema } from '../../../../apps/api/src/presentation/validation/StrictControlPlaneSchemas';
describe('contact ownership verification boundary', () => {
  it.each(['verifyEmail', 'verifyPhone'])('rejects %s as an administrative HTTP field', (key) => {
    expect(
      identityContactUpdateSchema.safeParse({ email: 'new@invalid.test', [key]: true }).success,
    ).toBe(false);
  });
  it('never verifies email or phone through the normal contact use case', async () => {
    const records = new Map<string, Identity>();
    const repository = {
      findById: async (id: string) => records.get(id) ?? null,
      save: async (record: Identity) => {
        records.set(String(record.id), record);
      },
      isEmailUnique: async (email: string) =>
        ![...records.values()].some(
          (record) => record.user?.contactRegistry.primaryEmail === email,
        ),
      isPhoneUnique: async () => true,
    } as IIdentityRepository;
    const provision = new ProvisionIdentityUseCase(repository);
    const created = await provision.execute({
      type: IdentityType.Human,
      displayName: 'Example',
      primaryEmail: 'before@invalid.test',
      createdBy: 'manager',
    });
    expect(created.isSuccess).toBe(true);
    const id = created.getValue().id;
    const update = new UpdateContactUseCase(repository);
    for (const flag of [{ verifyEmail: true }, { verifyPhone: true }]) {
      const result = await update.execute({ identityId: id, ...flag });
      expect(result.isSuccess).toBe(false);
      expect(JSON.stringify(result.error)).toContain(
        'CONTACT_VERIFICATION_REQUIRES_OWNERSHIP_PROOF',
      );
    }
    const identity = await repository.findById(id);
    expect(identity!.user!.contactRegistry.isEmailVerified).toBe(false);
    expect(identity!.user!.contactRegistry.isPhoneVerified).toBe(false);
    const changed = await update.execute({ identityId: id, email: 'after@invalid.test' });
    expect(changed.isSuccess).toBe(true);
    expect(changed.getValue().user!.contactRegistry.isEmailVerified).toBe(false);
  });
});

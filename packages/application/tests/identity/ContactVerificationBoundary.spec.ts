import { describe, it, expect } from 'vitest';
import { IdentityType } from '@manaratak/domain';
import { InMemoryIdentityRepository } from '@manaratak/infrastructure';
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
    const repository = new InMemoryIdentityRepository(),
      provision = new ProvisionIdentityUseCase(repository);
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

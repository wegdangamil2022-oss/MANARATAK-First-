import { describe, expect, it, vi } from 'vitest';
import { LifeStatus } from '@manaratak/domain';
import { VerifyEmailUseCase } from '../../src/identity/use-cases/VerifyEmailUseCase';
import { ResendVerificationUseCase } from '../../src/identity/use-cases/ResendVerificationUseCase';
import { ResetPasswordUseCase } from '../../src/identity/use-cases/ResetPasswordUseCase';
import { UpdateContactUseCase } from '../../src/identity/UpdateContactUseCase';

describe('account recovery boundaries', () => {
  const token = { id: 'token', identityId: 'identity', email: 'old@example.invalid', createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000), consumedAt: null };
  const user = { contactRegistry: { primaryEmail: 'old@example.invalid', isEmailVerified: false, verifyEmail: vi.fn() } };

  it.each([LifeStatus.SUSPENDED, LifeStatus.ARCHIVED, LifeStatus.PURGED])('does not verify or reactivate %s identities', async (status) => {
    const identity = { status, user, activate: vi.fn() };
    const save = vi.fn();
    const consume = vi.fn();
    const useCase = new VerifyEmailUseCase({ findById: async () => identity, save } as any, { findByTokenHash: async () => token, consume } as any);
    await expect(useCase.execute({ token: 'sample' })).rejects.toMatchObject({ code: 'VERIFICATION_NOT_ALLOWED' });
    expect(identity.activate).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
  });

  it.each([LifeStatus.SUSPENDED, LifeStatus.ARCHIVED, LifeStatus.PURGED])('does not resend verification for %s identities', async (status) => {
    const sendVerificationEmail = vi.fn();
    const save = vi.fn();
    const useCase = new ResendVerificationUseCase({ findByEmail: async () => ({ status, user }) } as any, { save } as any, { sendVerificationEmail } as any);
    expect(await useCase.execute({ email: 'old@example.invalid' })).toMatchObject({ success: true });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('verifies an active identity without changing its status and guards the save', async () => {
    const identity = { status: LifeStatus.ACTIVE, user, activate: vi.fn(), id: { toString: () => 'identity' } };
    const save = vi.fn();
    const useCase = new VerifyEmailUseCase({ findById: async () => identity, save } as any, { findByTokenHash: async () => token, consume: vi.fn() } as any);
    await useCase.execute({ token: 'sample' });
    expect(identity.activate).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(identity, { expectedStatus: LifeStatus.ACTIVE, expectedEmail: 'old@example.invalid' });
  });

  it('rejects a recovery token issued for a previous email', async () => {
    const passwordHasher = { hash: vi.fn() };
    const useCase = new ResetPasswordUseCase({ identityRepository: { findById: async () => ({ user: { contactRegistry: { primaryEmail: 'new@example.invalid' } } }) } as any, tokenRepository: { findByTokenHash: async () => token } as any, passwordHasher });
    await expect(useCase.execute({ token: 'sample', newPassword: 'safe-password' })).rejects.toMatchObject({ code: 'RESET_TOKEN_INVALID' });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
  });

  it('checks the current email again in the transaction before consuming a token', async () => {
    const consume = vi.fn();
    const prismaClient = { $transaction: async (fn: any) => fn({ userRecord: { findUnique: async () => ({ primaryEmail: 'new@example.invalid' }) }, passwordResetTokenRecord: { updateMany: consume } }) };
    const useCase = new ResetPasswordUseCase({ identityRepository: { findById: async () => ({ user }) } as any, tokenRepository: { findByTokenHash: async () => token } as any, passwordHasher: { hash: async () => 'hash' }, prismaClient });
    await expect(useCase.execute({ token: 'sample', newPassword: 'safe-password' })).rejects.toMatchObject({ code: 'RESET_TOKEN_INVALID' });
    expect(consume).not.toHaveBeenCalled();
  });

  it.each([new Date(NaN), null, undefined])('rejects an invalid token creation timestamp', async (createdAt) => {
    const hasher = { hash: vi.fn() };
    const useCase = new ResetPasswordUseCase({ identityRepository: {} as any, tokenRepository: { findByTokenHash: async () => ({ ...token, createdAt }) } as any, passwordHasher: hasher });
    await expect(useCase.execute({ token: 'sample', newPassword: 'safe-password' })).rejects.toMatchObject({ code: 'RESET_TOKEN_INVALID' });
    expect(hasher.hash).not.toHaveBeenCalled();
  });

  it.each([
    { changedAfterToken: false, expectedSuccess: true },
    { changedAfterToken: true, expectedSuccess: false },
  ])('updates the password only when the credential predates the token: $expectedSuccess', async ({ changedAfterToken, expectedSuccess }) => {
    const createdAt = new Date('2026-01-01T00:00:01.000Z');
    const credentialUpdatedAt = new Date(createdAt.getTime() + (changedAfterToken ? 1000 : -1000));
    const resetToken = { ...token, createdAt };
    const tokenUpdates = vi.fn().mockResolvedValue({ count: 1 });
    const credentialUpdate = vi.fn(async ({ where }: any) => ({ count: credentialUpdatedAt <= where.updatedAt.lte ? 1 : 0 }));
    const tx = { userRecord: { findUnique: async () => ({ primaryEmail: 'old@example.invalid' }) }, passwordResetTokenRecord: { updateMany: tokenUpdates }, credentialRecord: { updateMany: credentialUpdate }, sessionRecord: { updateMany: vi.fn() } };
    const prismaClient = { $transaction: async (fn: any) => fn(tx) };
    const useCase = new ResetPasswordUseCase({ identityRepository: { findById: async () => ({ user }) } as any, tokenRepository: { findByTokenHash: async () => resetToken } as any, passwordHasher: { hash: async () => 'hash' }, prismaClient });
    const result = useCase.execute({ token: 'sample', newPassword: 'safe-password' });
    if (expectedSuccess) {
      await expect(result).resolves.toMatchObject({ success: true });
      expect(tokenUpdates).toHaveBeenCalledTimes(2);
      expect(tokenUpdates).toHaveBeenLastCalledWith({ where: { identityId: 'identity', consumedAt: null }, data: { consumedAt: expect.any(Date) } });
    } else {
      await expect(result).rejects.toMatchObject({ code: 'RESET_TOKEN_INVALID' });
      expect(tokenUpdates).toHaveBeenCalledTimes(1);
    }
    expect(credentialUpdate.mock.calls[0][0].where.updatedAt).toEqual({ lte: createdAt });
  });

  it('invalidates recovery tokens before saving a changed email', async () => {
    const invalidatePendingForIdentity = vi.fn();
    const save = vi.fn();
    const identity = { user, updateEmail: vi.fn() };
    const useCase = new UpdateContactUseCase({ findById: async () => identity, isEmailUnique: async () => true, save } as any, { invalidatePendingForIdentity } as any);
    await useCase.execute({ identityId: 'identity', email: 'new@example.invalid' });
    expect(invalidatePendingForIdentity).toHaveBeenCalledWith('identity');
    expect(invalidatePendingForIdentity.mock.invocationCallOrder[0]).toBeLessThan(save.mock.invocationCallOrder[0]);
  });
});

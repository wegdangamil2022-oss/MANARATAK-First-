// In-memory model of the reset transaction; no actual database is used.
export function resetTransactionFixture(identityRepository, tokenRepository, credentialsByUserId, sessionManager) {
  const updatedAt = new Map();
  return {
    $transaction: async (fn, options) => {
      if (options?.isolationLevel !== 'Serializable') throw new Error('Expected serializable reset transaction');
      const tokenSnapshot = structuredClone(tokenRepository.tokens);
      const credentialSnapshot = structuredClone(credentialsByUserId);
      const updatedSnapshot = structuredClone(updatedAt);
      const tx = {
        userRecord: { findUnique: async ({ where }) => {
          const identity = await identityRepository.findById(where.identityId);
          return identity?.user ? { primaryEmail: identity.user.contactRegistry.primaryEmail } : null;
        } },
        passwordResetTokenRecord: { updateMany: async ({ where, data }) => {
          if (where.tokenHash) {
            const record = await tokenRepository.findByTokenHash(where.tokenHash);
            if (!record || record.id !== where.id || record.consumedAt || record.expiresAt <= where.expiresAt.gt) return { count: 0 };
            await tokenRepository.consume(where.id, data.consumedAt);
            return { count: 1 };
          }
          await tokenRepository.invalidatePendingForIdentity(where.identityId);
          return { count: 1 };
        } },
        credentialRecord: { updateMany: async ({ where, data }) => {
          if (!credentialsByUserId.has(where.identityId) || (updatedAt.get(where.identityId) ?? new Date(0)) > where.updatedAt.lte) return { count: 0 };
          credentialsByUserId.set(where.identityId, data.passwordHash);
          updatedAt.set(where.identityId, data.updatedAt);
          return { count: 1 };
        } },
        sessionRecord: { updateMany: async ({ where }) => {
          await sessionManager?.revokeAllSessions(where.identityId);
          return { count: 1 };
        } },
      };
      try { return await fn(tx); } catch (error) {
        tokenRepository.tokens = tokenSnapshot;
        credentialsByUserId.clear(); for (const [id, hash] of credentialSnapshot) credentialsByUserId.set(id, hash);
        updatedAt.clear(); for (const [id, value] of updatedSnapshot) updatedAt.set(id, value);
        throw error;
      }
    },
  };
}

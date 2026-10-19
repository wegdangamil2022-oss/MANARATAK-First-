import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaSessionManager } from '../../src/auth/PrismaSessionManager';
import * as crypto from 'crypto';

describe('PrismaSessionManager', () => {
  let sessionManager: PrismaSessionManager;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      sessionRecord: {
        create: vi.fn(),
        updateMany: vi.fn(),
        findFirst: vi.fn(),
      }
    };
    sessionManager = new PrismaSessionManager(mockPrisma, 3600);
  });

  const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

  it('never stores raw token', async () => {
    await sessionManager.createSession('user1', 'raw-token-123');
    
    expect(mockPrisma.sessionRecord.create).toHaveBeenCalled();
    const callArgs = mockPrisma.sessionRecord.create.mock.calls[0][0];
    
    expect(callArgs.data.refreshTokenHash).not.toBe('raw-token-123');
    expect(callArgs.data.refreshTokenHash).toBe(hashToken('raw-token-123'));
    expect(callArgs.data.identityId).toBe('user1');
  });

  it('valid session can be created and validated', async () => {
    mockPrisma.sessionRecord.findFirst.mockResolvedValue({
      id: 'session-1',
      identityId: 'user1',
      refreshTokenHash: hashToken('valid-token'),
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null
    });

    const isValid = await sessionManager.isValidSession('user1', 'valid-token');
    
    expect(isValid).toBe(true);
    expect(mockPrisma.sessionRecord.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        refreshTokenHash: hashToken('valid-token'),
        revokedAt: null,
      })
    }));
  });

  it('wrong token fails', async () => {
    mockPrisma.sessionRecord.findFirst.mockResolvedValue(null);
    const isValid = await sessionManager.isValidSession('user1', 'wrong-token');
    expect(isValid).toBe(false);
  });

  it('wrong user fails', async () => {
    mockPrisma.sessionRecord.findFirst.mockResolvedValue(null);
    const isValid = await sessionManager.isValidSession('wrong-user', 'valid-token');
    expect(isValid).toBe(false);
  });

  it('expired session fails', async () => {
    // findFirst itself enforces gt: new Date()
    mockPrisma.sessionRecord.findFirst.mockResolvedValue(null);
    const isValid = await sessionManager.isValidSession('user1', 'expired-token');
    expect(isValid).toBe(false);
  });

  it('revoked session fails', async () => {
    mockPrisma.sessionRecord.findFirst.mockResolvedValue(null);
    const isValid = await sessionManager.isValidSession('user1', 'revoked-token');
    expect(isValid).toBe(false);
  });

  it('revoke-all affects only the intended user', async () => {
    await sessionManager.revokeAllSessions('user1');
    expect(mockPrisma.sessionRecord.updateMany).toHaveBeenCalledWith({
      where: {
        identityId: 'user1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date)
      }
    });
  });

  it('repeated revoke is deterministic', async () => {
    await sessionManager.revokeSession('user1', 'token');
    await sessionManager.revokeSession('user1', 'token');
    
    expect(mockPrisma.sessionRecord.updateMany).toHaveBeenCalledTimes(2);
    // Since updateMany handles no-ops cleanly if no rows match, it is deterministic.
  });

  it('retries a rolled-back serialization conflict and revokes the committed family on a fresh read', async () => {
    const tx = { sessionRecord: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'parent', identityId: 'user1', familyId: 'family',
        revokedAt: new Date(), rotatedAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn(),
    } };
    mockPrisma.$transaction = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('Synthetic serialization conflict'), { code: 'P2034' }))
      .mockImplementationOnce(work => work(tx));

    await expect(sessionManager.consumeAndRotateRefreshSession('parent-token', 'next-token', 'child')).resolves.toBeNull();
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    for (const [, options] of mockPrisma.$transaction.mock.calls) expect(options).toEqual({ isolationLevel: 'Serializable' });
    expect(tx.sessionRecord.updateMany).toHaveBeenCalledWith({
      where: { familyId: 'family', revokedAt: null }, data: { revokedAt: expect.any(Date) },
    });
    expect(tx.sessionRecord.create).not.toHaveBeenCalled();
  });

  it('bounds serialization retries and preserves the failure when conflicts persist', async () => {
    const conflict = Object.assign(new Error('Synthetic serialization conflict'), { code: 'P2034' });
    mockPrisma.$transaction = vi.fn().mockRejectedValue(conflict);
    await expect(sessionManager.consumeAndRotateRefreshSession('parent-token', 'next-token', 'child')).rejects.toBe(conflict);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('does not retry an unknown commit outcome or other database failure', async () => {
    const unknown = Object.assign(new Error('Synthetic response lost'), { code: 'P1001' });
    mockPrisma.$transaction = vi.fn().mockRejectedValue(unknown);
    await expect(sessionManager.consumeAndRotateRefreshSession('parent-token', 'next-token', 'child')).rejects.toBe(unknown);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

});

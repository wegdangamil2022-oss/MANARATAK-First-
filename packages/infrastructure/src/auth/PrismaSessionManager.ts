import { ISessionManager, RefreshSession } from '@manaratak/core';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'node:crypto';

export class PrismaSessionManager implements ISessionManager {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly sessionTtlSeconds: number = 86400 * 7,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public async createSession(userId: string, refreshToken: string, sessionId = crypto.randomUUID()): Promise<void> {
    const hashed = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.sessionTtlSeconds * 1000);

    await this.prisma.sessionRecord.create({
      data: {
        id: sessionId,
        identityId: userId,
        refreshTokenHash: hashed,
        familyId: sessionId,
        expiresAt,
      },
    });
  }

  public async revokeSession(userId: string, refreshToken: string): Promise<void> {
    const hashed = this.hashToken(refreshToken);
    await this.prisma.sessionRecord.updateMany({
      where: { identityId: userId, refreshTokenHash: hashed, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.sessionRecord.updateMany({
      where: { identityId: userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async findRefreshSession(refreshToken: string): Promise<RefreshSession | null> {
    const session = await this.prisma.sessionRecord.findFirst({
      where: {
        refreshTokenHash: this.hashToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, identityId: true, familyId: true },
    });
    return session ? { userId: session.identityId, sessionId: session.id, familyId: session.familyId } : null;
  }

  public async consumeAndRotateRefreshSession(refreshToken: string, nextRefreshToken: string, nextSessionId: string): Promise<RefreshSession | null> {
    const parentHash = this.hashToken(refreshToken);
    const nextHash = this.hashToken(nextRefreshToken);
    const expiresAt = new Date(Date.now() + this.sessionTtlSeconds * 1000);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const parent = await tx.sessionRecord.findUnique({
        where: { refreshTokenHash: parentHash },
        select: {
          id: true,
          identityId: true,
          familyId: true,
          revokedAt: true,
          rotatedAt: true,
          expiresAt: true,
        },
      });

      if (!parent) return null;

      // A token that was already consumed by rotation is a replay signal.
      // Revoke the whole family so a concurrent descendant cannot survive.
      if (parent.revokedAt || parent.expiresAt <= now) {
        if (parent.rotatedAt) {
          await tx.sessionRecord.updateMany({
            where: { familyId: parent.familyId, revokedAt: null },
            data: { revokedAt: now },
          });
        }
        return null;
      }

      const consumed = await tx.sessionRecord.updateMany({
        where: {
          id: parent.id,
          refreshTokenHash: parentHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now, rotatedAt: now },
      });

      if (consumed.count !== 1) {
        // Lost a race after reading the parent. Treat it as replay and revoke
        // the family in this same persistence unit.
        await tx.sessionRecord.updateMany({
          where: { familyId: parent.familyId, revokedAt: null },
          data: { revokedAt: now },
        });
        return null;
      }

      await tx.sessionRecord.create({
        data: {
          id: nextSessionId,
          identityId: parent.identityId,
          refreshTokenHash: nextHash,
          familyId: parent.familyId,
          parentSessionId: parent.id,
          expiresAt,
        },
      });

      return { userId: parent.identityId, sessionId: nextSessionId, familyId: parent.familyId };
    });
  }

  /** @deprecated Prefer findRefreshSession; retained for compatibility tests during migration. */
  public async isValidSession(userId: string, refreshToken: string): Promise<boolean> {
    const session = await this.findRefreshSession(refreshToken);
    return session?.userId === userId;
  }

  public async isSessionActive(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.prisma.sessionRecord.findFirst({
      where: { id: sessionId, identityId: userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    return !!session;
  }
}

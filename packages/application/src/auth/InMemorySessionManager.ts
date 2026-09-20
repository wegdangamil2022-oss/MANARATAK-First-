import { ISessionManager, RefreshSession } from '@manaratak/core';
import * as crypto from 'node:crypto';

interface MemorySessionRecord {
  userId: string;
  sessionId: string;
  familyId: string;
  parentSessionId?: string;
  refreshTokenHash: string;
  revokedAt?: Date;
  rotatedAt?: Date;
}

export class InMemorySessionManager implements ISessionManager {
  private readonly sessionsById = new Map<string, MemorySessionRecord>();
  private readonly sessionIdByRefreshHash = new Map<string, string>();

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public async createSession(userId: string, refreshToken: string, sessionId = crypto.randomUUID()): Promise<void> {
    const hash = this.hashToken(refreshToken);
    const record: MemorySessionRecord = { userId, sessionId, familyId: sessionId, refreshTokenHash: hash };
    this.sessionsById.set(sessionId, record);
    this.sessionIdByRefreshHash.set(hash, sessionId);
  }

  public async revokeSession(userId: string, refreshToken: string): Promise<void> {
    const sessionId = this.sessionIdByRefreshHash.get(this.hashToken(refreshToken));
    const session = sessionId ? this.sessionsById.get(sessionId) : undefined;
    if (session?.userId === userId && !session.revokedAt) session.revokedAt = new Date();
  }

  public async revokeAllSessions(userId: string): Promise<void> {
    const now = new Date();
    for (const session of this.sessionsById.values()) {
      if (session.userId === userId && !session.revokedAt) session.revokedAt = now;
    }
  }

  public async findRefreshSession(refreshToken: string): Promise<RefreshSession | null> {
    const sessionId = this.sessionIdByRefreshHash.get(this.hashToken(refreshToken));
    const session = sessionId ? this.sessionsById.get(sessionId) : undefined;
    if (!session || session.revokedAt) return null;
    return { userId: session.userId, sessionId: session.sessionId, familyId: session.familyId };
  }

  public async consumeAndRotateRefreshSession(refreshToken: string, nextRefreshToken: string, nextSessionId: string): Promise<RefreshSession | null> {
    const parentHash = this.hashToken(refreshToken);
    const parentId = this.sessionIdByRefreshHash.get(parentHash);
    const parent = parentId ? this.sessionsById.get(parentId) : undefined;

    if (!parent) return null;
    if (parent.revokedAt) {
      if (parent.rotatedAt) this.revokeFamily(parent.familyId);
      return null;
    }

    const now = new Date();
    parent.revokedAt = now;
    parent.rotatedAt = now;

    const nextHash = this.hashToken(nextRefreshToken);
    if (this.sessionIdByRefreshHash.has(nextHash) || this.sessionsById.has(nextSessionId)) {
      // Roll back the in-memory transition on impossible/random-collision input.
      parent.revokedAt = undefined;
      parent.rotatedAt = undefined;
      return null;
    }

    const child: MemorySessionRecord = {
      userId: parent.userId,
      sessionId: nextSessionId,
      familyId: parent.familyId,
      parentSessionId: parent.sessionId,
      refreshTokenHash: nextHash,
    };
    this.sessionsById.set(nextSessionId, child);
    this.sessionIdByRefreshHash.set(nextHash, nextSessionId);
    return { userId: child.userId, sessionId: child.sessionId, familyId: child.familyId };
  }

  /** @deprecated Prefer findRefreshSession; retained for compatibility tests during migration. */
  public async isValidSession(userId: string, refreshToken: string): Promise<boolean> {
    const session = await this.findRefreshSession(refreshToken);
    return session?.userId === userId;
  }

  public async isSessionActive(userId: string, sessionId: string): Promise<boolean> {
    const session = this.sessionsById.get(sessionId);
    return !!session && session.userId === userId && !session.revokedAt;
  }

  private revokeFamily(familyId: string): void {
    const now = new Date();
    for (const session of this.sessionsById.values()) {
      if (session.familyId === familyId && !session.revokedAt) session.revokedAt = now;
    }
  }
}

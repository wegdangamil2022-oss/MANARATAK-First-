export interface RefreshSession {
  readonly userId: string;
  readonly sessionId: string;
  readonly familyId: string;
}

export interface ISessionManager {
  createSession(userId: string, refreshToken: string, sessionId?: string): Promise<void>;
  revokeSession(userId: string, refreshToken: string): Promise<void>;
  revokeAllSessions(userId: string): Promise<void>;
  /** Resolve only an active, unexpired opaque refresh credential. */
  findRefreshSession(refreshToken: string): Promise<RefreshSession | null>;
  /**
   * Atomically consumes one active refresh session and creates exactly one
   * child session. Reuse/replay fails closed; persistence may revoke the
   * affected rotation family according to policy.
   */
  consumeAndRotateRefreshSession(refreshToken: string, nextRefreshToken: string, nextSessionId: string): Promise<RefreshSession | null>;
  isSessionActive(userId: string, sessionId: string): Promise<boolean>;
}

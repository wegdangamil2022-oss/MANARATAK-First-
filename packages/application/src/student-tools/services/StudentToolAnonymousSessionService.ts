import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const TOKEN_VERSION = 'v1';
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

export interface ResolvedAnonymousStudentToolSession {
  sessionReference: string;
  token: string;
  expiresAt: Date;
  newlyIssued: boolean;
}

/**
 * Server-issued anonymous session identity for Phase 18.
 * Tokens are HMAC-signed and bound to the server-observed network reference.
 */
export class StudentToolAnonymousSessionService {
  constructor(
    private readonly secret?: string,
    private readonly ttlSeconds = DEFAULT_TTL_SECONDS,
  ) {}

  status(): 'READY' | 'NOT_CONFIGURED' {
    return this.validSecret() ? 'READY' : 'NOT_CONFIGURED';
  }

  resolve(presentedToken: string | undefined, trustedNetworkReference: string): ResolvedAnonymousStudentToolSession {
    if (!this.validSecret()) throw new Error('TOOL_ANONYMOUS_SESSION_NOT_CONFIGURED');
    const networkHash = this.networkHash(trustedNetworkReference);
    if (presentedToken?.trim()) {
      const parsed = this.verify(presentedToken.trim(), networkHash);
      if (!parsed) throw new Error('TOOL_ANONYMOUS_SESSION_INVALID');
      return { ...parsed, token: presentedToken.trim(), newlyIssued: false };
    }
    const sessionReference = randomUUID();
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    const expiresEpoch = Math.floor(expiresAt.getTime() / 1000);
    const payload = `${TOKEN_VERSION}.${sessionReference}.${expiresEpoch}.${networkHash}`;
    const signature = this.sign(payload);
    return {
      sessionReference,
      expiresAt,
      token: `${payload}.${signature}`,
      newlyIssued: true,
    };
  }

  private verify(token: string, expectedNetworkHash: string): Omit<ResolvedAnonymousStudentToolSession, 'token' | 'newlyIssued'> | null {
    const parts = token.split('.');
    if (parts.length !== 5 || parts[0] !== TOKEN_VERSION) return null;
    const [version, sessionReference, expiresRaw, networkHash, signature] = parts;
    if (!/^[0-9a-f-]{36}$/i.test(sessionReference)) return null;
    const expiresEpoch = Number(expiresRaw);
    if (!Number.isInteger(expiresEpoch) || expiresEpoch * 1000 <= Date.now()) return null;
    if (networkHash !== expectedNetworkHash) return null;
    const payload = `${version}.${sessionReference}.${expiresRaw}.${networkHash}`;
    const expected = Buffer.from(this.sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    return { sessionReference, expiresAt: new Date(expiresEpoch * 1000) };
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret!).update(payload).digest('base64url');
  }

  private networkHash(value: string): string {
    return createHash('sha256').update(`phase18-network:${value.trim() || 'unknown'}`).digest('hex').slice(0, 24);
  }

  private validSecret(): boolean {
    return typeof this.secret === 'string' && this.secret.trim().length >= 32;
  }
}

import { ISecurityService, IRateLimiter } from '@manaratak/core';
import { DefaultRateLimiter } from './DefaultRateLimiter';
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface CsrfOptions {
  /** Maximum token age in milliseconds. Default: 24 hours (86400000 ms) */
  maxAgeMs?: number;
  /** Deployment-owned HMAC key. Rotation invalidates all outstanding CSRF tokens. */
  signingSecret?: string;
}

export class SecurityService implements ISecurityService {
  public readonly isProductionReady: boolean = true;
  public readonly kind: 'real' | 'demo' = 'real';
  private rateLimiter: IRateLimiter;
  private csrfMaxAgeMs: number;
  private readonly csrfSigningSecret?: string;

  constructor(rateLimiter?: IRateLimiter, csrfOptions?: CsrfOptions) {
    this.rateLimiter = rateLimiter || new DefaultRateLimiter();
    this.csrfMaxAgeMs = csrfOptions?.maxAgeMs ?? 86400000; // 24 hours
    this.csrfSigningSecret = csrfOptions?.signingSecret?.trim() || undefined;
  }

  getRateLimiter(): IRateLimiter {
    return this.rateLimiter;
  }

  /**
   * Generates a cryptographically secure, non-static CSRF token.
   * Token format: `<timestamp>.<nonce>.<hmac-signature>`
   */
  generateCsrfToken(sessionBinding: string): string {
    if (!this.csrfSigningSecret) throw new Error('CSRF_SIGNING_SECRET_REQUIRED');
    if (!sessionBinding || !sessionBinding.trim()) throw new Error('CSRF_SESSION_BINDING_REQUIRED');
    const timestamp = Date.now().toString();
    const nonce = randomBytes(16).toString('hex');
    const bindingDigest = createHash('sha256').update(sessionBinding).digest('hex');
    const payload = `${bindingDigest}.${timestamp}.${nonce}`;
    const signature = createHmac('sha256', this.csrfSigningSecret).update(payload).digest('hex');
    return `${timestamp}.${nonce}.${signature}`;
  }

  /**
   * Validates a CSRF token against a session secret.
   * Rejects missing, malformed, expired, tampered, or invalid tokens.
   */
  validateCsrfToken(token: string, sessionBinding: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [timestampStr, nonce, signature] = parts;
    if (!timestampStr || !nonce || !signature) {
      return false;
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || timestamp <= 0) {
      return false;
    }

    const now = Date.now();
    if (now - timestamp > this.csrfMaxAgeMs) {
      return false;
    }
    if (timestamp > now + 60000) {
      return false;
    }

    if (!this.csrfSigningSecret || !sessionBinding || !sessionBinding.trim()) return false;
    const bindingDigest = createHash('sha256').update(sessionBinding).digest('hex');
    const payload = `${bindingDigest}.${timestampStr}.${nonce}`;
    const expectedSignature = createHmac('sha256', this.csrfSigningSecret).update(payload).digest('hex');

    const receivedSigBuf = Buffer.from(signature, 'utf8');
    const expectedSigBuf = Buffer.from(expectedSignature, 'utf8');

    if (receivedSigBuf.length !== expectedSigBuf.length) {
      return false;
    }

    return timingSafeEqual(receivedSigBuf, expectedSigBuf);
  }

  [key: string]: any;
  static [key: string]: any;
}

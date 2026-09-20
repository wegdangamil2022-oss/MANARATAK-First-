import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SecurityService } from '../../src/security/SecurityService';
import { createHash, createHmac } from 'node:crypto';

describe('SecurityService CSRF Protection', () => {
  let securityService: SecurityService;
  const sessionBinding = 'test-refresh-session-binding-12345';
  const csrfSigningSecret = 'csrf-signing-key-at-least-32-characters-long';

  beforeEach(() => {
    vi.useFakeTimers();
    securityService = new SecurityService(undefined, { signingSecret: csrfSigningSecret });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates non-hardcoded tokens that are unique across multiple calls', () => {
    const token1 = securityService.generateCsrfToken(sessionBinding);
    const token2 = securityService.generateCsrfToken(sessionBinding);

    expect(token1).not.toBe('demo-token');
    expect(token2).not.toBe('demo-token');
    expect(token1).not.toBe(token2);
    expect(token1.split('.')).toHaveLength(3);
  });

  it('validates a legitimately generated token successfully', () => {
    const token = securityService.generateCsrfToken(sessionBinding);
    expect(securityService.validateCsrfToken(token, sessionBinding)).toBe(true);
  });

  it('rejects missing or non-string tokens', () => {
    expect(securityService.validateCsrfToken('', sessionBinding)).toBe(false);
    expect(securityService.validateCsrfToken(null as any, sessionBinding)).toBe(false);
    expect(securityService.validateCsrfToken(undefined as any, sessionBinding)).toBe(false);
  });

  it('fails closed when the server-owned signing key or session binding is missing', () => {
    const unkeyed = new SecurityService();
    expect(() => unkeyed.generateCsrfToken(sessionBinding)).toThrow('CSRF_SIGNING_SECRET_REQUIRED');
    expect(() => securityService.generateCsrfToken('')).toThrow('CSRF_SESSION_BINDING_REQUIRED');
    expect(unkeyed.validateCsrfToken('1.a.b', sessionBinding)).toBe(false);
    expect(securityService.validateCsrfToken('1.a.b', '')).toBe(false);
  });

  it('rejects malformed tokens', () => {
    expect(securityService.validateCsrfToken('not-a-valid-token', sessionBinding)).toBe(false);
    expect(securityService.validateCsrfToken('part1.part2', sessionBinding)).toBe(false);
    expect(securityService.validateCsrfToken('a.b.c.d', sessionBinding)).toBe(false);
    expect(securityService.validateCsrfToken('invalidTimestamp.nonce.sig', sessionBinding)).toBe(false);
  });

  it('rejects tampered tokens', () => {
    const token = securityService.generateCsrfToken(sessionBinding);
    const parts = token.split('.');

    const tamperedTs = `${Number(parts[0]) - 10}.${parts[1]}.${parts[2]}`;
    expect(securityService.validateCsrfToken(tamperedTs, sessionBinding)).toBe(false);

    const tamperedNonce = `${parts[0]}.tamperednonce123456.${parts[2]}`;
    expect(securityService.validateCsrfToken(tamperedNonce, sessionBinding)).toBe(false);

    const tamperedSig = `${parts[0]}.${parts[1]}.badsignature1234567890abcdef1234567890abcdef1234567890abcdef12345678`;
    expect(securityService.validateCsrfToken(tamperedSig, sessionBinding)).toBe(false);
  });

  it('rejects tokens bound to a different refresh session', () => {
    const token = securityService.generateCsrfToken('refresh-session-A');
    expect(securityService.validateCsrfToken(token, 'refresh-session-B')).toBe(false);
  });

  it('rejects tokens after CSRF signing-key rotation', () => {
    const token = securityService.generateCsrfToken(sessionBinding);
    const rotated = new SecurityService(undefined, {
      signingSecret: 'rotated-csrf-signing-key-at-least-32-characters',
    });
    expect(rotated.validateCsrfToken(token, sessionBinding)).toBe(false);
  });

  it('rejects expired tokens', () => {
    const token = securityService.generateCsrfToken(sessionBinding);
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    expect(securityService.validateCsrfToken(token, sessionBinding)).toBe(false);
  });

  it('rejects tokens with timestamps in the far future', () => {
    const farFutureTs = Date.now() + 120000;
    const nonce = '0123456789abcdef0123456789abcdef';
    const bindingDigest = createHash('sha256').update(sessionBinding).digest('hex');
    const futurePayload = `${bindingDigest}.${farFutureTs}.${nonce}`;
    const futureSig = createHmac('sha256', csrfSigningSecret).update(futurePayload).digest('hex');
    const futureToken = `${farFutureTs}.${nonce}.${futureSig}`;

    expect(securityService.validateCsrfToken(futureToken, sessionBinding)).toBe(false);
  });
});

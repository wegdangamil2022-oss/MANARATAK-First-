import { describe, it, expect } from 'vitest';
import { encodeBase32, totp, matchingStep } from '../../src/auth/mfa/Totp';
const secret = encodeBase32(Buffer.from('12345678901234567890'));
describe('RFC 6238 SHA1 TOTP and replay protection', () => {
  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ])('matches RFC vector %s', (seconds, expected) =>
    expect(totp(secret, Math.floor(Number(seconds) / 30), 8)).toBe(expected),
  );
  it('accepts a fresh code and rejects reuse', () => {
    const now = new Date('2026-10-12T12:00:00Z'),
      step = Math.floor(now.getTime() / 30000),
      code = totp(secret, step);
    expect(matchingStep(secret, code, now, -1)).toBe(step);
    expect(() => matchingStep(secret, code, now, step)).toThrow('MFA_CODE_INVALID');
  });
  it('permits bounded clock skew but not an old-window code', () => {
    const now = new Date('2026-10-12T12:00:00Z'),
      step = Math.floor(now.getTime() / 30000);
    expect(matchingStep(secret, totp(secret, step + 1), now, step)).toBe(step + 1);
    expect(() => matchingStep(secret, totp(secret, step - 2), now, -1)).toThrow();
  });
  it.each(['12345', '1234567', 'abcdef'])('rejects malformed proof %s', (code) =>
    expect(() => matchingStep(secret, code, new Date(), -1)).toThrow('MFA_CODE_INVALID'),
  );
});

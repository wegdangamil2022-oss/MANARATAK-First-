import { describe, it, expect, vi } from 'vitest';
import { MfaUseCases, type IMfaGateway } from '../../src/auth/mfa/MfaUseCases';
import type { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import type { ISessionManager } from '@manaratak/core';
function setup() {
  const proof = { enrollmentId: 'enrollment-1', verifiedAt: new Date().toISOString() },
    gateway = {
      enabled: vi.fn(async () => true),
      consume: vi.fn(async () => proof),
      begin: vi.fn(async () => ({ secret: 'private', provisioningUri: 'otpauth://private' })),
      confirm: vi.fn(),
      disable: vi.fn(),
      markProof: vi.fn(),
      sessionProofValid: vi.fn(async () => false),
      proofIsFresh: vi.fn(async () => false),
      copyProof: vi.fn(),
    },
    credentials = { verify: vi.fn(async () => true) },
    sessions = { revokeAllSessions: vi.fn(), isSessionActive: vi.fn(async () => true) },
    atomic = {
      execute: vi.fn(async (_definition, operation) => operation({ boundaryId: 'test' })),
    },
    approvals = { consume: vi.fn() };
  return {
    gateway,
    credentials,
    sessions,
    atomic,
    approvals,
    uc: new MfaUseCases(
      gateway as IMfaGateway,
      credentials,
      atomic as unknown as AtomicDomainMutationCoordinator,
      sessions as unknown as ISessionManager,
      approvals as any,
    ),
    proof,
  };
}
describe('MFA owner policy', () => {
  it.each([true, false])(
    'uses an atomic authentication decision without fallback: %s',
    async (allowed) => {
      const s = setup();
      const read = vi.fn(async () => allowed);
      Object.assign(s.gateway, { sessionAuthenticationAllowed: read });
      expect(await s.uc.sessionAuthenticated('p', 'session')).toBe(allowed);
      expect(read).toHaveBeenCalledWith('p', 'session');
      expect(s.gateway.enabled).not.toHaveBeenCalled();
      expect(s.gateway.sessionProofValid).not.toHaveBeenCalled();
    },
  );
  it('does not fall back to allowing a session when the atomic read fails', async () => {
    const s = setup();
    Object.assign(s.gateway, {
      sessionAuthenticationAllowed: vi.fn(async () => {
        throw new Error('STORAGE_UNAVAILABLE');
      }),
    });
    await expect(s.uc.sessionAuthenticated('p', 'session')).rejects.toThrow('STORAGE_UNAVAILABLE');
    expect(s.gateway.enabled).not.toHaveBeenCalled();
    expect(s.gateway.sessionProofValid).not.toHaveBeenCalled();
  });
  it('requires a second factor before a login session can be created', async () => {
    const s = setup();
    await expect(s.uc.assertLogin('p')).rejects.toThrow('MFA_REQUIRED');
    expect(s.gateway.consume).not.toHaveBeenCalled();
  });
  it('returns a bound enrollment proof after consuming the OTP', async () => {
    const s = setup();
    expect(await s.uc.assertLogin('p', '123456')).toBe(s.proof);
    expect(s.gateway.consume).toHaveBeenCalledWith('p', '123456', { boundaryId: 'test' });
  });
  it('does not weaken accounts that have not enrolled', async () => {
    const s = setup();
    s.gateway.enabled.mockResolvedValue(false);
    expect(await s.uc.assertLogin('p')).toBeNull();
    expect(await s.uc.sessionAuthenticated('p', 'session')).toBe(true);
  });
  it('rejects an enabled account without a session-bound proof', async () => {
    const s = setup();
    expect(await s.uc.sessionAuthenticated('p', 'session')).toBe(false);
    await expect(s.uc.assertFresh('p', 'session')).rejects.toThrow('MFA_STEP_UP_REQUIRED');
  });
  it('does not consume OTP on an incorrect password', async () => {
    const s = setup();
    s.credentials.verify.mockResolvedValue(false);
    await expect(s.uc.stepUp('p', 'session', 'wrong', '123456')).rejects.toThrow(
      'MFA_CREDENTIAL_DENIED',
    );
    expect(s.gateway.consume).not.toHaveBeenCalled();
  });
  it('requires an active session for step-up', async () => {
    const s = setup();
    s.sessions.isSessionActive.mockResolvedValue(false);
    await expect(s.uc.stepUp('p', 'session', 'password', '123456')).rejects.toThrow(
      'MFA_SESSION_REQUIRED',
    );
    expect(s.credentials.verify).not.toHaveBeenCalled();
  });
  it('marks the exact proof without returning its secret', async () => {
    const s = setup();
    await s.uc.stepUp('p', 'session', 'password', '123456');
    expect(s.gateway.markProof).toHaveBeenCalledWith('p', 'session', s.proof);
    expect(JSON.stringify(s.atomic.execute.mock.calls[0][0])).not.toContain('123456');
  });
  it('revokes sessions when an enrollment is confirmed', async () => {
    const s = setup();
    await s.uc.confirm('p', '123456');
    expect(s.sessions.revokeAllSessions).toHaveBeenCalledWith('p');
  });
  it('requires approval consumption before administrative reset', async () => {
    const s = setup();
    s.approvals.consume.mockRejectedValue(new Error('GOVERNANCE_APPROVAL_REQUIRED'));
    await expect(
      s.uc.adminReset(
        'target',
        'actor',
        'checker',
        'Verified recovery reason',
        'approval',
        'CHG-123',
      ),
    ).rejects.toThrow('GOVERNANCE_APPROVAL_REQUIRED');
    expect(s.gateway.disable).not.toHaveBeenCalled();
    expect(s.sessions.revokeAllSessions).not.toHaveBeenCalled();
  });
  it.each([
    ['target', 'actor', 'actor'],
    ['target', 'target', 'checker'],
    ['target', 'actor', 'target'],
  ])('rejects self-approved or self-targeted reset', async (target, actor, checker) => {
    const s = setup();
    await expect(
      s.uc.adminReset(target, actor, checker, 'Verified recovery reason', 'approval', 'CHG-123'),
    ).rejects.toThrow('MFA_RESET_APPROVAL_REQUIRED');
    expect(s.approvals.consume).not.toHaveBeenCalled();
  });
});

describe('privileged administrative changes require enrollment', () => {
  it('blocks a password-only account from administrative changes', async () => {
    const s = setup();
    s.gateway.enabled.mockResolvedValue(false);
    await expect(s.uc.assertFresh('p', 'session')).rejects.toThrow('MFA_ENROLLMENT_REQUIRED');
  });
});

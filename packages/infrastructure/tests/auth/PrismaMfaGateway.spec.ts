import { describe, it, expect, vi } from 'vitest';
import { PrismaMfaGateway } from '../../src/auth/mfa/PrismaMfaGateway';
import { totp } from '../../src/auth/mfa/Totp';
function fixture() {
  const rows = new Map<string, any>(),
    db = {
      $queryRaw: vi.fn(async () => []),
      credentialRecord: {
        findUnique: vi.fn(async ({ where }: any) => rows.get(where.identityId_type.type) ?? null),
        findUniqueOrThrow: vi.fn(async ({ where }: any) => {
          const row = rows.get(where.identityId_type.type);
          if (!row) throw new Error('MISSING');
          return row;
        }),
        upsert: vi.fn(async ({ where, create, update }: any) => {
          const old = rows.get(where.identityId_type.type),
            row = old
              ? { ...old, ...update }
              : { ...create, id: 'row-' + create.type, disabled: false };
          rows.set(row.type, row);
          return row;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const row = [...rows.values()].find(
            (row) => row.id === where.id || row.type === where.identityId_type?.type,
          );
          if (!row) throw new Error('MISSING');
          Object.assign(row, data);
          return row;
        }),
        create: vi.fn(async ({ data }: any) => {
          const row = { ...data, id: 'proof', disabled: false };
          rows.set(row.type, row);
          return row;
        }),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
    };
  return {
    rows,
    db,
    gateway: new PrismaMfaGateway(db as any, 'ab'.repeat(32)),
    context: { boundaryId: 'test', transactionClient: db } as any,
  };
}
describe('encrypted TOTP persistence and session proof binding', () => {
  it('stores authenticated encryption without plaintext secret', async () => {
    const s = fixture();
    const enrollment = await s.gateway.begin('p', s.context);
    expect(enrollment.provisioningUri).toContain('otpauth://');
    const stored = s.rows.get('TOTP').passwordHash;
    expect(stored).not.toContain(enrollment.secret);
    expect(JSON.parse(stored)).toMatchObject({ version: 1, confirmed: false, lastStep: -1 });
  });
  it('cannot provision without a configured encryption key', async () => {
    const s = fixture();
    await expect(new PrismaMfaGateway(s.db as any).begin('p', s.context)).rejects.toThrow(
      'MFA_ENCRYPTION_UNAVAILABLE',
    );
    expect(s.db.credentialRecord.upsert).not.toHaveBeenCalled();
  });
  it('serializes credential mutations and rejects OTP replay', async () => {
    const s = fixture();
    const enrollment = await s.gateway.begin('p', s.context);
    const code = totp(enrollment.secret, Math.floor(Date.now() / 30000));
    await s.gateway.confirm('p', code, s.context);
    expect(await s.gateway.enabled('p')).toBe(true);
    await expect(s.gateway.consume('p', code, s.context)).rejects.toThrow('MFA_CODE_INVALID');
    expect(s.db.$queryRaw.mock.calls.length).toBe(5);
  });
  it('rejects a login proof from an earlier enrollment', async () => {
    const s = fixture();
    const enrollment = await s.gateway.begin('p', s.context);
    await s.gateway.confirm(
      'p',
      totp(enrollment.secret, Math.floor(Date.now() / 30000)),
      s.context,
    );
    await expect(
      s.gateway.markProof('p', 'session', {
        enrollmentId: 'different',
        verifiedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow('MFA_SESSION_REQUIRED');
  });
  it('binds proof to a specific session and rejects copying a different session', async () => {
    const s = fixture();
    const enrollment = await s.gateway.begin('p', s.context);
    await s.gateway.confirm(
      'p',
      totp(enrollment.secret, Math.floor(Date.now() / 30000)),
      s.context,
    );
    const id = JSON.parse(s.rows.get('TOTP').passwordHash).enrollmentId;
    await s.gateway.markProof('p', 'session', {
      enrollmentId: id,
      verifiedAt: new Date().toISOString(),
    });
    expect(await s.gateway.sessionProofValid('p', 'session')).toBe(true);
    expect(await s.gateway.sessionProofValid('p', 'other')).toBe(false);
    await expect(s.gateway.copyProof('p', 'other', 'next')).rejects.toThrow('MFA_SESSION_REQUIRED');
  });
  it('refresh preserves an older authenticated proof without renewing step-up freshness', async () => {
    const s = fixture();
    const enrollment = await s.gateway.begin('p', s.context);
    await s.gateway.confirm(
      'p',
      totp(enrollment.secret, Math.floor(Date.now() / 30000)),
      s.context,
    );
    const id = JSON.parse(s.rows.get('TOTP').passwordHash).enrollmentId;
    await s.gateway.markProof('p', 'session', {
      enrollmentId: id,
      verifiedAt: new Date().toISOString(),
    });
    const entry = [...s.rows.values()].find((row) => row.type.startsWith('MFA_PROOF:'));
    const old = new Date(Date.now() - 11 * 60000).toISOString();
    entry.passwordHash = JSON.stringify({ ...JSON.parse(entry.passwordHash), verifiedAt: old });
    expect(await s.gateway.sessionProofValid('p', 'session')).toBe(true);
    expect(await s.gateway.proofIsFresh('p', 'session')).toBe(false);
    await s.gateway.copyProof('p', 'session', 'next');
    expect(await s.gateway.sessionProofValid('p', 'next')).toBe(true);
    expect(await s.gateway.proofIsFresh('p', 'next')).toBe(false);
  });
});

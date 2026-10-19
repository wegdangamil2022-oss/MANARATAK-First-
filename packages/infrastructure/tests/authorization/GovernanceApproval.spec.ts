import { describe, it, expect, vi } from 'vitest';
import { PrismaGovernanceApprovalGateway } from '../../src/authorization/PrismaGovernanceApprovalGateway';
import { governanceApprovalDigest } from '@absheer/application';
const payload = {
  pairs: [],
  expectedRevision: null,
  reason: 'Review configuration',
  changeTicket: 'CHG-123',
};
function setup(changes: Record<string, unknown> = {}) {
  const approval = {
      id: 'approval',
      scope: 'DUTY_POLICY',
      requestedBy: 'maker',
      approverId: 'checker',
      payload,
      digest: governanceApprovalDigest('DUTY_POLICY', payload),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      approvedAt: null,
      usedAt: null,
      ...changes,
    },
    db = {
      $queryRaw: vi.fn(async () => []),
      policyRecord: {
        findUnique: vi.fn(async () => ({
          id: 'governance-approval:approval',
          ruleType: 'GOVERNANCE_APPROVAL',
          ruleConfiguration: JSON.stringify(approval),
        })),
        update: vi.fn(),
        create: vi.fn(),
      },
    };
  return {
    db,
    gateway: new PrismaGovernanceApprovalGateway(db as any),
    context: { boundaryId: 'test', transactionClient: db } as any,
  };
}
describe('independent approval must originate from the reviewer session', () => {
  it('cannot self-approve or approve as an unrelated identity', async () => {
    const s = setup();
    for (const actor of ['maker', 'someone'])
      await expect(s.gateway.approve('approval', actor, s.context)).rejects.toThrow(
        'GOVERNANCE_APPROVAL_DENIED',
      );
    expect(s.db.policyRecord.update).not.toHaveBeenCalled();
  });
  it('records approval only for the bound reviewer', async () => {
    const s = setup();
    await s.gateway.approve('approval', 'checker', s.context);
    expect(
      JSON.parse(s.db.policyRecord.update.mock.calls[0][0].data.ruleConfiguration).approvedAt,
    ).toBeTruthy();
  });
  it('does not accept an eligible reviewer name without their actual approval', async () => {
    const s = setup();
    await expect(
      s.gateway.consume('approval', 'DUTY_POLICY', payload, 'maker', 'checker', s.context),
    ).rejects.toThrow('GOVERNANCE_APPROVAL_REQUIRED');
    expect(s.db.policyRecord.update).not.toHaveBeenCalled();
  });
  it.each([
    { usedAt: new Date().toISOString() },
    { expiresAt: new Date(Date.now() - 1).toISOString() },
    { requestedBy: 'checker' },
  ])('rejects consumed/expired/self-approved envelopes %j', async (change) => {
    const s = setup({ approvedAt: new Date().toISOString(), ...change });
    await expect(
      s.gateway.consume('approval', 'DUTY_POLICY', payload, 'maker', 'checker', s.context),
    ).rejects.toThrow('GOVERNANCE_APPROVAL_REQUIRED');
  });
  it('rejects changed payload, actor, reviewer or scope', async () => {
    const s = setup({ approvedAt: new Date().toISOString() });
    await expect(
      s.gateway.consume(
        'approval',
        'DUTY_POLICY',
        { ...payload, reason: 'Changed reason' },
        'maker',
        'checker',
        s.context,
      ),
    ).rejects.toThrow();
    await expect(
      s.gateway.consume('approval', 'MFA_RESET', payload, 'maker', 'checker', s.context),
    ).rejects.toThrow();
    await expect(
      s.gateway.consume('approval', 'DUTY_POLICY', payload, 'other', 'checker', s.context),
    ).rejects.toThrow();
    await expect(
      s.gateway.consume('approval', 'DUTY_POLICY', payload, 'maker', 'other', s.context),
    ).rejects.toThrow();
  });
  it('consumes once inside the caller transaction, never creating a standalone write', async () => {
    const s = setup({ approvedAt: new Date().toISOString() });
    await s.gateway.consume('approval', 'DUTY_POLICY', payload, 'maker', 'checker', s.context);
    expect(
      JSON.parse(s.db.policyRecord.update.mock.calls[0][0].data.ruleConfiguration).usedAt,
    ).toBeTruthy();
    expect(s.db.$queryRaw).toHaveBeenCalledTimes(1);
    await expect(
      s.gateway.consume('approval', 'DUTY_POLICY', payload, 'maker', 'checker', {
        boundaryId: 'test',
      } as any),
    ).rejects.toThrow('TRANSACTION_REQUIRED');
  });
  it('canonicalizes object keys while preserving array order', () => {
    expect(governanceApprovalDigest('DUTY_POLICY', { a: 1, b: { x: 2, y: 3 } })).toBe(
      governanceApprovalDigest('DUTY_POLICY', { b: { y: 3, x: 2 }, a: 1 }),
    );
    expect(governanceApprovalDigest('DUTY_POLICY', [1, 2])).not.toBe(
      governanceApprovalDigest('DUTY_POLICY', [2, 1]),
    );
  });
});

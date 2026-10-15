import {describe, expect, it, vi} from 'vitest';
import {PrismaCareerEngagementRepository} from '../../src/career-alumni/PrismaCareerEngagementRepository';
import {PrismaFinanceRepository} from '../../src/finance-platform/PrismaFinanceRepository';
import {financeCommandFixture} from './FinanceCommandFixture';

describe('Post-closure persistence proof boundaries', () => {
  it.each([false, true])('binds the full String.trim whitespace set for consent page and count (network=%s)', async network => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{total: 0n}]);
    const repository = new PrismaCareerEngagementRepository({$transaction: async (run: (tx: unknown) => unknown) => run({$queryRaw: query})} as never);
    if (network) await repository.listAlumniNetwork(1, 20); else await repository.listPublicAlumni(1, 20);
    const whitespace = ' \t\n\v\f\r\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';
    expect(whitespace.trim()).toBe('');
    for (const [sql] of query.mock.calls) {
      expect(sql.sql).toContain('btrim("consentSource",');
      const trimCharacters = sql.values.find((value: unknown) => typeof value === 'string' && value.includes('\ufeff'));
      expect(new Set(trimCharacters)).toEqual(new Set(whitespace));
      expect(sql.sql.includes("'ALUMNI_ONLY'")).toBe(network);
    }
  });
  function approvalFixture() {
    const decisions: Array<Record<string, unknown>> = [];
    const approval = {id: 'approval', publicId: 'approval-public', makerId: 'maker', version: 1,
      status: 'PENDING', requiredApprovals: 2, expiresAt: new Date('2090-01-01'), decisions};
    const db: any = {financeCommandRecord: financeCommandFixture(),
      financeApprovalRecord: {findFirst: vi.fn(async () => approval), findUnique: vi.fn(async () => approval),
        updateMany: vi.fn(async ({data}) => {approval.status = data.status; approval.version++; return {count: 1};})},
      financeApprovalDecisionRecord: {create: vi.fn(async ({data}) => {decisions.push({id: 'decision', ...data});}),
        findMany: vi.fn(async () => decisions)},
      auditRecord: {create: vi.fn()}, transactionalOutboxRecord: {create: vi.fn()}};
    db.$transaction = async (run: (tx: unknown) => unknown) => run(db);
    return {db, repository: new PrismaFinanceRepository(db)};
  }
  it('uses the real repository receipt lookup before a stale version/previous checker on retry', async () => {
    const f = approvalFixture(), identity = {actorId: 'checker', correlationId: 'synthetic', idempotencyKey: 'intent', expectedVersion: 1};
    const first = await f.repository.decideApproval('approval', 'APPROVE', 'checker', undefined, identity);
    const second = await f.repository.decideApproval('approval', 'APPROVE', 'checker', undefined, identity);
    expect(second).toEqual(JSON.parse(JSON.stringify(first)));
    expect(f.db.financeApprovalDecisionRecord.create).toHaveBeenCalledOnce();
    expect(f.db.financeCommandRecord.create).toHaveBeenCalledOnce();
    expect(f.db.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
    await expect(f.repository.decideApproval('approval', 'REJECT', 'checker', 'Changed intent', identity)).rejects.toThrow('IDEMPOTENCY_CONFLICT');
    expect(f.db.financeApprovalDecisionRecord.create).toHaveBeenCalledOnce();
  });
  it('keeps maker separation in the persistence owner as well', async () => {
    const f = approvalFixture();
    await expect(f.repository.decideApproval('approval', 'APPROVE', 'maker', undefined,
      {actorId: 'maker', idempotencyKey: 'intent', expectedVersion: 1})).rejects.toThrow('Maker');
    expect(f.db.financeApprovalDecisionRecord.create).not.toHaveBeenCalled();
    expect(f.db.financeCommandRecord.create).not.toHaveBeenCalled();
  });
});

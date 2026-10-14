import { describe, expect, it, vi } from 'vitest';
import { PrismaCareerRepository } from '../../src/career-alumni/PrismaCareerRepository';
describe('Employer identity and published representation governance', () => {
  it.each(['industry', 'description', 'logoAssetId'])(
    'invalidates verification on a material %s update',
    async (field) => {
      const row: any = {
        id: 'employer',
        version: 1,
        verificationStatus: 'VERIFIED',
        metadata: {
          _career: { makerActorId: 'maker', verification: { reviewerActorId: 'checker' } },
        },
      };
      const model = {
        findUnique: vi.fn().mockResolvedValue(row),
        update: vi.fn(async ({ data }: any) => ({ ...row, ...data, version: 2 })),
      };
      const tx = { careerEmployerRecord: model, transactionalOutboxRecord: { create: vi.fn() } };
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) };
      const uc = new PrismaCareerRepository(db as never).withActor({
        actorId: 'editor',
        reason: 'Reviewed change',
        correlationId: 'trace',
      });
      const result = await uc.updateEmployer('employer', { [field]: 'new value' }, 1);
      expect(result.verificationStatus).toBe('UNVERIFIED');
      expect((result.metadata?._career as any).verification).toBeNull();
      expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
    },
  );
  it('uses the same employer filter for count and rows in a read snapshot', async () => {
    const model = { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) };
    const db = { $transaction: vi.fn(async (fn: any) => fn({ careerEmployerRecord: model })) };
    await new PrismaCareerRepository(db as never).listEmployers({
      page: 2,
      pageSize: 20,
      search: 'company',
    });
    expect(model.count).toHaveBeenCalledWith({
      where: (model.findMany.mock.calls[0] as any)[0].where,
    });
    expect(db.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
  });
});

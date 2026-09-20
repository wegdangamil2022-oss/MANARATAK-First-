import { PrismaClient } from '@prisma/client';
import { IRetentionDecisionRepository } from '@manaratak/application';
import { RetentionDecision } from '@manaratak/domain';

export class PrismaRetentionDecisionRepository implements IRetentionDecisionRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async hasTerminalDecision(decisionKey: string): Promise<boolean> {
    return Boolean(await (this.prisma as any).retentionDecisionRecord.findFirst({ where: { decisionKey, result: { in: ['APPLIED', 'SKIPPED'] } }, select: { id: true } }));
  }
  async append(input: RetentionDecision & { result: 'APPLIED' | 'SKIPPED' | 'FAILED'; errorMessage?: string | null }): Promise<void> {
    try {
      await (this.prisma as any).retentionDecisionRecord.create({ data: {
        decisionKey: input.decisionKey, owner: input.owner, recordId: input.recordId, expiresAt: input.expiresAt,
        disposition: input.disposition, reason: input.reason, result: input.result, terminalKey: input.result === 'FAILED' ? null : input.decisionKey, errorMessage: input.errorMessage ?? null, decidedAt: input.decidedAt,
      }});
    } catch (error: any) {
      if (error?.code === 'P2002') return;
      throw error;
    }
  }
}

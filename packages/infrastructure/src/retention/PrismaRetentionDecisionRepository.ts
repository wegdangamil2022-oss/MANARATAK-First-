import { PrismaClient } from '@prisma/client';
import { IRetentionDecisionRepository } from '@manaratak/application';
import { RetentionDecision } from '@manaratak/domain';

export class PrismaRetentionDecisionRepository implements IRetentionDecisionRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async hasTerminalDecision(decisionKey: string): Promise<boolean> {
    // A hold, a competing worker, or a stale candidate may be skipped temporarily.
    // Only a completed owner disposition prevents a later retry.
    return Boolean(await this.prisma.retentionDecisionRecord.findFirst({ where: { decisionKey, result: 'APPLIED' }, select: { id: true } }));
  }
  async append(input: RetentionDecision & { result: 'APPLIED' | 'SKIPPED' | 'FAILED'; errorMessage?: string | null }): Promise<void> {
    try {
      await this.prisma.$transaction(async tx => {
        if (input.result === 'APPLIED') {
          // Older SKIPPED rows claimed the terminal key. Preserve that evidence,
          // releasing only its operational key when a real disposition succeeds.
          await tx.retentionDecisionRecord.updateMany({
            where: { terminalKey: input.decisionKey, result: 'SKIPPED' },
            data: { terminalKey: null },
          });
        }
        await tx.retentionDecisionRecord.create({ data: {
        decisionKey: input.decisionKey, owner: input.owner, recordId: input.recordId, expiresAt: input.expiresAt,
        // Deduplicate repeated skip evidence without making the skip terminal.
        disposition: input.disposition, reason: input.reason, result: input.result, terminalKey: input.result === 'FAILED' ? null : input.decisionKey, errorMessage: input.errorMessage ?? null, decidedAt: input.decidedAt,
      }});
      });
    } catch (error: any) {
      if (error?.code === 'P2002') return;
      throw error;
    }
  }
}

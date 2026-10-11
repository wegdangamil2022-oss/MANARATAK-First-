import { Prisma, PrismaClient } from '@prisma/client';
import { IRetentionOwnerGateway } from '@manaratak/application';
import {
  RetentionCandidate,
  RetentionDecision,
  RetentionDisposition,
  RetentionOwner,
} from '@manaratak/domain';
export class PrismaStudentPrivateResultRetentionGateway implements IRetentionOwnerGateway {
  readonly owner = RetentionOwner.STUDENT_PRIVATE_RESULT;
  constructor(private readonly prisma: PrismaClient) {}
  async listDue(now: Date, limit: number): Promise<RetentionCandidate[]> {
    const rows = await this.prisma.studentSavedItem.findMany({
      where: {
        privateResultExpiresAt: { lte: now },
        privateResultEnvelope: { not: Prisma.DbNull },
      },
      take: Math.min(100, Math.max(1, limit)),
      orderBy: [{ privateResultExpiresAt: 'asc' }, { id: 'asc' }],
      select: { id: true, privateResultExpiresAt: true },
    });
    return rows.map((row) => ({
      owner: this.owner,
      recordId: row.id,
      expiresAt: row.privateResultExpiresAt!,
    }));
  }
  async applyDecision(
    candidate: RetentionCandidate,
    decision: RetentionDecision,
  ): Promise<'APPLIED' | 'SKIPPED'> {
    if (
      candidate.owner !== this.owner ||
      decision.owner !== this.owner ||
      candidate.recordId !== decision.recordId ||
      candidate.expiresAt.getTime() !== decision.expiresAt.getTime() ||
      decision.disposition !== RetentionDisposition.PURGE ||
      decision.expiresAt > decision.decidedAt
    )
      throw new Error('STUDENT_PRIVATE_RESULT_RETENTION_MISMATCH');
    const changed = await this.prisma.studentSavedItem.updateMany({
      where: {
        id: candidate.recordId,
        privateResultExpiresAt: decision.expiresAt,
        privateResultEnvelope: { not: Prisma.DbNull },
      },
      data: { privateResultEnvelope: Prisma.DbNull },
    });
    return changed.count === 1 ? 'APPLIED' : 'SKIPPED';
  }
}

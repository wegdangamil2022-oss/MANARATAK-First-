import { PrismaAuditRecordRepository } from './PrismaAuditRecordRepository';
import { createHash, randomUUID } from 'node:crypto';
import { type PrismaClient } from '@prisma/client';
import type {
  AuditAlertRule,
  WorkspaceRow,
  IAuditAlertEvaluationGateway,
  ManageNotificationIntentsUseCase,
} from '@manaratak/application';
import type { PrismaAuditWorkspaceGateway } from './PrismaAuditWorkspaceGateway';
export class PrismaAuditAlertEvaluationGateway implements IAuditAlertEvaluationGateway {
  constructor(
    private readonly db: PrismaClient,
    private readonly workspace: PrismaAuditWorkspaceGateway,
    private readonly intents: ManageNotificationIntentsUseCase,
  ) {}
  rules(limit: number, cursor?: string) {
    return this.workspace.list('ALERT_RULE', limit, cursor);
  }
  async count(rule: AuditAlertRule, from: Date, until: Date) {
    const page = await new PrismaAuditRecordRepository(this.db).queryPage({
      action: rule.action,
      category: rule.category,
      severity: rule.severity,
      result: rule.outcome,
      from,
      until: new Date(until.getTime() - 1),
      limit: rule.threshold,
    });
    return page.items.length; // Saturated threshold, never a total count or event payload in notifications.
  }
  async retryPending(limit: number, signal?: AbortSignal) {
    const receipts = await this.db.auditAlertOccurrenceRecord.findMany({
      where: {
        state: { in: ['PENDING', 'FAILED', 'DELIVERING'] },
        OR: [{ claimUntil: null }, { claimUntil: { lte: new Date() } }],
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
    let recovered = 0,
      failed = 0;
    for (const receipt of receipts) {
      if (signal?.aborted) throw new Error('AUDIT_ALERT_EVALUATION_ABORTED');
      try {
        const row = await this.workspace.get(receipt.ruleId, 'ALERT_RULE');
        if (!row || row.version !== receipt.ruleVersion || !(row.data as AuditAlertRule).enabled) {
          await this.db.auditAlertOccurrenceRecord.updateMany({
            where: {
              id: receipt.id,
              state: { not: 'INTENT_CREATED' },
              OR: [{ claimUntil: null }, { claimUntil: { lte: new Date() } }],
            },
            data: { state: 'CANCELLED', claimToken: null, claimUntil: null },
          });
          continue;
        }
        if (await this.deliver(row, receipt.bucket, receipt.matchedCount)) recovered++;
      } catch {
        failed++;
      }
    }
    return { recovered, failed };
  }
  async deliver(row: WorkspaceRow, bucket: Date, matchedCount: number) {
    const rule = row.data as AuditAlertRule;
    const id = createHash('sha256')
      .update(JSON.stringify([row.id, row.version, bucket.toISOString()]))
      .digest('hex');
    const token = randomUUID(),
      now = new Date();
    const receipt = await this.db.$transaction(async (tx) => {
      const current = await tx.auditWorkspaceRecord.findUnique({ where: { id: row.id } });
      if (
        !current ||
        current.version !== row.version ||
        !(current.data as unknown as AuditAlertRule).enabled
      )
        return null;
      await tx.auditAlertOccurrenceRecord.upsert({
        where: { id },
        create: {
          id,
          ruleId: row.id,
          ruleVersion: row.version,
          bucket,
          matchedCount,
          intentId: 'audit-alert:' + id,
        },
        update: {},
      });
      const claimed = await tx.auditAlertOccurrenceRecord.updateMany({
        where: {
          id,
          state: { not: 'INTENT_CREATED' },
          OR: [{ claimUntil: null }, { claimUntil: { lte: now } }],
        },
        data: {
          state: 'DELIVERING',
          claimToken: token,
          claimUntil: new Date(now.getTime() + 120000),
        },
      });
      return claimed.count === 1
        ? tx.auditAlertOccurrenceRecord.findUnique({ where: { id } })
        : null;
    });
    if (!receipt) return false;
    try {
      // Stable owner intent ID; repository upsert is append-only for existing payload/state.
      await this.intents.createIntent({
        id: receipt.intentId,
        reference: receipt.intentId,
        templateId: rule.templateId,
        recipientReference: rule.recipientId,
        variables: {
          ruleName: rule.name,
          matchedCount: String(receipt.matchedCount),
          actionUrl: '/admin/audit',
        },
        purpose: 'TRANSACTIONAL',
      });
      const acknowledged = await this.db.auditAlertOccurrenceRecord.updateMany({
        where: { id, claimToken: token },
        data: { state: 'INTENT_CREATED', claimToken: null, claimUntil: null },
      });
      return acknowledged.count === 1;
    } catch {
      await this.db.auditAlertOccurrenceRecord.updateMany({
        where: { id, claimToken: token },
        data: { state: 'FAILED', claimToken: null, claimUntil: null },
      });
      throw new Error('AUDIT_ALERT_NOTIFICATION_FAILED');
    }
  }
}

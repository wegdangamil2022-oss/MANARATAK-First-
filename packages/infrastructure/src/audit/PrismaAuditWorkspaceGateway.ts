import { Prisma, type PrismaClient } from '@prisma/client';
import type { AtomicPersistenceContext } from '@absheer/domain';
import {
  AuditRetentionPolicyResolver,
  type AuditRetentionDurations,
  type IAuditWorkspaceGateway,
  type WorkspaceKind,
  type WorkspaceRow,
} from '@absheer/application';
export class PrismaAuditWorkspaceGateway implements IAuditWorkspaceGateway {
  constructor(
    private readonly db: PrismaClient,
    private readonly recipientCheck: (identityId: string, templateId: string) => Promise<void>,
  ) {}
  private tx(context: AtomicPersistenceContext) {
    const client = (
      context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!context.boundaryId || !client) throw new Error('AUDIT_WORKSPACE_TRANSACTION_REQUIRED');
    return client;
  }
  async occurrences(ruleId: string, limit: number, cursor?: string) {
    const rows = await this.db.auditAlertOccurrenceRecord.findMany({
      where: { ruleId, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' },
      take: limit + 1,
      select: {
        id: true,
        state: true,
        bucket: true,
        matchedCount: true,
        intentId: true,
        ruleVersion: true,
      },
    });
    return {
      items: rows.slice(0, limit).map((row) => ({ ...row, bucket: row.bucket.toISOString() })),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    };
  }
  async get(id: string, kind: WorkspaceKind): Promise<WorkspaceRow | null> {
    const row = await this.db.auditWorkspaceRecord.findFirst({ where: { id, kind } });
    return row ? { ...row, kind: row.kind as WorkspaceKind } : null;
  }
  async list(kind: WorkspaceKind, limit: number, cursor?: string) {
    const take = Math.min(100, Math.max(1, limit));
    const rows = await this.db.auditWorkspaceRecord.findMany({
      where: { kind, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' },
      take: take + 1,
    });
    return {
      items: rows.slice(0, take).map((row) => ({ ...row, kind: row.kind as WorkspaceKind })),
      nextCursor: rows.length > take ? rows[take - 1].id : null,
    };
  }
  async save(row: WorkspaceRow, expectedVersion: number, context: AtomicPersistenceContext) {
    const db = this.tx(context);
    if (
      (row.kind === 'CASE' && !row.id.startsWith('audit-case:')) ||
      (row.kind === 'ALERT_RULE' && !row.id.startsWith('audit-alert:')) ||
      (row.kind === 'RETENTION_POLICY' && row.id !== 'audit-retention-policy')
    )
      throw new Error('AUDIT_WORKSPACE_NAMESPACE_INVALID');
    if (row.kind === 'RETENTION_POLICY') {
      const guards = await db.$queryRaw<Array<{ installed: boolean }>>(
        Prisma.sql`SELECT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid WHERE n.nspname=current_schema() AND c.relname='AuditRecord' AND t.tgname='audit_retention_envelope' AND t.tgenabled IN ('O','A') AND t.tgtype=7 AND p.proname='absheer_assign_audit_retention' AND current_setting('session_replication_role')='origin') AS installed`,
      );
      if (guards[0]?.installed !== true) throw new Error('AUDIT_RETENTION_ENVELOPE_NOT_INSTALLED');
    }
    if (row.kind === 'CASE')
      await db.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'audit-case-retention'},0))::text`,
      );
    const data = JSON.parse(JSON.stringify(row.data)) as Prisma.InputJsonValue;
    if (!expectedVersion) {
      try {
        await db.auditWorkspaceRecord.create({
          data: { id: row.id, kind: row.kind, version: 1, data },
        });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002')
          throw new Error('AUDIT_WORKSPACE_VERSION_CONFLICT');
        throw error;
      }
    } else {
      const changed = await db.auditWorkspaceRecord.updateMany({
        where: { id: row.id, kind: row.kind, version: expectedVersion },
        data: { data, version: expectedVersion + 1 },
      });
      if (changed.count !== 1) throw new Error('AUDIT_WORKSPACE_VERSION_CONFLICT');
    }
  }
  async assertReferences(references: string[], context: AtomicPersistenceContext) {
    if (!references.length) return;
    const rows = await this.tx(context).auditRecord.findMany({
      where: { reference: { in: references } },
      select: { reference: true },
      take: 101,
    });
    if (rows.length !== new Set(references).size) throw new Error('AUDIT_CASE_REFERENCE_NOT_FOUND');
  }
  async assertAssignee(identityId: string, context: AtomicPersistenceContext) {
    const row = await this.tx(context).identityRecord.findUnique({
      where: { id: identityId },
      select: { id: true, status: true, type: true },
    });
    if (!row || row.status !== 'ACTIVE' || row.type !== 'Human')
      throw new Error('AUDIT_CASE_ASSIGNEE_INVALID');
  }
  assertRecipient(identityId: string, templateId: string) {
    return this.recipientCheck(identityId, templateId);
  }
}
export class PrismaConfiguredAuditRetention {
  async resolve(
    input: {
      category: string;
      severity: string;
      regulatoryTags?: string[];
      retentionPeriodInDays?: number;
    },
    client: PrismaClient | Prisma.TransactionClient,
  ) {
    const row = await client.auditWorkspaceRecord.findUnique({
      where: { id: 'audit-retention-policy' },
    });
    if (row && row.kind !== 'RETENTION_POLICY') throw new Error('AUDIT_RETENTION_POLICY_INVALID');
    const durations = row ? (row.data as { durations: AuditRetentionDurations }).durations : {};
    if (!durations || typeof durations !== 'object' || Array.isArray(durations))
      throw new Error('AUDIT_RETENTION_POLICY_INVALID');
    return new AuditRetentionPolicyResolver(durations).resolve(input);
  }
}

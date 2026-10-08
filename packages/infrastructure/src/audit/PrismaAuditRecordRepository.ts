import { Prisma, PrismaClient } from '@prisma/client';
import { ISpecification } from '@manaratak/core';
import {
  ITransactionalAuditRecordRepository,
  AtomicPersistenceContext,
  AuditRecord,
  AuditId,
  AuditReference,
  AuditAction,
  AuditCategory,
  AuditSeverity,
  ActorReference,
  TargetReference,
  SourceReference,
  AuditTimestamp,
  ContextMetadata,
  ComplianceMetadata,
  CorrelationReference,
  TraceReference,
  AuditChainReference,
  AuditRetentionMetadata,
  AuditLifecycleState,
  AuditRecordPageQuery,
  AuditRecordPage,
  AuditIntegrityReport,
  AuditIntegrityQuery
} from '@manaratak/domain';
import { AuditSecretSanitizer } from './AuditSecretSanitizer';
import type { PrismaAtomicPersistenceContext } from '../event-foundation/PrismaTransactionalOutboxStore';

export interface AuditRecordRow {
  id: string;
  reference: string;
  action: string;
  category: string;
  severity: string;
  actorId: string;
  actorType: string;
  targetId: string;
  targetType: string;
  source: string;
  timestamp: Date;
  contextMetadata: unknown;
  complianceMetadata: unknown | null;
  correlationReference: string | null;
  traceReference: string | null;
  chainReference: string | null;
  retentionPeriodInDays: number | null;
  retentionExpiresAt: Date | null;
  lifecycleState: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaAuditRecordDelegate {
  findUnique(args: { where: { id?: string; reference?: string } }): Promise<AuditRecordRow | null>;
  findMany(args?: { where?: unknown }): Promise<AuditRecordRow[]>;
  create(args: {
    data: Omit<AuditRecordRow, 'createdAt' | 'updatedAt'>;
  }): Promise<AuditRecordRow>;
}

export interface AuditPrismaClient {
  auditRecord: PrismaAuditRecordDelegate;
}

export class PrismaAuditRecordRepository implements ITransactionalAuditRecordRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private get client(): AuditPrismaClient {
    return this.prisma as unknown as AuditPrismaClient;
  }

  public mapToDomain(row: AuditRecordRow): AuditRecord {
    const id = AuditId.create(row.id);
    const reference = AuditReference.create(row.reference);
    const action = AuditAction.create(row.action);
    const category = AuditCategory.create(row.category);
    const severity = AuditSeverity.create(row.severity);
    const actor = ActorReference.create(row.actorId, row.actorType);
    const target = TargetReference.create(row.targetId, row.targetType);
    const source = SourceReference.create(row.source);
    const timestamp = AuditTimestamp.create(new Date(row.timestamp));

    const rawContext = typeof row.contextMetadata === 'object' && row.contextMetadata !== null
      ? (row.contextMetadata as Record<string, any>)
      : {};
    const sanitizedContext = AuditSecretSanitizer.sanitize(rawContext);
    const contextMetadata = ContextMetadata.create(sanitizedContext);

    const complianceMetadata = Array.isArray(row.complianceMetadata)
      ? ComplianceMetadata.create(row.complianceMetadata as string[])
      : undefined;

    const correlationReference = row.correlationReference
      ? CorrelationReference.create(row.correlationReference)
      : undefined;

    const traceReference = row.traceReference
      ? TraceReference.create(row.traceReference)
      : undefined;

    const chainReference = row.chainReference
      ? AuditChainReference.create(AuditReference.create(row.chainReference))
      : undefined;

    const retentionMetadata = row.retentionPeriodInDays !== null && row.retentionPeriodInDays !== undefined
      ? AuditRetentionMetadata.create(row.retentionPeriodInDays, new Date(row.timestamp))
      : undefined;

    const record = AuditRecord.create(
      id,
      reference,
      action,
      category,
      severity,
      actor,
      target,
      source,
      timestamp,
      contextMetadata,
      complianceMetadata,
      correlationReference,
      traceReference,
      chainReference,
      retentionMetadata
    );

    if (row.lifecycleState === AuditLifecycleState.ARCHIVED) {
      record.archive();
    }

    record.clearEvents();
    return record;
  }

  async save(record: AuditRecord): Promise<void> {
    await this.saveWithClient(record, this.client);
  }

  async saveInTransaction(record: AuditRecord, context: AtomicPersistenceContext): Promise<void> {
    const transactionClient = (context as Partial<PrismaAtomicPersistenceContext>).transactionClient;
    const client = (transactionClient as unknown as Partial<AuditPrismaClient> | undefined)?.auditRecord;
    if (!context.boundaryId || !client) throw new Error('AUDIT_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    await this.saveWithClient(record, { auditRecord: client });
  }

  private async saveWithClient(record: AuditRecord, client: AuditPrismaClient): Promise<void> {
    const sanitizedContext = AuditSecretSanitizer.sanitize(record.getContextMetadata().getData());

    const data = {
      id: record.getId().getValue(),
      reference: record.getReference().getValue(),
      action: record.getAction().getValue(),
      category: record.getCategory().getValue(),
      severity: record.getSeverity().getValue(),
      actorId: record.getActor().getActorId(),
      actorType: record.getActor().getActorType(),
      targetId: record.getTarget().getTargetId(),
      targetType: record.getTarget().getTargetType(),
      source: record.getSource().getValue(),
      timestamp: record.getTimestamp().getValue(),
      contextMetadata: sanitizedContext,
      complianceMetadata: record.getComplianceMetadata()?.getRegulatoryTags() || null,
      correlationReference: record.getCorrelationReference()?.getValue() || null,
      traceReference: record.getTraceReference()?.getValue() || null,
      chainReference: record.getChainReference()?.getPreviousReference().getValue() || null,
      retentionPeriodInDays: record.getRetentionMetadata()?.getRetentionPeriodInDays() ?? null,
      retentionExpiresAt: record.getRetentionMetadata()?.getExpiresAt() ?? null,
      lifecycleState: record.getLifecycleState(),
    };

    try {
      await client.auditRecord.create({ data });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new Error('AUDIT_APPEND_ONLY_DUPLICATE');
      throw error;
    }
  }

  async listRecentImportOperations(limit = 20): Promise<Array<{
    id: string;
    actorId: string;
    action: string;
    severity: string;
    targetId: string;
    timestamp: Date;
    method?: string;
    path?: string;
    httpStatus?: number;
    result: 'SUCCESS' | 'FAILURE';
  }>> {
    const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit || 20)));
    const rows = await (this.prisma as any).auditRecord.findMany({
      where: {
        category: 'CRITICAL_MUTATION',
        action: 'MUTATION_OUTCOME_RECORDED',
      },
      orderBy: { timestamp: 'desc' },
      take: Math.max(50, safeLimit * 10),
    });

    return rows
      .map((row: any) => {
        const context = row?.contextMetadata && typeof row.contextMetadata === 'object' ? row.contextMetadata : {};
        const requestedPath = String(context.requestedPath ?? context.path ?? '');
        const httpStatus = Number(context.httpStatus ?? context.statusCode ?? 0);
        return { row, context, requestedPath, httpStatus };
      })
      .filter(({ requestedPath }: any) => requestedPath.includes('/admin/imports'))
      .slice(0, safeLimit)
      .map(({ row, context, requestedPath, httpStatus }: any) => ({
        id: String(row.id),
        actorId: String(row.actorId ?? 'SYSTEM'),
        action: String(context.operation ?? context.action ?? row.action ?? 'IMPORT_OPERATION'),
        severity: String(row.severity ?? 'INFO'),
        targetId: String(row.targetId ?? ''),
        timestamp: new Date(row.timestamp),
        method: context.requestedMethod ? String(context.requestedMethod) : undefined,
        path: requestedPath || undefined,
        httpStatus: Number.isFinite(httpStatus) && httpStatus > 0 ? httpStatus : undefined,
        result: Number.isFinite(httpStatus) && httpStatus >= 400 ? 'FAILURE' : 'SUCCESS',
      }));
  }

  async queryPage(input: AuditRecordPageQuery): Promise<AuditRecordPage> {
    const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 50)));
    const where: any = {
      ...(input.subjectIdentityId
        ? {
            AND: [
              {
                OR: [
                  { targetId: { in: [input.subjectIdentityId, ...(input.subjectRoleIds ?? [])] } },
                  { contextMetadata: { path: ['identityId'], equals: input.subjectIdentityId } },
                  { contextMetadata: { path: ['principalId'], equals: input.subjectIdentityId } },
                ],
              },
            ],
          }
        : {}),
      ...(input.actorId ? { actorId: input.actorId } : {}),
      ...(input.targetId ? { targetId: input.targetId } : {}),
      ...(input.action ? { action: input.action } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.severity ? { severity: input.severity } : {}),
      ...(input.reference ? { reference: input.reference } : {}),
      ...(input.traceId ? { traceReference: input.traceId } : {}),
      ...(input.actorType ? { actorType: input.actorType } : {}),
      ...(input.targetType ? { targetType: input.targetType } : {}),
      ...(input.source ? { source: input.source } : {}),
      ...(input.lifecycleState ? { lifecycleState: input.lifecycleState } : {}),
      ...(input.complianceTag ? { complianceMetadata: { array_contains: [input.complianceTag] } } : {}),
      ...(input.correlationId ? { correlationReference: input.correlationId } : {}),
      ...(input.from || input.until ? { timestamp: { ...(input.from ? { gte: input.from } : {}), ...(input.until ? { lte: input.until } : {}) } } : {}),
      ...(input.cursor ? { OR: [
        { timestamp: { lt: input.cursor.timestamp } },
        { timestamp: input.cursor.timestamp, id: { lt: input.cursor.id } },
      ] } : {}),
    };
    const conditions = [...(where.AND ?? [])];
    if (input.method) conditions.push({ contextMetadata: { path: ['method'], equals: input.method } });
    if (input.path) conditions.push({ contextMetadata: { path: ['path'], equals: input.path } });
    const intent = { OR: [
      { action: 'MUTATION_INTENT_RECORDED' },
      { contextMetadata: { path: ['auditEvent'], equals: 'MUTATION_INTENT' } },
    ] };
    // Include absent JSON auditEvent explicitly; JSON null must not accidentally
    // exclude older business records from non-intent searches.
    const nonIntent = { AND: [
      { action: { not: 'MUTATION_INTENT_RECORDED' } },
      { OR: [
        { contextMetadata: { path: ['auditEvent'], equals: Prisma.AnyNull } },
        { contextMetadata: { path: ['auditEvent'], not: 'MUTATION_INTENT' } },
      ] },
    ] };
    if (input.result === 'INTENT') conditions.push(intent);
    else if (input.result) {
      conditions.push(nonIntent);
      conditions.push(input.result === 'UNKNOWN' ? { OR: [
        { contextMetadata: { path: ['result'], equals: Prisma.AnyNull } },
        { AND: [
          { contextMetadata: { path: ['result'], not: 'SUCCESS' } },
          { contextMetadata: { path: ['result'], not: 'FAILURE' } },
        ] },
      ] } : { contextMetadata: { path: ['result'], equals: input.result } });
    }
    if (conditions.length) where.AND = conditions;
    const rows = await (this.prisma as any).auditRecord.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const selected = rows.slice(0, limit);
    const items = selected.map((row: AuditRecordRow) => this.mapToDomain(row));
    const last = selected.at(-1);
    return { items, hasMore, nextCursor: hasMore && last ? { timestamp: new Date(last.timestamp), id: String(last.id) } : null };
  }

  async findByIdOrReference(id: string): Promise<AuditRecord | null> {
    const row =
      (await this.client.auditRecord.findUnique({ where: { id } })) ??
      (await this.client.auditRecord.findUnique({ where: { reference: id } }));
    return row ? this.mapToDomain(row) : null;
  }

  async verifyIntegrity(input: AuditIntegrityQuery = {}): Promise<AuditIntegrityReport> {
    const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 100)));
    const rows = await this.prisma.auditRecord.findMany({
      where: {
        ...(input.from || input.until ? { timestamp: {
          ...(input.from ? { gte: input.from } : {}),
          ...(input.until ? { lte: input.until } : {}),
        } } : {}),
        ...(input.cursor ? { OR: [
          { timestamp: { lt: input.cursor.timestamp } },
          { timestamp: input.cursor.timestamp, id: { lt: input.cursor.id } },
        ] } : {}),
      },
      select: { id: true, reference: true, chainReference: true, timestamp: true },
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const selected = rows.slice(0, limit);
    // Resolve only references needed by this bounded page, including predecessors
    // outside the selected date window. Never load the complete ledger.
    const required = [...new Set(selected.flatMap(row => row.chainReference ? [row.chainReference] : []))];
    const predecessors = required.length ? await this.prisma.auditRecord.findMany({
      where: { reference: { in: required } },
      select: { reference: true, timestamp: true },
      take: limit,
    }) : [];
    const references = new Map(predecessors.map(row => [row.reference, row.timestamp]));
    const checkedAt = new Date();
    const brokenChainReferences: string[] = [];
    const futureTimestamps: string[] = [];
    for (const row of selected) {
      if (row.timestamp.getTime() > checkedAt.getTime() + 5 * 60_000) futureTimestamps.push(row.reference);
      if (row.chainReference) {
        const previous = references.get(row.chainReference);
        if (row.chainReference === row.reference || !previous || previous > row.timestamp) brokenChainReferences.push(row.reference);
      }
    }
    const last = selected.at(-1);
    const hasMore = rows.length > limit;
    return {
      status: brokenChainReferences.length === 0 && futureTimestamps.length === 0 ? 'PASS' : 'FAIL',
      checkedRecords: selected.length, brokenChainReferences, futureTimestamps,
      scope: 'REFERENCE_LINKAGE_AND_TIMESTAMPS', cryptographicVerification: false,
      checkedAt: checkedAt.toISOString(), maxRecords: limit, hasMore,
      nextCursor: hasMore && last ? { timestamp: last.timestamp, id: last.id } : null,
      range: { from: last?.timestamp ?? null, until: selected[0]?.timestamp ?? null },
    };
  }

  async findBy(specification: ISpecification<AuditRecord>): Promise<AuditRecord[]> {
    const criteria = (specification as any)?.criteria;
    const where: any = {};

    if (criteria) {
      if (criteria.actorId) where.actorId = criteria.actorId;
      if (criteria.targetId) where.targetId = criteria.targetId;
      if (criteria.action) where.action = criteria.action;
      if (criteria.category) where.category = criteria.category;
      if (criteria.severity) where.severity = criteria.severity;
      if (criteria.correlationId) where.correlationReference = criteria.correlationId;
    }

    const rows = await this.client.auditRecord.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
    });

    const domainRecords = rows.map(row => this.mapToDomain(row));
    return domainRecords.filter(record => specification.isSatisfiedBy(record));
  }
}

import { ISpecification } from '@manaratak/core';
import { IAuditRecordRepository, AuditRecord, ContextMetadata, AuditRecordPageQuery, AuditRecordPage, AuditIntegrityReport } from '@manaratak/domain';
import { AuditSecretSanitizer } from './AuditSecretSanitizer';

export class InMemoryAuditRecordRepository implements IAuditRecordRepository {
  private readonly records: Map<string, AuditRecord> = new Map();

  async save(record: AuditRecord): Promise<void> {
    const id = record.getId().getValue();
    const reference = record.getReference().getValue();
    if (this.records.has(id) || Array.from(this.records.values()).some(existing => existing.getReference().getValue() === reference)) {
      throw new Error('AUDIT_APPEND_ONLY_DUPLICATE');
    }
    const sanitizedData = AuditSecretSanitizer.sanitize(record.getContextMetadata().getData());
    const sanitizedContext = ContextMetadata.create(sanitizedData);

    const sanitizedRecord = AuditRecord.create(
      record.getId(),
      record.getReference(),
      record.getAction(),
      record.getCategory(),
      record.getSeverity(),
      record.getActor(),
      record.getTarget(),
      record.getSource(),
      record.getTimestamp(),
      sanitizedContext,
      record.getComplianceMetadata(),
      record.getCorrelationReference(),
      record.getTraceReference(),
      record.getChainReference(),
      record.getRetentionMetadata()
    );

    if (record.getLifecycleState() === 'ARCHIVED') {
      sanitizedRecord.archive();
    }
    sanitizedRecord.clearEvents();

    this.records.set(id, sanitizedRecord);
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
    return Array.from(this.records.values())
      .map((record) => {
        const context = record.getContextMetadata().getData() as Record<string, unknown>;
        const requestedPath = String(context.requestedPath ?? context.path ?? '');
        const httpStatus = Number(context.httpStatus ?? context.statusCode ?? 0);
        return { record, context, requestedPath, httpStatus };
      })
      .filter(({ record, requestedPath }) =>
        record.getCategory().getValue() === 'CRITICAL_MUTATION' &&
        record.getAction().getValue() === 'MUTATION_OUTCOME_RECORDED' &&
        requestedPath.includes('/admin/imports'))
      .sort((a, b) => b.record.getTimestamp().getValue().getTime() - a.record.getTimestamp().getValue().getTime())
      .slice(0, safeLimit)
      .map(({ record, context, requestedPath, httpStatus }) => ({
        id: record.getId().getValue(),
        actorId: record.getActor().getActorId(),
        action: String(context.operation ?? context.action ?? record.getAction().getValue()),
        severity: record.getSeverity().getValue(),
        targetId: record.getTarget().getTargetId(),
        timestamp: record.getTimestamp().getValue(),
        method: context.requestedMethod ? String(context.requestedMethod) : undefined,
        path: requestedPath || undefined,
        httpStatus: Number.isFinite(httpStatus) && httpStatus > 0 ? httpStatus : undefined,
        result: Number.isFinite(httpStatus) && httpStatus >= 400 ? 'FAILURE' : 'SUCCESS',
      }));
  }

  async queryPage(input: AuditRecordPageQuery): Promise<AuditRecordPage> {
    const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 50)));
    let rows = [...this.records.values()].filter(record => {
      const timestamp = record.getTimestamp().getValue();
      if (input.actorId && record.getActor().getActorId() !== input.actorId) return false;
      if (input.targetId && record.getTarget().getTargetId() !== input.targetId) return false;
      if (input.action && record.getAction().getValue() !== input.action) return false;
      if (input.category && record.getCategory().getValue() !== input.category) return false;
      if (input.severity && record.getSeverity().getValue() !== input.severity) return false;
      if (input.correlationId && record.getCorrelationReference()?.getValue() !== input.correlationId) return false;
      if (input.cursor && !(timestamp < input.cursor.timestamp || (timestamp.getTime() === input.cursor.timestamp.getTime() && record.getId().getValue() < input.cursor.id))) return false;
      return true;
    });
    rows.sort((a,b) => b.getTimestamp().getValue().getTime() - a.getTimestamp().getValue().getTime() || b.getId().getValue().localeCompare(a.getId().getValue()));
    const hasMore = rows.length > limit; rows = rows.slice(0, limit); const last = rows.at(-1);
    return { items: rows, hasMore, nextCursor: hasMore && last ? { timestamp: last.getTimestamp().getValue(), id: last.getId().getValue() } : null };
  }

  async verifyIntegrity(): Promise<AuditIntegrityReport> {
    const rows = [...this.records.values()];
    const references = new Map(rows.map(row => [row.getReference().getValue(), row.getTimestamp().getValue()]));
    const brokenChainReferences: string[] = []; const futureTimestamps: string[] = []; const now = Date.now() + 5 * 60_000;
    for (const row of rows) {
      const timestamp = row.getTimestamp().getValue(); if (timestamp.getTime() > now) futureTimestamps.push(row.getReference().getValue());
      const chain = row.getChainReference()?.getPreviousReference().getValue(); if (chain) { const previous = references.get(chain); if (!previous || previous.getTime() > timestamp.getTime()) brokenChainReferences.push(row.getReference().getValue()); }
    }
    return { status: brokenChainReferences.length === 0 && futureTimestamps.length === 0 ? 'PASS' : 'FAIL', checkedRecords: rows.length, brokenChainReferences, futureTimestamps };
  }

  async findBy(specification: ISpecification<AuditRecord>): Promise<AuditRecord[]> {
    const allRecords = Array.from(this.records.values());
    return allRecords.filter(record => specification.isSatisfiedBy(record));
  }
}

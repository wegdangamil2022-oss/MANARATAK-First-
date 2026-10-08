import { ISpecification } from '@manaratak/core';
import { IAuditRecordRepository, AuditRecord, ContextMetadata, AuditRecordPageQuery, AuditRecordPage, AuditIntegrityReport, AuditIntegrityQuery } from '@manaratak/domain';
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
    let rows = [...this.records.values()].filter((record) => {
      const timestamp = record.getTimestamp().getValue();
      if (input.subjectIdentityId) {
        const metadata = record.getContextMetadata().getData();
        if (
          ![input.subjectIdentityId, ...(input.subjectRoleIds ?? [])].includes(
            record.getTarget().getTargetId(),
          ) &&
          metadata.identityId !== input.subjectIdentityId &&
          metadata.principalId !== input.subjectIdentityId
        )
          return false;
      }
      if (input.actorId && record.getActor().getActorId() !== input.actorId) return false;
      if (input.targetId && record.getTarget().getTargetId() !== input.targetId) return false;
      if (input.action && record.getAction().getValue() !== input.action) return false;
      if (input.category && record.getCategory().getValue() !== input.category) return false;
      if (input.severity && record.getSeverity().getValue() !== input.severity) return false;
      if (input.correlationId && record.getCorrelationReference()?.getValue() !== input.correlationId) return false;
      const metadata = record.getContextMetadata().getData();
      if (input.reference && record.getReference().getValue() !== input.reference) return false;
      if (input.traceId && record.getTraceReference()?.getValue() !== input.traceId) return false;
      if (input.actorType && record.getActor().getActorType() !== input.actorType) return false;
      if (input.targetType && record.getTarget().getTargetType() !== input.targetType) return false;
      if (input.source && record.getSource().getValue() !== input.source) return false;
      if (input.lifecycleState && record.getLifecycleState() !== input.lifecycleState) return false;
      if (input.complianceTag && !record.getComplianceMetadata()?.getRegulatoryTags().includes(input.complianceTag)) return false;
      if (input.method && metadata.method !== input.method) return false;
      if (input.path && metadata.path !== input.path) return false;
      const isIntent = record.getAction().getValue() === 'MUTATION_INTENT_RECORDED' || metadata.auditEvent === 'MUTATION_INTENT';
      const result = isIntent ? 'INTENT' : metadata.result === 'SUCCESS' || metadata.result === 'FAILURE' ? metadata.result : 'UNKNOWN';
      if (input.result && result !== input.result) return false;
      if (input.from && timestamp < input.from) return false;
      if (input.until && timestamp > input.until) return false;
      if (input.cursor && !(timestamp < input.cursor.timestamp || (timestamp.getTime() === input.cursor.timestamp.getTime() && record.getId().getValue() < input.cursor.id))) return false;
      return true;
    });
    rows.sort((a,b) => b.getTimestamp().getValue().getTime() - a.getTimestamp().getValue().getTime() || b.getId().getValue().localeCompare(a.getId().getValue()));
    const hasMore = rows.length > limit;
    rows = rows.slice(0, limit);
    const last = rows.at(-1);
    return { items: rows, hasMore, nextCursor: hasMore && last ? { timestamp: last.getTimestamp().getValue(), id: last.getId().getValue() } : null };
  }

  async findByIdOrReference(id: string): Promise<AuditRecord | null> {
    return (
      this.records.get(id) ?? [...this.records.values()].find(record => record.getReference().getValue() === id) ?? null
    );
  }

  async verifyIntegrity(input: AuditIntegrityQuery = {}): Promise<AuditIntegrityReport> {
    const limit = Math.min(500, Math.max(1, Math.trunc(input.limit ?? 100)));
    const page = await this.queryPage({ ...input, limit: Math.min(limit, 100) });
    const references = new Map([...this.records.values()].map(row => [row.getReference().getValue(), row.getTimestamp().getValue()]));
    const brokenChainReferences: string[] = [];
    const futureTimestamps: string[] = [];
    const checkedAt = new Date();
    for (const row of page.items) {
      const reference = row.getReference().getValue();
      const timestamp = row.getTimestamp().getValue();
      if (timestamp.getTime() > checkedAt.getTime() + 5 * 60_000) futureTimestamps.push(reference);
      const chain = row.getChainReference()?.getPreviousReference().getValue();
      if (chain) {
        const previous = references.get(chain);
        if (chain === reference || !previous || previous > timestamp) brokenChainReferences.push(reference);
      }
    }
    return {
      status: brokenChainReferences.length === 0 && futureTimestamps.length === 0 ? 'PASS' : 'FAIL',
      checkedRecords: page.items.length, brokenChainReferences, futureTimestamps,
      scope: 'REFERENCE_LINKAGE_AND_TIMESTAMPS', cryptographicVerification: false,
      checkedAt: checkedAt.toISOString(), maxRecords: Math.min(limit, 100),
      hasMore: page.hasMore, nextCursor: page.nextCursor,
      range: { from: page.items.at(-1)?.getTimestamp().getValue() ?? null, until: page.items[0]?.getTimestamp().getValue() ?? null },
    };
  }

  async findBy(specification: ISpecification<AuditRecord>): Promise<AuditRecord[]> {
    const allRecords = Array.from(this.records.values());
    return allRecords.filter(record => specification.isSatisfiedBy(record));
  }
}

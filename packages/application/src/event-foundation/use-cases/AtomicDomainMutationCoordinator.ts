import { randomUUID } from 'crypto';
import { AtomicPersistenceContext, OutboxProcessingState } from '@manaratak/domain';
import { AtomicAuditedOutboxMutationExecutor } from './AtomicAuditedOutboxMutationExecutor';

export interface AtomicMutationRequestContext {
  actorId: string;
  actorType?: string;
  correlationId?: string;
  source?: string;
}

export interface AtomicDomainMutationDefinition {
  domain: string;
  aggregateType: string;
  aggregateId: string;
  action: string;
  context?: AtomicMutationRequestContext;
  outbox?: {
    id?: string;
    eventType?: string;
    payload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
}

export class AtomicDomainMutationCoordinator {
  public constructor(private readonly executor: AtomicAuditedOutboxMutationExecutor) {}

  public execute<T>(definition: AtomicDomainMutationDefinition, mutation: (context: AtomicPersistenceContext) => Promise<T>): Promise<T> {
    const now = new Date();
    const auditId = randomUUID();
    const outboxId = definition.outbox?.id ?? randomUUID();
    const actorId = definition.context?.actorId || 'SYSTEM';
    const source = definition.context?.source || 'admin-api';
    const correlationId = definition.context?.correlationId;

    return this.executor.execute({
      id: auditId,
      reference: `AUD-${auditId}`,
      action: definition.action,
      category: `${definition.domain}_MUTATION`,
      severity: 'INFO',
      actorId,
      actorType: definition.context?.actorType || 'IDENTITY',
      targetId: definition.aggregateId,
      targetType: definition.aggregateType,
      source,
      timestamp: now,
      contextMetadata: { result: 'SUCCESS', atomicity: 'BUSINESS_AUDIT_OUTBOX' },
      correlationReference: correlationId,
    }, {
      id: outboxId,
      eventType: definition.outbox?.eventType ?? definition.action,
      domain: definition.domain,
      aggregate: { domain: definition.domain, aggregateType: definition.aggregateType, aggregateId: definition.aggregateId },
      payload: definition.outbox?.payload ?? { entityType: definition.aggregateType, entityId: definition.aggregateId, operation: definition.action },
      metadata: { actorId, atomicity: 'BUSINESS_AUDIT_OUTBOX', ...(definition.outbox?.metadata ?? {}) },
      correlationId,
      createdAt: now,
      availableAt: now,
      state: OutboxProcessingState.PENDING,
      attempts: 0,
    }, mutation);
  }
}

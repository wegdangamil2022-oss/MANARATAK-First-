import { ISpecification } from '@manaratak/core';
import { AuditRecord } from '../aggregates/AuditRecord';

export class AuditRecordQuerySpecification implements ISpecification<AuditRecord> {
  constructor(
    private readonly criteria: {
      actorId?: string;
      targetId?: string;
      action?: string;
      category?: string;
      severity?: string;
      correlationId?: string;
    }
  ) {}

  public isSatisfiedBy(candidate: AuditRecord): boolean {
    if (this.criteria.actorId && candidate.getActor().getActorId() !== this.criteria.actorId) {
      return false;
    }
    if (this.criteria.targetId && candidate.getTarget().getTargetId() !== this.criteria.targetId) {
      return false;
    }
    if (this.criteria.action && candidate.getAction().getValue() !== this.criteria.action) {
      return false;
    }
    if (this.criteria.category && candidate.getCategory().getValue() !== this.criteria.category) {
      return false;
    }
    if (this.criteria.severity && candidate.getSeverity().getValue() !== this.criteria.severity) {
      return false;
    }
    if (this.criteria.correlationId && 
        (!candidate.getCorrelationReference() || candidate.getCorrelationReference()?.getValue() !== this.criteria.correlationId)) {
      return false;
    }
    return true;
  }
}

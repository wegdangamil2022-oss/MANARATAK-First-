import { AuditId } from '../value-objects/AuditId';
import { AuditReference } from '../value-objects/AuditReference';
import { AuditChainReference } from '../value-objects/AuditChainReference';
import { AuditAction } from '../value-objects/AuditAction';
import { AuditCategory } from '../value-objects/AuditCategory';
import { AuditSeverity } from '../value-objects/AuditSeverity';
import { ActorReference } from '../value-objects/ActorReference';
import { TargetReference } from '../value-objects/TargetReference';
import { SourceReference } from '../value-objects/SourceReference';
import { CorrelationReference } from '../value-objects/CorrelationReference';
import { TraceReference } from '../value-objects/TraceReference';
import { AuditTimestamp } from '../value-objects/AuditTimestamp';
import { ContextMetadata } from '../value-objects/ContextMetadata';
import { AuditRetentionMetadata } from '../value-objects/AuditRetentionMetadata';
import { ComplianceMetadata } from '../value-objects/ComplianceMetadata';
import { AuditLifecycleState } from '../enums/AuditLifecycleState';
import { AuditRecordCreatedEvent } from '../events/AuditRecordCreatedEvent';
import { AuditRetentionAssignedEvent } from '../events/AuditRetentionAssignedEvent';
import { AuditArchivedEvent } from '../events/AuditArchivedEvent';

export class AuditRecord {
  private lifecycleState: AuditLifecycleState;
  private retentionMetadata?: AuditRetentionMetadata;
  private readonly events: any[] = [];

  private constructor(
    private readonly id: AuditId,
    private readonly reference: AuditReference,
    private readonly action: AuditAction,
    private readonly category: AuditCategory,
    private readonly severity: AuditSeverity,
    private readonly actor: ActorReference,
    private readonly target: TargetReference,
    private readonly source: SourceReference,
    private readonly timestamp: AuditTimestamp,
    private readonly contextMetadata: ContextMetadata,
    private readonly complianceMetadata?: ComplianceMetadata,
    private readonly correlationReference?: CorrelationReference,
    private readonly traceReference?: TraceReference,
    private readonly chainReference?: AuditChainReference
  ) {
    this.lifecycleState = AuditLifecycleState.RECORDED;
  }

  public static create(
    id: AuditId,
    reference: AuditReference,
    action: AuditAction,
    category: AuditCategory,
    severity: AuditSeverity,
    actor: ActorReference,
    target: TargetReference,
    source: SourceReference,
    timestamp: AuditTimestamp,
    contextMetadata: ContextMetadata,
    complianceMetadata?: ComplianceMetadata,
    correlationReference?: CorrelationReference,
    traceReference?: TraceReference,
    chainReference?: AuditChainReference,
    retentionMetadata?: AuditRetentionMetadata
  ): AuditRecord {
    const record = new AuditRecord(
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
      chainReference
    );

    record.addEvent(new AuditRecordCreatedEvent(id, reference));

    if (retentionMetadata) {
      record.assignRetention(retentionMetadata);
    }

    return record;
  }

  public getId(): AuditId {
    return this.id;
  }

  public getReference(): AuditReference {
    return this.reference;
  }

  public getAction(): AuditAction {
    return this.action;
  }

  public getCategory(): AuditCategory {
    return this.category;
  }

  public getSeverity(): AuditSeverity {
    return this.severity;
  }

  public getActor(): ActorReference {
    return this.actor;
  }

  public getTarget(): TargetReference {
    return this.target;
  }

  public getSource(): SourceReference {
    return this.source;
  }

  public getTimestamp(): AuditTimestamp {
    return this.timestamp;
  }

  public getContextMetadata(): ContextMetadata {
    return this.contextMetadata;
  }

  public getComplianceMetadata(): ComplianceMetadata | undefined {
    return this.complianceMetadata;
  }

  public getCorrelationReference(): CorrelationReference | undefined {
    return this.correlationReference;
  }

  public getTraceReference(): TraceReference | undefined {
    return this.traceReference;
  }

  public getChainReference(): AuditChainReference | undefined {
    return this.chainReference;
  }

  public getLifecycleState(): AuditLifecycleState {
    return this.lifecycleState;
  }

  public getRetentionMetadata(): AuditRetentionMetadata | undefined {
    return this.retentionMetadata;
  }

  public assignRetention(retention: AuditRetentionMetadata): void {
    this.retentionMetadata = retention;
    this.addEvent(new AuditRetentionAssignedEvent(this.id, retention));
  }

  public archive(): void {
    if (this.lifecycleState === AuditLifecycleState.ARCHIVED) {
      return;
    }
    this.lifecycleState = AuditLifecycleState.ARCHIVED;
    this.addEvent(new AuditArchivedEvent(this.id));
  }

  private addEvent(event: any): void {
    this.events.push(event);
  }

  public getEvents(): any[] {
    return [...this.events];
  }

  public clearEvents(): void {
    this.events.length = 0;
  }
}

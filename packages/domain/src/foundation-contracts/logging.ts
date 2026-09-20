import { DomainSpecification, GeneratedId, ReferenceSpecification, SemanticVersion, StringMetadata, StringValue, UnknownRecord } from './common';

export type LogSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export const LogSeverity = Object.freeze({ DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', CRITICAL: 'CRITICAL' } as const);

export enum LogLifecycleState { CREATED='CREATED', ACTIVATED='ACTIVATED', DEPRECATED='DEPRECATED', ARCHIVED='ARCHIVED' }
export class LogEntryId extends GeneratedId { constructor(value?: string) { super(value, 'log-entry'); } }
export class LogReference extends StringValue { constructor(value: string) { super(value, 'Log reference'); } }
export class LogOwnerReference extends StringValue { constructor(value: string) { super(value, 'Log owner reference'); } }

export class LogDefinition {
  private readonly requiredFields: readonly string[];
  constructor(private readonly messageTemplate: string, requiredFields: readonly string[], private readonly structuralIntent: UnknownRecord) {
    if (!messageTemplate.trim()) throw new Error('Log message template is required');
    this.requiredFields = Object.freeze([...new Set(requiredFields.map(v => v.trim()).filter(Boolean))]);
  }
  getMessageTemplate(): string { return this.messageTemplate; }
  getRequiredFields(): readonly string[] { return this.requiredFields; }
  getStructuralIntent(): UnknownRecord { return this.structuralIntent; }
}

export class LogClassification {
  constructor(private readonly category: string, private readonly severity: LogSeverity) {
    if (!category.trim()) throw new Error('Log category is required');
  }
  getCategory(): string { return this.category; }
  getSeverity(): string { return this.severity; }
}
export class LogVersion {
  private constructor(private readonly version: SemanticVersion) {}
  static initial(): LogVersion { return new LogVersion(SemanticVersion.initial()); }
  nextPatch(): LogVersion { return new LogVersion(this.version.nextPatch()); }
  getValue(): string { return this.version.getValue(); }
}
export class LogMetadata extends StringMetadata {}
export class LoggingIntent {
  constructor(private readonly purpose: string, private readonly criticality: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL') {
    if (!purpose.trim()) throw new Error('Logging purpose is required');
  }
  getPurpose(): string { return this.purpose; }
  getCriticality(): string { return this.criticality; }
}

export class LogEntry {
  private lifecycleState: LogLifecycleState;
  constructor(
    private readonly id: LogEntryId,
    private readonly reference: LogReference,
    private readonly ownerReference: LogOwnerReference,
    private readonly definition: LogDefinition,
    private readonly classification: LogClassification,
    private readonly metadata: LogMetadata,
    private readonly version: LogVersion,
    private readonly intent: LoggingIntent,
    lifecycleState: LogLifecycleState = LogLifecycleState.CREATED,
  ) { this.lifecycleState = lifecycleState; }
  getId(): LogEntryId { return this.id; }
  getReference(): LogReference { return this.reference; }
  getOwnerReference(): LogOwnerReference { return this.ownerReference; }
  getDefinition(): LogDefinition { return this.definition; }
  getClassification(): LogClassification { return this.classification; }
  getMetadata(): LogMetadata { return this.metadata; }
  getVersion(): LogVersion { return this.version; }
  getIntent(): LoggingIntent { return this.intent; }
  getLifecycleState(): LogLifecycleState { return this.lifecycleState; }
  setLifecycleState(state: LogLifecycleState): void { this.lifecycleState = state; }
}

export interface ILogEntryRepository { save(entry: LogEntry): Promise<void>; findBy(specification: DomainSpecification<LogEntry>): Promise<LogEntry[]>; }
export class LogReferenceSpecification extends ReferenceSpecification<LogEntry> { constructor(reference: string) { super(reference); } }
export class LogValidationService { static validateDefinition(definition: LogDefinition): void { if (!definition.getMessageTemplate()) throw new Error('Invalid log definition'); } }
export class LogLifecycleService {
  static transitionTo(entry: LogEntry, state: LogLifecycleState): LogEntry {
    if (entry.getLifecycleState() === LogLifecycleState.ARCHIVED) throw new Error('Archived log entry cannot transition');
    entry.setLifecycleState(state); return entry;
  }
}
export class LogEntryCreatedEvent { constructor(public readonly reference: LogReference) {} }
export class LogEntryActivatedEvent { constructor(public readonly reference: LogReference) {} }
export class LogVersionPublishedEvent { constructor(public readonly reference: LogReference, public readonly version: string) {} }
export class LogEntryDeprecatedEvent { constructor(public readonly reference: LogReference) {} }
export class LogEntryArchivedEvent { constructor(public readonly reference: LogReference) {} }

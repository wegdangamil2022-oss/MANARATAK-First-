import { DomainSpecification, GeneratedId, ReferenceSpecification, SemanticVersion, StringMetadata, StringValue, UnknownRecord } from './common';

export enum MonitorLifecycleState { CREATED='CREATED', ACTIVATED='ACTIVATED', DEPRECATED='DEPRECATED', ARCHIVED='ARCHIVED' }
export type MonitorTarget = Readonly<{ type: string; address: string }>;
export class MonitorId extends GeneratedId { constructor(value?: string) { super(value, 'monitor'); } }
export class MonitorReference extends StringValue { constructor(value: string) { super(value, 'Monitor reference'); } }
export class MonitorOwnerReference extends StringValue { constructor(value: string) { super(value, 'Monitor owner reference'); } }
export class MonitorDefinition {
  private readonly targets: readonly MonitorTarget[];
  constructor(targets: readonly MonitorTarget[], private readonly frequencySeconds: number, private readonly requirements: UnknownRecord) {
    if (targets.length === 0) throw new Error('Monitor targets are required');
    if (!Number.isFinite(frequencySeconds) || frequencySeconds <= 0) throw new Error('Monitor frequency must be positive');
    this.targets = Object.freeze(targets.map(t => Object.freeze({ type: t.type.trim(), address: t.address.trim() })));
  }
  getTargets(): readonly MonitorTarget[] { return this.targets; }
  getFrequencySeconds(): number { return this.frequencySeconds; }
  getRequirements(): UnknownRecord { return this.requirements; }
}
export class MonitorStateDefinition {
  private readonly states: readonly string[];
  constructor(states: readonly string[]) { this.states = Object.freeze([...new Set(states.map(v => v.trim()).filter(Boolean))]); if (!this.states.length) throw new Error('Monitor states are required'); }
  getStates(): readonly string[] { return this.states; }
}
export class MonitorVersion {
  private constructor(private readonly version: SemanticVersion) {}
  static initial(): MonitorVersion { return new MonitorVersion(SemanticVersion.initial()); }
  nextPatch(): MonitorVersion { return new MonitorVersion(this.version.nextPatch()); }
  getValue(): string { return this.version.getValue(); }
}
export class MonitorMetadata extends StringMetadata {}
export class MonitoringIntent {
  constructor(private readonly purpose: string, private readonly criticality: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL') { if (!purpose.trim()) throw new Error('Monitoring purpose is required'); }
  getPurpose(): string { return this.purpose; }
  getCriticality(): string { return this.criticality; }
}
export class Monitor {
  private lifecycleState: MonitorLifecycleState;
  constructor(
    private readonly id: MonitorId,
    private readonly reference: MonitorReference,
    private readonly ownerReference: MonitorOwnerReference,
    private readonly definition: MonitorDefinition,
    private readonly stateDefinition: MonitorStateDefinition,
    private readonly metadata: MonitorMetadata,
    private readonly version: MonitorVersion,
    private readonly intent: MonitoringIntent,
    lifecycleState: MonitorLifecycleState = MonitorLifecycleState.CREATED,
  ) { this.lifecycleState = lifecycleState; }
  getId(): MonitorId { return this.id; } getReference(): MonitorReference { return this.reference; } getOwnerReference(): MonitorOwnerReference { return this.ownerReference; }
  getDefinition(): MonitorDefinition { return this.definition; } getStateDefinition(): MonitorStateDefinition { return this.stateDefinition; } getMetadata(): MonitorMetadata { return this.metadata; }
  getVersion(): MonitorVersion { return this.version; } getIntent(): MonitoringIntent { return this.intent; } getLifecycleState(): MonitorLifecycleState { return this.lifecycleState; }
  setLifecycleState(state: MonitorLifecycleState): void { this.lifecycleState = state; }
}
export interface IMonitorRepository { save(monitor: Monitor): Promise<void>; findBy(specification: DomainSpecification<Monitor>): Promise<Monitor[]>; }
export class MonitorReferenceSpecification extends ReferenceSpecification<Monitor> { constructor(reference: string) { super(reference); } }
export class MonitorValidationService { static validateDefinition(definition: MonitorDefinition): void { if (!definition.getTargets().length || definition.getFrequencySeconds() <= 0) throw new Error('Invalid monitor definition'); } }
export class MonitorLifecycleService { static transitionTo(monitor: Monitor, state: MonitorLifecycleState): Monitor { if (monitor.getLifecycleState() === MonitorLifecycleState.ARCHIVED) throw new Error('Archived monitor cannot transition'); monitor.setLifecycleState(state); return monitor; } }
export class MonitorCreatedEvent { constructor(public readonly reference: MonitorReference) {} }
export class MonitorActivatedEvent { constructor(public readonly reference: MonitorReference) {} }
export class MonitorStateChangedEvent { constructor(public readonly reference: MonitorReference, public readonly stateOrVersion: string) {} }
export class MonitorDeprecatedEvent { constructor(public readonly reference: MonitorReference) {} }
export class MonitorArchivedEvent { constructor(public readonly reference: MonitorReference) {} }

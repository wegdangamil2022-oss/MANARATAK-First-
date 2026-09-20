import { DomainSpecification, GeneratedId, ReferenceSpecification, SemanticVersion, StringMetadata, StringValue } from './common';

export type IntegrationScopeType = 'INTERNAL' | 'EXTERNAL' | 'PARTNER' | 'SYSTEM';
export const IntegrationScopeType = Object.freeze({ INTERNAL: 'INTERNAL', EXTERNAL: 'EXTERNAL', PARTNER: 'PARTNER', SYSTEM: 'SYSTEM' } as const);
export type IntegrationCategory = 'API' | 'EVENT' | 'FILE' | 'DATA' | 'OTHER';
export const IntegrationCategory = Object.freeze({ API: 'API', EVENT: 'EVENT', FILE: 'FILE', DATA: 'DATA', OTHER: 'OTHER' } as const);

export enum IntegrationLifecycleState {
  CREATED = 'CREATED',
  ACTIVATED = 'ACTIVATED',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

export class IntegrationId extends GeneratedId { constructor(value?: string) { super(value, 'integration'); } }
export class IntegrationReference extends StringValue { constructor(value: string) { super(value, 'Integration reference'); } }
export class IntegrationOwnerReference extends StringValue { constructor(value: string) { super(value, 'Integration owner reference'); } }

export class IntegrationDefinition {
  constructor(private readonly purpose: string, private readonly scope: string) {
    if (!purpose.trim() || !scope.trim()) throw new Error('Integration purpose and scope are required');
  }
  getPurpose(): string { return this.purpose; }
  getScope(): string { return this.scope; }
}

export class IntegrationCapabilityDefinition {
  private readonly capabilities: readonly string[];
  constructor(capabilities: readonly string[]) {
    const normalized = capabilities.map(value => value.trim()).filter(Boolean);
    if (normalized.length === 0) throw new Error('At least one integration capability is required');
    this.capabilities = Object.freeze([...new Set(normalized)]);
  }
  getCapabilities(): string[] { return [...this.capabilities]; }
}

export class IntegrationClassification {
  constructor(private readonly type: IntegrationScopeType, private readonly category: IntegrationCategory) {}
  getType(): string { return this.type; }
  getCategory(): string { return this.category; }
}

export class IntegrationVersion {
  private constructor(private readonly version: SemanticVersion) {}
  static initial(): IntegrationVersion { return new IntegrationVersion(SemanticVersion.initial()); }
  nextPatch(): IntegrationVersion { return new IntegrationVersion(this.version.nextPatch()); }
  getValue(): string { return this.version.getValue(); }
}

export class IntegrationMetadata extends StringMetadata {}
export class IntegrationIntent {
  constructor(private readonly goal: string, private readonly businessJustification: string) {
    if (!goal.trim() || !businessJustification.trim()) throw new Error('Integration intent requires goal and business justification');
  }
  getGoal(): string { return this.goal; }
  getBusinessJustification(): string { return this.businessJustification; }
}

export class Integration {
  private lifecycleState: IntegrationLifecycleState;
  constructor(
    private readonly id: IntegrationId,
    private readonly reference: IntegrationReference,
    private readonly ownerReference: IntegrationOwnerReference,
    private readonly definition: IntegrationDefinition,
    private readonly capabilityDefinition: IntegrationCapabilityDefinition,
    private readonly classification: IntegrationClassification,
    private readonly metadata: IntegrationMetadata,
    private readonly version: IntegrationVersion,
    private readonly intent: IntegrationIntent,
    lifecycleState: IntegrationLifecycleState = IntegrationLifecycleState.CREATED,
  ) { this.lifecycleState = lifecycleState; }
  getId(): IntegrationId { return this.id; }
  getReference(): IntegrationReference { return this.reference; }
  getOwnerReference(): IntegrationOwnerReference { return this.ownerReference; }
  getDefinition(): IntegrationDefinition { return this.definition; }
  getCapabilityDefinition(): IntegrationCapabilityDefinition { return this.capabilityDefinition; }
  getClassification(): IntegrationClassification { return this.classification; }
  getMetadata(): IntegrationMetadata { return this.metadata; }
  getVersion(): IntegrationVersion { return this.version; }
  getIntent(): IntegrationIntent { return this.intent; }
  getLifecycleState(): IntegrationLifecycleState { return this.lifecycleState; }
  setLifecycleState(state: IntegrationLifecycleState): void { this.lifecycleState = state; }
}

export interface IIntegrationRepository {
  save(integration: Integration): Promise<void>;
  findBy(specification: DomainSpecification<Integration>): Promise<Integration[]>;
}

export class IntegrationReferenceSpecification extends ReferenceSpecification<Integration> {
  constructor(reference: string) { super(reference); }
}

export class IntegrationFoundationValidationService {
  static validate(definition: IntegrationDefinition, capabilities: IntegrationCapabilityDefinition): void {
    if (!definition.getPurpose() || capabilities.getCapabilities().length === 0) throw new Error('Invalid integration definition');
  }
}

export class IntegrationFoundationLifecycleService {
  static transitionTo(integration: Integration, state: IntegrationLifecycleState): Integration {
    const current = integration.getLifecycleState();
    if (current === IntegrationLifecycleState.ARCHIVED) throw new Error('Archived integration cannot transition');
    if (current === IntegrationLifecycleState.DEPRECATED && state === IntegrationLifecycleState.ACTIVATED) throw new Error('Deprecated integration cannot be reactivated');
    integration.setLifecycleState(state);
    return integration;
  }
}

export class IntegrationCreatedEvent { constructor(public readonly reference: IntegrationReference) {} }
export class IntegrationActivatedEvent { constructor(public readonly reference: IntegrationReference) {} }
export class IntegrationVersionPublishedEvent { constructor(public readonly reference: IntegrationReference, public readonly version: string) {} }
export class IntegrationDeprecatedEvent { constructor(public readonly reference: IntegrationReference) {} }
export class IntegrationArchivedEvent { constructor(public readonly reference: IntegrationReference) {} }

import { DomainSpecification, GeneratedId, ReferenceSpecification, StringMetadata, StringValue } from './common';

export enum ComponentLifecycleState { CREATED='CREATED', ACTIVATED='ACTIVATED', DEPRECATED='DEPRECATED', ARCHIVED='ARCHIVED' }
export type ComponentProperty = Readonly<{ name: string; type: string; required: boolean }>;
export type ComponentSlot = Readonly<{ name: string; description: string }>;
export class SharedComponentId extends GeneratedId { constructor(value?: string) { super(value, 'shared-component'); } }
export class SharedComponentReference extends StringValue { constructor(value: string) { super(value, 'Shared component reference'); } }
export class SharedComponentOwnerReference extends StringValue { constructor(value: string) { super(value, 'Shared component owner reference'); } }
export class SharedComponentDefinition {
  private readonly properties: readonly ComponentProperty[];
  private readonly slots: readonly ComponentSlot[];
  constructor(properties: readonly ComponentProperty[], slots: readonly ComponentSlot[]) {
    this.properties = Object.freeze(properties.map(p => Object.freeze({ ...p })));
    this.slots = Object.freeze(slots.map(s => Object.freeze({ ...s })));
  }
  getProperties(): ComponentProperty[] { return this.properties.map(p => ({ ...p })); }
  getSlots(): ComponentSlot[] { return this.slots.map(s => ({ ...s })); }
}
export class ComponentVersion {
  constructor(private readonly major: number, private readonly minor: number, private readonly patch: number) {
    if (![major, minor, patch].every(v => Number.isInteger(v) && v >= 0)) throw new Error('Component version must be non-negative');
  }
  getValue(): string { return `${this.major}.${this.minor}.${this.patch}`; }
}
export class SharedComponentCompatibilityMetadata { constructor(private readonly isBackwardCompatible: boolean, private readonly isForwardCompatible: boolean) {} getIsBackwardCompatible(): boolean { return this.isBackwardCompatible; } getIsForwardCompatible(): boolean { return this.isForwardCompatible; } }
export class ComponentMetadata extends StringMetadata {}
export class RenderingIntent { constructor(private readonly visualCategory: string, private readonly interactionModel: string) { if (!visualCategory.trim() || !interactionModel.trim()) throw new Error('Rendering intent is required'); } getVisualCategory(): string { return this.visualCategory; } getInteractionModel(): string { return this.interactionModel; } }
export class SharedComponent {
  private state: ComponentLifecycleState;
  constructor(private readonly id: SharedComponentId, private readonly reference: SharedComponentReference, private readonly ownerReference: SharedComponentOwnerReference, private readonly definition: SharedComponentDefinition, private readonly version: ComponentVersion, private readonly compatibility: SharedComponentCompatibilityMetadata, private readonly metadata: ComponentMetadata, private readonly renderingIntent: RenderingIntent, state: ComponentLifecycleState = ComponentLifecycleState.CREATED) { this.state = state; }
  getId(): SharedComponentId { return this.id; } getReference(): SharedComponentReference { return this.reference; } getOwnerReference(): SharedComponentOwnerReference { return this.ownerReference; } getDefinition(): SharedComponentDefinition { return this.definition; } getVersion(): ComponentVersion { return this.version; } getCompatibility(): SharedComponentCompatibilityMetadata { return this.compatibility; } getMetadata(): ComponentMetadata { return this.metadata; } getRenderingIntent(): RenderingIntent { return this.renderingIntent; } getState(): ComponentLifecycleState { return this.state; } setLifecycleState(state: ComponentLifecycleState): void { this.state = state; }
}
export interface ISharedComponentRepository { save(component: SharedComponent): Promise<void>; findBy(specification: DomainSpecification<SharedComponent>): Promise<SharedComponent[]>; }
export class SharedComponentReferenceSpecification extends ReferenceSpecification<SharedComponent> { constructor(reference: string) { super(reference); } }
export class ComponentLifecycleService { static transitionTo(component: SharedComponent, state: ComponentLifecycleState): SharedComponent { if (component.getState() === ComponentLifecycleState.ARCHIVED) throw new Error('Archived component cannot transition'); component.setLifecycleState(state); return component; } }
export class ComponentCompatibilityService {
  static isBackwardCompatible(previous: SharedComponentDefinition, next: SharedComponentDefinition): boolean {
    const nextByName = new Map(next.getProperties().map(p => [p.name, p]));
    return previous.getProperties().every(prev => {
      const candidate = nextByName.get(prev.name);
      return !!candidate && candidate.type === prev.type && (!candidate.required || prev.required);
    });
  }
}
export class SharedComponentCreatedEvent { constructor(public readonly reference: SharedComponentReference) {} }
export class SharedComponentActivatedEvent { constructor(public readonly reference: SharedComponentReference) {} }
export class ComponentVersionPublishedEvent { constructor(public readonly reference: SharedComponentReference) {} }
export class SharedComponentDeprecatedEvent { constructor(public readonly reference: SharedComponentReference) {} }
export class SharedComponentArchivedEvent { constructor(public readonly reference: SharedComponentReference) {} }

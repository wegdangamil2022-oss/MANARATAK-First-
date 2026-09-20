import { DomainSpecification, GeneratedId, ReferenceSpecification, SemanticVersion, StringMetadata, StringValue } from './common';

export type LocalizationScopeType = 'GLOBAL' | 'DOMAIN' | 'RESOURCE' | 'UI';
export const LocalizationScopeType = Object.freeze({ GLOBAL: 'GLOBAL', DOMAIN: 'DOMAIN', RESOURCE: 'RESOURCE', UI: 'UI' } as const);

export enum LocalizationLifecycleState {
  CREATED = 'CREATED',
  ACTIVATED = 'ACTIVATED',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

export class LocalizationId extends GeneratedId { constructor(value?: string) { super(value, 'localization'); } }
export class LocalizationReference extends StringValue { constructor(value: string) { super(value, 'Localization reference'); } }
export class LocalizationOwnerReference extends StringValue { constructor(value: string) { super(value, 'Localization owner reference'); } }

export class LocaleDefinition {
  private readonly code: string;
  constructor(code: string) {
    const normalized = code.trim();
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(normalized)) throw new Error('Invalid locale code');
    this.code = normalized;
  }
  getCode(): string { return this.code; }
}

export class LocalizationDefinition {
  constructor(private readonly name: string, private readonly description: string) {
    if (!name.trim()) throw new Error('Localization name is required');
  }
  getName(): string { return this.name; }
  getDescription(): string { return this.description; }
}

export class TranslationDefinition {
  private readonly translations: Map<string, string>;
  constructor(translations: Readonly<Record<string, string>> | ReadonlyMap<string, string>) {
    this.translations = translations instanceof Map ? new Map(translations) : new Map(Object.entries(translations));
    if (this.translations.size === 0) throw new Error('At least one translation is required');
  }
  getTranslations(): ReadonlyMap<string, string> { return this.translations; }
}

export class LocalizationClassification {
  constructor(private readonly scope: LocalizationScopeType) {}
  getScope(): string { return this.scope; }
}

export class LocalizationVersion {
  private constructor(private readonly version: SemanticVersion) {}
  static initial(): LocalizationVersion { return new LocalizationVersion(SemanticVersion.initial()); }
  nextPatch(): LocalizationVersion { return new LocalizationVersion(this.version.nextPatch()); }
  getValue(): string { return this.version.getValue(); }
}

export class LocalizationMetadata extends StringMetadata {}
export class LocalizationIntent {
  constructor(private readonly goal: string, private readonly businessJustification: string) {
    if (!goal.trim() || !businessJustification.trim()) throw new Error('Localization intent requires goal and business justification');
  }
  getGoal(): string { return this.goal; }
  getBusinessJustification(): string { return this.businessJustification; }
}

export class Localization {
  private lifecycleState: LocalizationLifecycleState;
  constructor(
    private readonly id: LocalizationId,
    private readonly reference: LocalizationReference,
    private readonly ownerReference: LocalizationOwnerReference,
    private readonly definition: LocalizationDefinition,
    private readonly translationDefinition: TranslationDefinition,
    private readonly localeDefinition: LocaleDefinition,
    private readonly classification: LocalizationClassification,
    private readonly metadata: LocalizationMetadata,
    private readonly version: LocalizationVersion,
    private readonly intent: LocalizationIntent,
    lifecycleState: LocalizationLifecycleState = LocalizationLifecycleState.CREATED,
  ) { this.lifecycleState = lifecycleState; }
  getId(): LocalizationId { return this.id; }
  getReference(): LocalizationReference { return this.reference; }
  getOwnerReference(): LocalizationOwnerReference { return this.ownerReference; }
  getDefinition(): LocalizationDefinition { return this.definition; }
  getTranslationDefinition(): TranslationDefinition { return this.translationDefinition; }
  getLocaleDefinition(): LocaleDefinition { return this.localeDefinition; }
  getClassification(): LocalizationClassification { return this.classification; }
  getMetadata(): LocalizationMetadata { return this.metadata; }
  getVersion(): LocalizationVersion { return this.version; }
  getIntent(): LocalizationIntent { return this.intent; }
  getLifecycleState(): LocalizationLifecycleState { return this.lifecycleState; }
  setLifecycleState(state: LocalizationLifecycleState): void { this.lifecycleState = state; }
}

export interface ILocalizationRepository {
  save(localization: Localization): Promise<void>;
  findBy(specification: DomainSpecification<Localization>): Promise<Localization[]>;
}

export class LocalizationReferenceSpecification extends ReferenceSpecification<Localization> {
  constructor(reference: string) { super(reference); }
}

export class LocalizationValidationService {
  static validate(definition: LocalizationDefinition, translations: TranslationDefinition): void {
    if (!definition.getName() || translations.getTranslations().size === 0) throw new Error('Invalid localization definition');
  }
}

export class LocalizationLifecycleService {
  static transitionTo(localization: Localization, state: LocalizationLifecycleState): Localization {
    const current = localization.getLifecycleState();
    if (current === LocalizationLifecycleState.ARCHIVED) throw new Error('Archived localization cannot transition');
    if (current === LocalizationLifecycleState.DEPRECATED && state === LocalizationLifecycleState.ACTIVATED) throw new Error('Deprecated localization cannot be reactivated');
    localization.setLifecycleState(state);
    return localization;
  }
}

export class LocalizationCreatedEvent { constructor(public readonly reference: LocalizationReference) {} }
export class LocalizationActivatedEvent { constructor(public readonly reference: LocalizationReference) {} }
export class LocalizationVersionPublishedEvent { constructor(public readonly reference: LocalizationReference, public readonly version: string) {} }
export class LocalizationDeprecatedEvent { constructor(public readonly reference: LocalizationReference) {} }
export class LocalizationArchivedEvent { constructor(public readonly reference: LocalizationReference) {} }

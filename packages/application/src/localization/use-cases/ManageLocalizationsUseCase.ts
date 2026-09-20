import { assertTranslationContentAuthoringEnabled } from '@manaratak/shared';
import {
  Localization,
  LocalizationId,
  LocalizationReference,
  LocalizationOwnerReference,
  LocalizationDefinition,
  TranslationDefinition,
  LocaleDefinition,
  LocalizationClassification,
  LocalizationVersion,
  LocalizationMetadata,
  LocalizationIntent,
  LocalizationLifecycleState,
  ILocalizationRepository,
  LocalizationReferenceSpecification,
  LocalizationValidationService,
  LocalizationLifecycleService,
  LocalizationCreatedEvent,
  LocalizationActivatedEvent,
  LocalizationVersionPublishedEvent,
  LocalizationDeprecatedEvent,
  LocalizationArchivedEvent
} from '@manaratak/domain';
import {
  CreateLocalizationDto,
  UpdateLocalizationDto,
  LocalizationResponseDto
} from '../dtos/LocalizationDtos';
import { ILocalizationExecutionGateway } from '../gateways/ILocalizationExecutionGateway';

export class ManageLocalizationsUseCase {
  constructor(
    private readonly repository: ILocalizationRepository,
    private readonly executionGateway: ILocalizationExecutionGateway
  ) {}

  public async createLocalization(dto: CreateLocalizationDto): Promise<LocalizationResponseDto> {
    assertTranslationContentAuthoringEnabled();
    const reference = new LocalizationReference(dto.reference);
    const ownerReference = new LocalizationOwnerReference(dto.ownerReference);
    const locale = new LocaleDefinition(dto.locale);
    
    const definition = new LocalizationDefinition(
      dto.definition.name,
      dto.definition.description
    );
    
    const translationDefinition = new TranslationDefinition(
      dto.translationDefinition.translations
    );
    
    LocalizationValidationService.validate(definition, translationDefinition);

    const classification = new LocalizationClassification(dto.classification.scope);
    const metadata = new LocalizationMetadata(dto.metadata);
    const version = LocalizationVersion.initial();
    const intent = new LocalizationIntent(dto.intent.goal, dto.intent.businessJustification);

    const localization = new Localization(
      new LocalizationId(),
      reference,
      ownerReference,
      definition,
      translationDefinition,
      locale,
      classification,
      metadata,
      version,
      intent
    );

    await this.repository.save(localization);
    new LocalizationCreatedEvent(localization.getReference());

    return this.mapToResponse(localization);
  }

  public async activateLocalization(referenceValue: string): Promise<LocalizationResponseDto> {
    assertTranslationContentAuthoringEnabled();
    const localization = await this.getLocalization(referenceValue);
    const updated = LocalizationLifecycleService.transitionTo(localization, LocalizationLifecycleState.ACTIVATED);

    await this.repository.save(updated);
    await this.executionGateway.synchronize(updated);
    
    new LocalizationActivatedEvent(updated.getReference());
    return this.mapToResponse(updated);
  }

  public async updateLocalizationDefinition(referenceValue: string, dto: UpdateLocalizationDto): Promise<LocalizationResponseDto> {
    assertTranslationContentAuthoringEnabled();
    const existing = await this.getLocalization(referenceValue);
    
    const newDefinition = new LocalizationDefinition(
      dto.definition.name,
      dto.definition.description
    );
    
    const newTranslationDefinition = new TranslationDefinition(
      dto.translationDefinition.translations
    );
    
    LocalizationValidationService.validate(newDefinition, newTranslationDefinition);

    const newClassification = new LocalizationClassification(dto.classification.scope);
    const newIntent = new LocalizationIntent(dto.intent.goal, dto.intent.businessJustification);
    const newVersion = existing.getVersion().nextPatch();

    // Modification creates a new Localization with a new LocalizationReference (per pattern)
    const newReferenceValue = `${existing.getReference().getValue()}-${newVersion.getValue()}`;
    const newReference = new LocalizationReference(newReferenceValue);

    const newLocalization = new Localization(
      new LocalizationId(),
      newReference,
      existing.getOwnerReference(),
      newDefinition,
      newTranslationDefinition,
      existing.getLocaleDefinition(),
      newClassification,
      existing.getMetadata(),
      newVersion,
      newIntent,
      existing.getLifecycleState()
    );

    await this.repository.save(newLocalization);
    
    if (newLocalization.getLifecycleState() === LocalizationLifecycleState.ACTIVATED) {
      await this.executionGateway.synchronize(newLocalization);
    }

    new LocalizationVersionPublishedEvent(newLocalization.getReference(), newVersion.getValue());
    return this.mapToResponse(newLocalization);
  }

  public async deprecateLocalization(referenceValue: string): Promise<LocalizationResponseDto> {
    assertTranslationContentAuthoringEnabled();
    const localization = await this.getLocalization(referenceValue);
    const updated = LocalizationLifecycleService.transitionTo(localization, LocalizationLifecycleState.DEPRECATED);

    await this.repository.save(updated);
    await this.executionGateway.synchronize(updated);
    
    new LocalizationDeprecatedEvent(updated.getReference());
    return this.mapToResponse(updated);
  }

  public async archiveLocalization(referenceValue: string): Promise<LocalizationResponseDto> {
    assertTranslationContentAuthoringEnabled();
    const localization = await this.getLocalization(referenceValue);
    const updated = LocalizationLifecycleService.transitionTo(localization, LocalizationLifecycleState.ARCHIVED);

    await this.repository.save(updated);
    await this.executionGateway.decommission(updated);
    
    new LocalizationArchivedEvent(updated.getReference());
    return this.mapToResponse(updated);
  }

  public async listLocalizations(): Promise<LocalizationResponseDto[]> {
    const localizations = await this.repository.findBy({ isSatisfiedBy: () => true });
    return localizations.map((l: Localization) => this.mapToResponse(l));
  }

  private async getLocalization(referenceValue: string): Promise<Localization> {
    const results = await this.repository.findBy(new LocalizationReferenceSpecification(referenceValue));
    if (results.length === 0) {
      throw new Error(`Localization with reference ${referenceValue} not found`);
    }
    return results[results.length - 1]; // Latest version
  }

  private mapToResponse(l: Localization): LocalizationResponseDto {
    const metadata: Record<string, string> = {};
    l.getMetadata().getData().forEach((v: string, k: string) => metadata[k] = v);

    const translations: Record<string, string> = {};
    l.getTranslationDefinition().getTranslations().forEach((v: string, k: string) => translations[k] = v);

    return {
      reference: l.getReference().getValue(),
      ownerReference: l.getOwnerReference().getValue(),
      locale: l.getLocaleDefinition().getCode(),
      version: l.getVersion().getValue(),
      lifecycleState: l.getLifecycleState(),
      definition: {
        name: l.getDefinition().getName(),
        description: l.getDefinition().getDescription()
      },
      translationDefinition: {
        translations
      },
      classification: {
        scope: l.getClassification().getScope()
      },
      intent: {
        goal: l.getIntent().getGoal(),
        businessJustification: l.getIntent().getBusinessJustification()
      },
      metadata
    };
  }
}

import {
  Configuration,
  ConfigurationId,
  ConfigurationReference,
  ConfigurationOwnerReference,
  ConfigurationDefinition,
  ConfigurationValueDefinition,
  ConfigurationClassification,
  ConfigurationVersion,
  ConfigurationMetadata,
  ConfigurationIntent,
  ConfigurationLifecycleState,
  IConfigurationRepository,
  ConfigurationReferenceSpecification,
  ConfigurationFoundationValidationService,
  ConfigurationFoundationLifecycleService,
  ConfigurationCreatedEvent,
  ConfigurationActivatedEvent,
  ConfigurationVersionPublishedEvent,
  ConfigurationDeprecatedEvent,
  ConfigurationArchivedEvent
} from '@manaratak/domain';
import {
  CreateConfigurationDto,
  UpdateConfigurationDto,
  ConfigurationResponseDto
} from '../dtos/ConfigurationDtos';
import { IConfigurationResolutionGateway } from '../gateways/IConfigurationResolutionGateway';

export class ManageConfigurationsUseCase {
  constructor(
    private readonly repository: IConfigurationRepository,
    private readonly resolutionGateway: IConfigurationResolutionGateway
  ) {}

  public async createConfiguration(dto: CreateConfigurationDto): Promise<ConfigurationResponseDto> {
    const reference = new ConfigurationReference(dto.reference);
    const ownerReference = new ConfigurationOwnerReference(dto.ownerReference);
    
    const definition = new ConfigurationDefinition(
      dto.definition.purpose,
      dto.definition.structuralSchema
    );
    
    const valueDefinition = new ConfigurationValueDefinition(
      dto.valueDefinition.defaultValue,
      dto.valueDefinition.typeConstraints
    );
    
    ConfigurationFoundationValidationService.validate(definition, valueDefinition);

    const classification = new ConfigurationClassification(dto.classification.scope);
    const metadata = new ConfigurationMetadata(dto.metadata);
    const version = ConfigurationVersion.initial();
    const intent = new ConfigurationIntent(dto.intent.description, dto.intent.impact);

    const config = new Configuration(
      new ConfigurationId(),
      reference,
      ownerReference,
      definition,
      valueDefinition,
      classification,
      metadata,
      version,
      intent
    );

    await this.repository.save(config);
    new ConfigurationCreatedEvent(config.getReference());

    return this.mapToResponse(config);
  }

  public async activateConfiguration(referenceValue: string): Promise<ConfigurationResponseDto> {
    const config = await this.getConfiguration(referenceValue);
    ConfigurationFoundationLifecycleService.transitionTo(config, ConfigurationLifecycleState.ACTIVATED);

    await this.repository.save(config);
    await this.resolutionGateway.synchronize(config);
    
    new ConfigurationActivatedEvent(config.getReference());
    return this.mapToResponse(config);
  }

  public async updateConfigurationDefinition(referenceValue: string, dto: UpdateConfigurationDto): Promise<ConfigurationResponseDto> {
    const existing = await this.getConfiguration(referenceValue);
    
    const newDefinition = new ConfigurationDefinition(
      dto.definition.purpose,
      dto.definition.structuralSchema
    );
    
    const newValueDefinition = new ConfigurationValueDefinition(
      dto.valueDefinition.defaultValue,
      dto.valueDefinition.typeConstraints
    );
    
    ConfigurationFoundationValidationService.validate(newDefinition, newValueDefinition);

    const newClassification = new ConfigurationClassification(dto.classification.scope);
    const newIntent = new ConfigurationIntent(dto.intent.description, dto.intent.impact);
    const newVersion = existing.getVersion().nextPatch();

    const newConfig = new Configuration(
      new ConfigurationId(),
      new ConfigurationReference(existing.getReference().getValue()),
      existing.getOwnerReference(),
      newDefinition,
      newValueDefinition,
      newClassification,
      existing.getMetadata(),
      newVersion,
      newIntent,
      existing.getLifecycleState()
    );

    await this.repository.save(newConfig);
    
    if (newConfig.getLifecycleState() === ConfigurationLifecycleState.ACTIVATED) {
      await this.resolutionGateway.synchronize(newConfig);
    }

    new ConfigurationVersionPublishedEvent(newConfig.getReference(), newVersion.getValue());
    return this.mapToResponse(newConfig);
  }

  public async deprecateConfiguration(referenceValue: string): Promise<ConfigurationResponseDto> {
    const config = await this.getConfiguration(referenceValue);
    ConfigurationFoundationLifecycleService.transitionTo(config, ConfigurationLifecycleState.DEPRECATED);

    await this.repository.save(config);
    await this.resolutionGateway.synchronize(config);
    
    new ConfigurationDeprecatedEvent(config.getReference());
    return this.mapToResponse(config);
  }

  public async archiveConfiguration(referenceValue: string): Promise<ConfigurationResponseDto> {
    const config = await this.getConfiguration(referenceValue);
    ConfigurationFoundationLifecycleService.transitionTo(config, ConfigurationLifecycleState.ARCHIVED);

    await this.repository.save(config);
    await this.resolutionGateway.decommission(config);
    
    new ConfigurationArchivedEvent(config.getReference());
    return this.mapToResponse(config);
  }

  public async listConfigurations(): Promise<ConfigurationResponseDto[]> {
    const configs = await this.repository.findBy({ isSatisfiedBy: () => true });
    return configs.map(c => this.mapToResponse(c));
  }

  private async getConfiguration(referenceValue: string): Promise<Configuration> {
    const results = await this.repository.findBy(new ConfigurationReferenceSpecification(referenceValue));
    if (results.length === 0) {
      throw new Error(`Configuration with reference ${referenceValue} not found`);
    }
    return results[results.length - 1]; // Latest version
  }

  private mapToResponse(c: Configuration): ConfigurationResponseDto {
    const metadata: Record<string, string> = {};
    c.getMetadata().getData().forEach((v: string, k: string) => metadata[k] = v);

    return {
      reference: c.getReference().getValue(),
      ownerReference: c.getOwnerReference().getValue(),
      version: c.getVersion().getValue(),
      lifecycleState: c.getLifecycleState(),
      definition: {
        purpose: c.getDefinition().getPurpose(),
        structuralSchema: c.getDefinition().getStructuralSchema()
      },
      valueDefinition: {
        defaultValue: c.getValueDefinition().getDefaultValue(),
        typeConstraints: c.getValueDefinition().getTypeConstraints()
      },
      classification: {
        scope: c.getClassification().getScope()
      },
      intent: {
        description: c.getIntent().getDescription(),
        impact: c.getIntent().getImpact()
      },
      metadata
    };
  }
}

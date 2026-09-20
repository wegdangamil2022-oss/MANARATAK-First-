import {
  Integration,
  IntegrationId,
  IntegrationReference,
  IntegrationOwnerReference,
  IntegrationDefinition,
  IntegrationCapabilityDefinition,
  IntegrationClassification,
  IntegrationVersion,
  IntegrationMetadata,
  IntegrationIntent,
  IntegrationLifecycleState,
  IIntegrationRepository,
  IntegrationReferenceSpecification,
  IntegrationFoundationValidationService,
  IntegrationFoundationLifecycleService,
  IntegrationCreatedEvent,
  IntegrationActivatedEvent,
  IntegrationVersionPublishedEvent,
  IntegrationDeprecatedEvent,
  IntegrationArchivedEvent
} from '@manaratak/domain';
import {
  CreateIntegrationDto,
  UpdateIntegrationDto,
  IntegrationResponseDto
} from '../dtos/IntegrationDtos';
import { IIntegrationExecutionGateway } from '../gateways/IIntegrationExecutionGateway';

export class ManageIntegrationsUseCase {
  constructor(
    private readonly repository: IIntegrationRepository,
    private readonly executionGateway: IIntegrationExecutionGateway
  ) {}

  public async createIntegration(dto: CreateIntegrationDto): Promise<IntegrationResponseDto> {
    const reference = new IntegrationReference(dto.reference);
    const ownerReference = new IntegrationOwnerReference(dto.ownerReference);
    
    const definition = new IntegrationDefinition(
      dto.definition.purpose,
      dto.definition.scope
    );
    
    const capabilityDefinition = new IntegrationCapabilityDefinition(
      dto.capabilityDefinition.capabilities
    );
    
    IntegrationFoundationValidationService.validate(definition, capabilityDefinition);

    const classification = new IntegrationClassification(dto.classification.type, dto.classification.category);
    const metadata = new IntegrationMetadata(dto.metadata);
    const version = IntegrationVersion.initial();
    const intent = new IntegrationIntent(dto.intent.goal, dto.intent.businessJustification);

    const integration = new Integration(
      new IntegrationId(),
      reference,
      ownerReference,
      definition,
      capabilityDefinition,
      classification,
      metadata,
      version,
      intent
    );

    await this.repository.save(integration);
    new IntegrationCreatedEvent(integration.getReference());

    return this.mapToResponse(integration);
  }

  public async activateIntegration(referenceValue: string): Promise<IntegrationResponseDto> {
    const integration = await this.getIntegration(referenceValue);
    const updatedIntegration = IntegrationFoundationLifecycleService.transitionTo(integration, IntegrationLifecycleState.ACTIVATED);

    await this.repository.save(updatedIntegration);
    await this.executionGateway.synchronize(updatedIntegration);
    
    new IntegrationActivatedEvent(updatedIntegration.getReference());
    return this.mapToResponse(updatedIntegration);
  }

  public async updateIntegrationDefinition(referenceValue: string, dto: UpdateIntegrationDto): Promise<IntegrationResponseDto> {
    const existing = await this.getIntegration(referenceValue);
    
    const newDefinition = new IntegrationDefinition(
      dto.definition.purpose,
      dto.definition.scope
    );
    
    const newCapabilityDefinition = new IntegrationCapabilityDefinition(
      dto.capabilityDefinition.capabilities
    );
    
    IntegrationFoundationValidationService.validate(newDefinition, newCapabilityDefinition);

    const newClassification = new IntegrationClassification(dto.classification.type, dto.classification.category);
    const newIntent = new IntegrationIntent(dto.intent.goal, dto.intent.businessJustification);
    const newVersion = existing.getVersion().nextPatch();

    // Mandatory Refinement: Modification creates a new Integration with a new IntegrationReference
    const newReferenceValue = `${existing.getReference().getValue()}-${newVersion.getValue()}`;
    const newReference = new IntegrationReference(newReferenceValue);

    const newIntegration = new Integration(
      new IntegrationId(),
      newReference,
      existing.getOwnerReference(),
      newDefinition,
      newCapabilityDefinition,
      newClassification,
      existing.getMetadata(),
      newVersion,
      newIntent,
      existing.getLifecycleState()
    );

    await this.repository.save(newIntegration);
    
    if (newIntegration.getLifecycleState() === IntegrationLifecycleState.ACTIVATED) {
      await this.executionGateway.synchronize(newIntegration);
    }

    new IntegrationVersionPublishedEvent(newIntegration.getReference(), newVersion.getValue());
    return this.mapToResponse(newIntegration);
  }

  public async deprecateIntegration(referenceValue: string): Promise<IntegrationResponseDto> {
    const integration = await this.getIntegration(referenceValue);
    const updatedIntegration = IntegrationFoundationLifecycleService.transitionTo(integration, IntegrationLifecycleState.DEPRECATED);

    await this.repository.save(updatedIntegration);
    await this.executionGateway.synchronize(updatedIntegration);
    
    new IntegrationDeprecatedEvent(updatedIntegration.getReference());
    return this.mapToResponse(updatedIntegration);
  }

  public async archiveIntegration(referenceValue: string): Promise<IntegrationResponseDto> {
    const integration = await this.getIntegration(referenceValue);
    const updatedIntegration = IntegrationFoundationLifecycleService.transitionTo(integration, IntegrationLifecycleState.ARCHIVED);

    await this.repository.save(updatedIntegration);
    await this.executionGateway.decommission(updatedIntegration);
    
    new IntegrationArchivedEvent(updatedIntegration.getReference());
    return this.mapToResponse(updatedIntegration);
  }

  public async listIntegrations(): Promise<IntegrationResponseDto[]> {
    const integrations = await this.repository.findBy({ isSatisfiedBy: () => true });
    return integrations.map((i: Integration) => this.mapToResponse(i));
  }

  private async getIntegration(referenceValue: string): Promise<Integration> {
    const results = await this.repository.findBy(new IntegrationReferenceSpecification(referenceValue));
    if (results.length === 0) {
      throw new Error(`Integration with reference ${referenceValue} not found`);
    }
    return results[results.length - 1]; // Latest version
  }

  private mapToResponse(i: Integration): IntegrationResponseDto {
    const metadata: Record<string, string> = {};
    i.getMetadata().getData().forEach((v: string, k: string) => metadata[k] = v);

    return {
      reference: i.getReference().getValue(),
      ownerReference: i.getOwnerReference().getValue(),
      version: i.getVersion().getValue(),
      lifecycleState: i.getLifecycleState(),
      definition: {
        purpose: i.getDefinition().getPurpose(),
        scope: i.getDefinition().getScope()
      },
      capabilityDefinition: {
        capabilities: i.getCapabilityDefinition().getCapabilities()
      },
      classification: {
        type: i.getClassification().getType(),
        category: i.getClassification().getCategory()
      },
      intent: {
        goal: i.getIntent().getGoal(),
        businessJustification: i.getIntent().getBusinessJustification()
      },
      metadata
    };
  }
}

import {
  SharedComponent,
  SharedComponentId,
  SharedComponentReference,
  SharedComponentOwnerReference,
  SharedComponentDefinition,
  ComponentVersion,
  SharedComponentCompatibilityMetadata as CompatibilityMetadata,
  ComponentMetadata,
  RenderingIntent,
  ComponentLifecycleState,
  ComponentLifecycleService,
  ComponentCompatibilityService,
  ISharedComponentRepository,
  SharedComponentReferenceSpecification,
  SharedComponentCreatedEvent,
  SharedComponentActivatedEvent,
  ComponentVersionPublishedEvent,
  SharedComponentDeprecatedEvent,
  SharedComponentArchivedEvent
} from '@manaratak/domain';
import {
  CreateSharedComponentDto,
  PublishComponentVersionDto,
  SharedComponentResponseDto
} from '../dtos/SharedComponentDtos';
import { IComponentRenderingGateway } from '../gateways/IComponentRenderingGateway';

export class ManageSharedComponentsUseCase {
  constructor(
    private readonly repository: ISharedComponentRepository,
    private readonly renderingGateway: IComponentRenderingGateway
  ) {}

  public async createComponent(dto: CreateSharedComponentDto): Promise<SharedComponentResponseDto> {
    const reference = new SharedComponentReference(dto.reference);
    const owner = new SharedComponentOwnerReference(dto.ownerReference);
    const version = new ComponentVersion(dto.version.major, dto.version.minor, dto.version.patch);
    const definition = new SharedComponentDefinition(dto.properties, dto.slots);
    const intent = new RenderingIntent(dto.renderingIntent.visualCategory, dto.renderingIntent.interactionModel);
    
    const metadataMap = new Map<string, string>();
    if (dto.metadata) {
      Object.entries(dto.metadata).forEach(([k, v]) => metadataMap.set(k, v));
    }
    const metadata = new ComponentMetadata(metadataMap);
    
    const component = new SharedComponent(
      new SharedComponentId(),
      reference,
      owner,
      definition,
      version,
      new CompatibilityMetadata(true, true), // Initial version is compatible with itself
      metadata,
      intent
    );

    await this.repository.save(component);
    new SharedComponentCreatedEvent(reference);

    return this.mapToResponse(component);
  }

  public async activateComponent(referenceValue: string): Promise<SharedComponentResponseDto> {
    const component = await this.getComponent(referenceValue);
    ComponentLifecycleService.transitionTo(component, ComponentLifecycleState.ACTIVATED);
    
    await this.repository.save(component);
    await this.renderingGateway.synchronize(component);
    
    new SharedComponentActivatedEvent(component.getReference());
    return this.mapToResponse(component);
  }

  public async publishVersion(dto: PublishComponentVersionDto): Promise<SharedComponentResponseDto> {
    const existing = await this.getComponent(dto.reference);
    
    const newVersion = new ComponentVersion(dto.version.major, dto.version.minor, dto.version.patch);
    const newDefinition = new SharedComponentDefinition(dto.properties, dto.slots);
    
    const isBackwardCompatible = ComponentCompatibilityService.isBackwardCompatible(existing.getDefinition(), newDefinition);
    
    const newComponent = new SharedComponent(
      new SharedComponentId(),
      existing.getReference(),
      existing.getOwnerReference(),
      newDefinition,
      newVersion,
      new CompatibilityMetadata(isBackwardCompatible, true),
      existing.getMetadata(),
      existing.getRenderingIntent(),
      ComponentLifecycleState.CREATED
    );

    await this.repository.save(newComponent);
    new ComponentVersionPublishedEvent(newComponent.getReference());

    return this.mapToResponse(newComponent);
  }

  public async deprecateComponent(referenceValue: string): Promise<SharedComponentResponseDto> {
    const component = await this.getComponent(referenceValue);
    ComponentLifecycleService.transitionTo(component, ComponentLifecycleState.DEPRECATED);
    
    await this.repository.save(component);
    await this.renderingGateway.synchronize(component);
    
    new SharedComponentDeprecatedEvent(component.getReference());
    return this.mapToResponse(component);
  }

  public async archiveComponent(referenceValue: string): Promise<SharedComponentResponseDto> {
    const component = await this.getComponent(referenceValue);
    ComponentLifecycleService.transitionTo(component, ComponentLifecycleState.ARCHIVED);
    
    await this.repository.save(component);
    await this.renderingGateway.decommission(component);
    
    new SharedComponentArchivedEvent(component.getReference());
    return this.mapToResponse(component);
  }

  private async getComponent(ref: string): Promise<SharedComponent> {
    const components = await this.repository.findBy(new SharedComponentReferenceSpecification(ref));
    if (components.length === 0) {
      throw new Error(`Shared Component not found: ${ref}`);
    }
    // Return the latest version (simplified for this foundation stage)
    return components[components.length - 1];
  }

  private mapToResponse(c: SharedComponent): SharedComponentResponseDto {
    const metadata: Record<string, string> = {};
    c.getMetadata().getData().forEach((v: string, k: string) => metadata[k] = v);

    return {
      reference: c.getReference().getValue(),
      ownerReference: c.getOwnerReference().getValue(),
      version: c.getVersion().getValue(),
      state: c.getState(),
      renderingIntent: {
        visualCategory: c.getRenderingIntent().getVisualCategory(),
        interactionModel: c.getRenderingIntent().getInteractionModel()
      },
      properties: c.getDefinition().getProperties(),
      slots: c.getDefinition().getSlots(),
      metadata,
      isBackwardCompatible: c.getCompatibility().getIsBackwardCompatible()
    };
  }
}

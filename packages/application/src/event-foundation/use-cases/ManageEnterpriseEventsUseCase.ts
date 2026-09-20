import {
  EnterpriseEvent,
  EventReference,
  EventOwnerReference,
  EventDefinition,
  EventPayloadMetadata,
  EventVersion,
  EventMetadata,
  EventCorrelationReference,
  EventCausationReference,
  IEnterpriseEventRepository,
  EnterpriseEventSpecification
} from '@manaratak/domain';
import {
  RegisterEnterpriseEventDto,
  PublishEnterpriseEventDto,
  EnterpriseEventDto
} from '../dtos/EventFoundationDtos';
import { IEventPublishingGateway } from '../gateways/IEventPublishingGateway';

export class ManageEnterpriseEventsUseCase {
  constructor(
    private readonly repository: IEnterpriseEventRepository,
    private readonly publishingGateway: IEventPublishingGateway
  ) {}

  public async register(dto: RegisterEnterpriseEventDto): Promise<EnterpriseEventDto> {
    const reference = EventReference.from(dto.reference);
    const ownerReference = EventOwnerReference.from(dto.ownerReference);
    const definition = EventDefinition.create(dto.type, dto.category);
    const payloadMetadata = EventPayloadMetadata.create(dto.payloadMetadata);
    const version = EventVersion.create(dto.version);
    const metadata = EventMetadata.create(dto.metadata || {});
    
    const correlationReference = dto.correlationReference 
      ? EventCorrelationReference.from(dto.correlationReference) 
      : undefined;
      
    const causationReference = dto.causationReference 
      ? EventCausationReference.from(dto.causationReference) 
      : undefined;

    const event = EnterpriseEvent.create(
      reference,
      ownerReference,
      definition,
      payloadMetadata,
      version,
      metadata,
      correlationReference,
      causationReference
    );

    event.register();
    await this.repository.save(event);

    return this.mapToDto(event);
  }

  public async publish(dto: PublishEnterpriseEventDto): Promise<void> {
    const spec = new EnterpriseEventSpecification({ reference: dto.reference });
    const events = await this.repository.findBy(spec);
    
    if (events.length === 0) {
      throw new Error(`Event not found with reference: ${dto.reference}`);
    }

    const event = events[0];
    event.markAsPublished();

    // Physical publishing handoff
    await this.publishingGateway.publish(event);

    await this.repository.save(event);
  }

  public async archive(reference: string): Promise<void> {
    const spec = new EnterpriseEventSpecification({ reference });
    const events = await this.repository.findBy(spec);
    
    if (events.length === 0) {
      throw new Error(`Event not found with reference: ${reference}`);
    }

    const event = events[0];
    event.archive();

    await this.repository.save(event);
  }

  public async getByReference(reference: string): Promise<EnterpriseEventDto | null> {
    const spec = new EnterpriseEventSpecification({ reference });
    const events = await this.repository.findBy(spec);
    return events.length > 0 ? this.mapToDto(events[0]) : null;
  }

  private mapToDto(event: EnterpriseEvent): EnterpriseEventDto {
    return {
      id: event.getId().getValue(),
      reference: event.getReference().getValue(),
      ownerReference: event.getOwnerReference().getValue(),
      type: event.getDefinition().getType(),
      category: event.getDefinition().getCategory(),
      payloadMetadata: event.getPayloadMetadata().getMetadata(),
      version: event.getVersion().getVersion(),
      metadata: event.getMetadata().getMetadata(),
      correlationReference: event.getCorrelationReference()?.getValue(),
      causationReference: event.getCausationReference()?.getValue(),
      lifecycleState: event.getLifecycleState()
    };
  }
}

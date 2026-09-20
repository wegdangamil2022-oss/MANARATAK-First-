import {
  Monitor,
  MonitorId,
  MonitorReference,
  MonitorOwnerReference,
  MonitorDefinition,
  MonitorStateDefinition,
  MonitorVersion,
  MonitorMetadata,
  MonitoringIntent,
  MonitorLifecycleState,
  IMonitorRepository,
  MonitorReferenceSpecification,
  MonitorValidationService,
  MonitorLifecycleService,
  MonitorCreatedEvent,
  MonitorActivatedEvent,
  MonitorStateChangedEvent,
  MonitorDeprecatedEvent,
  MonitorArchivedEvent
} from '@manaratak/domain';
import {
  CreateMonitorDto,
  UpdateMonitorDefinitionDto,
  MonitorResponseDto
} from '../dtos/MonitorDtos';
import { IMonitoringExecutionGateway } from '../gateways/IMonitoringExecutionGateway';

export class ManageMonitorsUseCase {
  constructor(
    private readonly repository: IMonitorRepository,
    private readonly executionGateway: IMonitoringExecutionGateway
  ) {}

  public async createMonitor(dto: CreateMonitorDto): Promise<MonitorResponseDto> {
    const reference = new MonitorReference(dto.reference);
    const ownerReference = new MonitorOwnerReference(dto.ownerReference);
    
    const definition = new MonitorDefinition(
      dto.definition.targets,
      dto.definition.frequencySeconds,
      dto.definition.requirements
    );
    MonitorValidationService.validateDefinition(definition);

    const stateDefinition = new MonitorStateDefinition(dto.stateDefinition.states);
    const metadata = new MonitorMetadata(dto.metadata);
    const version = MonitorVersion.initial();
    const intent = new MonitoringIntent(dto.intent.purpose, dto.intent.criticality);

    const monitor = new Monitor(
      new MonitorId(),
      reference,
      ownerReference,
      definition,
      stateDefinition,
      metadata,
      version,
      intent
    );

    await this.repository.save(monitor);
    new MonitorCreatedEvent(monitor.getReference());

    return this.mapToResponse(monitor);
  }

  public async activateMonitor(referenceValue: string): Promise<MonitorResponseDto> {
    const monitor = await this.getMonitor(referenceValue);
    MonitorLifecycleService.transitionTo(monitor, MonitorLifecycleState.ACTIVATED);

    await this.repository.save(monitor);
    await this.executionGateway.synchronize(monitor);
    
    new MonitorActivatedEvent(monitor.getReference());
    return this.mapToResponse(monitor);
  }

  public async updateMonitorDefinition(referenceValue: string, dto: UpdateMonitorDefinitionDto): Promise<MonitorResponseDto> {
    const existing = await this.getMonitor(referenceValue);
    
    const newDefinition = new MonitorDefinition(
      dto.definition.targets,
      dto.definition.frequencySeconds,
      dto.definition.requirements
    );
    MonitorValidationService.validateDefinition(newDefinition);

    const newStateDefinition = new MonitorStateDefinition(dto.stateDefinition.states);
    const newIntent = new MonitoringIntent(dto.intent.purpose, dto.intent.criticality);
    const newVersion = existing.getVersion().nextPatch();

    // As per ADR-3 and ADR-7, any modification creates a completely new Monitor (logical immutability)
    const newMonitor = new Monitor(
      new MonitorId(),
      new MonitorReference(existing.getReference().getValue()),
      existing.getOwnerReference(),
      newDefinition,
      newStateDefinition,
      existing.getMetadata(),
      newVersion,
      newIntent,
      existing.getLifecycleState()
    );

    await this.repository.save(newMonitor);
    
    if (newMonitor.getLifecycleState() === MonitorLifecycleState.ACTIVATED) {
      await this.executionGateway.synchronize(newMonitor);
    }

    new MonitorStateChangedEvent(newMonitor.getReference(), newVersion.getValue());
    return this.mapToResponse(newMonitor);
  }

  public async deprecateMonitor(referenceValue: string): Promise<MonitorResponseDto> {
    const monitor = await this.getMonitor(referenceValue);
    MonitorLifecycleService.transitionTo(monitor, MonitorLifecycleState.DEPRECATED);

    await this.repository.save(monitor);
    await this.executionGateway.synchronize(monitor);
    
    new MonitorDeprecatedEvent(monitor.getReference());
    return this.mapToResponse(monitor);
  }

  public async archiveMonitor(referenceValue: string): Promise<MonitorResponseDto> {
    const monitor = await this.getMonitor(referenceValue);
    MonitorLifecycleService.transitionTo(monitor, MonitorLifecycleState.ARCHIVED);

    await this.repository.save(monitor);
    await this.executionGateway.decommission(monitor);
    
    new MonitorArchivedEvent(monitor.getReference());
    return this.mapToResponse(monitor);
  }

  public async listMonitors(): Promise<MonitorResponseDto[]> {
    const monitors = await this.repository.findBy({ isSatisfiedBy: () => true });
    return monitors.map((m: Monitor) => this.mapToResponse(m));
  }

  private async getMonitor(referenceValue: string): Promise<Monitor> {
    const results = await this.repository.findBy(new MonitorReferenceSpecification(referenceValue));
    if (results.length === 0) {
      throw new Error(`Monitor with reference ${referenceValue} not found`);
    }
    return results[results.length - 1]; // Return latest version
  }

  private mapToResponse(m: Monitor): MonitorResponseDto {
    const metadata: Record<string, string> = {};
    m.getMetadata().getData().forEach((v: string, k: string) => metadata[k] = v);

    return {
      reference: m.getReference().getValue(),
      ownerReference: m.getOwnerReference().getValue(),
      version: m.getVersion().getValue(),
      lifecycleState: m.getLifecycleState(),
      intent: {
        purpose: m.getIntent().getPurpose(),
        criticality: m.getIntent().getCriticality()
      },
      targets: [...m.getDefinition().getTargets()],
      frequencySeconds: m.getDefinition().getFrequencySeconds(),
      states: [...m.getStateDefinition().getStates()],
      metadata
    };
  }
}

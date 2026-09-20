import {
  LogEntry,
  LogEntryId,
  LogReference,
  LogOwnerReference,
  LogDefinition,
  LogClassification,
  LogVersion,
  LogMetadata,
  LoggingIntent,
  LogLifecycleState,
  ILogEntryRepository,
  LogReferenceSpecification,
  LogValidationService,
  LogLifecycleService,
  LogEntryCreatedEvent,
  LogEntryActivatedEvent,
  LogVersionPublishedEvent,
  LogEntryDeprecatedEvent,
  LogEntryArchivedEvent
} from '@manaratak/domain';
import {
  CreateLogEntryDto,
  UpdateLogDefinitionDto,
  LogEntryResponseDto
} from '../dtos/LogDtos';
import { ILogExecutionGateway } from '../gateways/ILogExecutionGateway';

export class ManageLogsUseCase {
  constructor(
    private readonly repository: ILogEntryRepository,
    private readonly executionGateway: ILogExecutionGateway
  ) {}

  public async createLogEntry(dto: CreateLogEntryDto): Promise<LogEntryResponseDto> {
    const reference = new LogReference(dto.reference);
    const ownerReference = new LogOwnerReference(dto.ownerReference);
    
    const definition = new LogDefinition(
      dto.definition.messageTemplate,
      dto.definition.requiredFields,
      dto.definition.structuralIntent
    );
    LogValidationService.validateDefinition(definition);

    const classification = new LogClassification(
      dto.classification.category,
      dto.classification.severity
    );

    const metadata = new LogMetadata(dto.metadata);
    const version = LogVersion.initial();
    const intent = new LoggingIntent(dto.intent.purpose, dto.intent.criticality);

    const logEntry = new LogEntry(
      new LogEntryId(),
      reference,
      ownerReference,
      definition,
      classification,
      metadata,
      version,
      intent
    );

    await this.repository.save(logEntry);
    new LogEntryCreatedEvent(logEntry.getReference());

    return this.mapToResponse(logEntry);
  }

  public async activateLogEntry(referenceValue: string): Promise<LogEntryResponseDto> {
    const logEntry = await this.getLogEntry(referenceValue);
    LogLifecycleService.transitionTo(logEntry, LogLifecycleState.ACTIVATED);

    await this.repository.save(logEntry);
    await this.executionGateway.synchronize(logEntry);
    
    new LogEntryActivatedEvent(logEntry.getReference());
    return this.mapToResponse(logEntry);
  }

  public async updateLogDefinition(referenceValue: string, dto: UpdateLogDefinitionDto): Promise<LogEntryResponseDto> {
    const existing = await this.getLogEntry(referenceValue);
    
    const newDefinition = new LogDefinition(
      dto.definition.messageTemplate,
      dto.definition.requiredFields,
      dto.definition.structuralIntent
    );
    LogValidationService.validateDefinition(newDefinition);

    const newClassification = new LogClassification(
      dto.classification.category,
      dto.classification.severity
    );

    const newIntent = new LoggingIntent(dto.intent.purpose, dto.intent.criticality);
    const newVersion = existing.getVersion().nextPatch();

    // As per ADR-3, any modification creates a completely new LogEntry (logical immutability)
    const newLogEntry = new LogEntry(
      new LogEntryId(),
      new LogReference(existing.getReference().getValue()),
      existing.getOwnerReference(),
      newDefinition,
      newClassification,
      existing.getMetadata(),
      newVersion,
      newIntent,
      existing.getLifecycleState()
    );

    await this.repository.save(newLogEntry);
    
    if (newLogEntry.getLifecycleState() === LogLifecycleState.ACTIVATED) {
      await this.executionGateway.synchronize(newLogEntry);
    }

    new LogVersionPublishedEvent(newLogEntry.getReference(), newVersion.getValue());
    return this.mapToResponse(newLogEntry);
  }

  public async deprecateLogEntry(referenceValue: string): Promise<LogEntryResponseDto> {
    const logEntry = await this.getLogEntry(referenceValue);
    LogLifecycleService.transitionTo(logEntry, LogLifecycleState.DEPRECATED);

    await this.repository.save(logEntry);
    await this.executionGateway.synchronize(logEntry);
    
    new LogEntryDeprecatedEvent(logEntry.getReference());
    return this.mapToResponse(logEntry);
  }

  public async archiveLogEntry(referenceValue: string): Promise<LogEntryResponseDto> {
    const logEntry = await this.getLogEntry(referenceValue);
    LogLifecycleService.transitionTo(logEntry, LogLifecycleState.ARCHIVED);

    await this.repository.save(logEntry);
    await this.executionGateway.decommission(logEntry);
    
    new LogEntryArchivedEvent(logEntry.getReference());
    return this.mapToResponse(logEntry);
  }

  public async listLogEntries(): Promise<LogEntryResponseDto[]> {
    const logEntries = await this.repository.findBy({ isSatisfiedBy: () => true });
    return logEntries.map((l: LogEntry) => this.mapToResponse(l));
  }

  private async getLogEntry(referenceValue: string): Promise<LogEntry> {
    const results = await this.repository.findBy(new LogReferenceSpecification(referenceValue));
    if (results.length === 0) {
      throw new Error(`Log Entry with reference ${referenceValue} not found`);
    }
    return results[results.length - 1]; // Return latest version
  }

  private mapToResponse(l: LogEntry): LogEntryResponseDto {
    const metadata: Record<string, string> = {};
    l.getMetadata().getData().forEach((v: string, k: string) => metadata[k] = v);

    return {
      reference: l.getReference().getValue(),
      ownerReference: l.getOwnerReference().getValue(),
      version: l.getVersion().getValue(),
      lifecycleState: l.getLifecycleState(),
      intent: {
        purpose: l.getIntent().getPurpose(),
        criticality: l.getIntent().getCriticality()
      },
      definition: {
        messageTemplate: l.getDefinition().getMessageTemplate(),
        requiredFields: [...l.getDefinition().getRequiredFields()],
        structuralIntent: { ...l.getDefinition().getStructuralIntent() }
      },
      classification: {
        category: l.getClassification().getCategory(),
        severity: l.getClassification().getSeverity()
      },
      metadata
    };
  }
}

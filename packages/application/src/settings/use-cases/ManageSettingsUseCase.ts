import {
  ISettingDefinitionRepository,
  ISettingAssignmentRepository,
  ConfigurationValidationService,
  SettingDefinition,
  SettingAssignment,
  NamespacedKey,
  ScopeIdentifier,
  ScopeLevel,
  SettingVersion,
  StringValue,
  NumberValue,
  BooleanValue,
  JsonValue,
  ValueType,
  SettingValueData,
} from '@manaratak/domain';
import {
  CreateSettingDefinitionInput,
  AssignSettingValueInput,
  RollbackSettingValueInput,
} from '../dtos/SettingsDtos';
import {
  AtomicDomainMutationCoordinator,
  AtomicMutationRequestContext,
} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export interface SettingDefinitionAdminView {
  id: string;
  key: string;
  valueType: ValueType;
  description?: string;
  defaultValue?: unknown;
  isFeatureFlag: boolean;
  isDeprecated: boolean;
  isSecret: boolean;
}

export interface SettingVersionAdminView {
  id: string;
  value: unknown;
  valueType: ValueType;
  authorId?: string;
  createdAt: Date;
  rollbackOfVersionId?: string;
}

export interface SettingAssignmentAdminView {
  id: string;
  key: string;
  level: ScopeLevel;
  scopeId?: string;
  currentVersionId: string;
  currentValue: unknown;
  versions: SettingVersionAdminView[];
}

export class ManageSettingsUseCase {
  constructor(
    private definitionRepo: ISettingDefinitionRepository,
    private assignmentRepo: ISettingAssignmentRepository,
    private validationService: ConfigurationValidationService,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
  ) {}

  public async listDefinitions(): Promise<SettingDefinitionAdminView[]> {
    const definitions = await this.definitionRepo.findAll();
    return definitions.map((definition) => ({
      id: definition.id,
      key: definition.key.getValue(),
      valueType: definition.valueType,
      description: definition.description,
      defaultValue: definition.isSecret ? undefined : definition.defaultValue,
      isFeatureFlag: definition.isFeatureFlag,
      isDeprecated: definition.isDeprecated,
      isSecret: definition.isSecret,
    }));
  }

  public async listAssignments(
    filters: { key?: string; level?: ScopeLevel; scopeId?: string } = {},
  ): Promise<SettingAssignmentAdminView[]> {
    const assignments = await this.assignmentRepo.findBy({
      isSatisfiedBy: (assignment: SettingAssignment) => {
        if (filters.key && assignment.key.getValue() !== filters.key) return false;
        if (filters.level && assignment.scope.getLevel() !== filters.level) return false;
        if (filters.scopeId && assignment.scope.getScopeId() !== filters.scopeId) return false;
        return true;
      },
    });

    const definitionCache = new Map<string, SettingDefinition | null>();
    const getDefinition = async (key: string) => {
      if (!definitionCache.has(key)) {
        definitionCache.set(key, await this.definitionRepo.findByKey(new NamespacedKey(key)));
      }
      return definitionCache.get(key) ?? null;
    };

    const views: SettingAssignmentAdminView[] = [];
    for (const assignment of assignments) {
      const key = assignment.key.getValue();
      const definition = await getDefinition(key);
      const redact = !definition || definition.isSecret;
      const versions = assignment.getVersions().map((version) => ({
        id: version.id,
        value: redact ? '********' : version.value.getValue(),
        valueType: version.value.type,
        authorId: version.authorId,
        createdAt: version.createdAt,
        rollbackOfVersionId: version.rollbackOfVersionId,
      }));
      const currentVersion = assignment.getCurrentVersion();
      views.push({
        id: assignment.id,
        key,
        level: assignment.scope.getLevel(),
        scopeId: assignment.scope.getScopeId(),
        currentVersionId: currentVersion.id,
        currentValue: redact ? '********' : currentVersion.value.getValue(),
        versions,
      });
    }

    return views.sort(
      (a, b) =>
        a.key.localeCompare(b.key) ||
        a.level.localeCompare(b.level) ||
        (a.scopeId ?? '').localeCompare(b.scopeId ?? ''),
    );
  }

  public async createDefinition(
    input: CreateSettingDefinitionInput,
    context?: AtomicMutationRequestContext,
  ): Promise<void> {
    const key = new NamespacedKey(input.key);
    const existing = await this.definitionRepo.findByKey(key);
    if (existing) {
      throw new Error(`Setting definition for key ${input.key} already exists.`);
    }
    if (input.isSecret && input.defaultValue !== undefined && input.defaultValue !== null) {
      throw new Error(
        'Secret settings cannot persist default values. Use the approved runtime secret provider.',
      );
    }
    if (input.isFeatureFlag && (input.valueType !== ValueType.Boolean || input.isSecret))
      throw new Error('Feature flags must be non-secret Boolean settings.');
    if (!input.isSecret && input.defaultValue !== undefined)
      this.createValueData(input.valueType, input.defaultValue);

    const definition = new SettingDefinition(
      {
        id: input.id,
        key,
        valueType: input.valueType,
        description: input.description,
        defaultValue: input.defaultValue,
        isFeatureFlag: input.isFeatureFlag || false,
        isDeprecated: false,
        isSecret: input.isSecret || false,
      },
      true,
    );

    if (!this.atomicMutations) return this.definitionRepo.save(definition);
    if (!this.definitionRepo.withTransaction || !context?.actorId)
      throw new Error('SETTINGS_ATOMIC_CONTEXT_REQUIRED');
    await this.atomicMutations.execute(
      {
        domain: 'SETTINGS',
        aggregateType: 'SETTING_DEFINITION',
        aggregateId: definition.id,
        action: 'CREATE_SETTING_DEFINITION',
        context,
        auditMetadata: {
          key: input.key,
          valueType: input.valueType,
          isSecret: input.isSecret,
          isFeatureFlag: input.isFeatureFlag,
        },
      },
      (transaction) => this.definitionRepo.withTransaction!(transaction).save(definition),
    );
  }

  private createValueData(type: ValueType, value: unknown): SettingValueData {
    switch (type) {
      case ValueType.String:
        return new StringValue(value as string);
      case ValueType.Number:
        if (typeof value !== 'number' || !Number.isFinite(value))
          throw new Error('Setting numbers must be finite.');
        return new NumberValue(value);
      case ValueType.Boolean:
        return new BooleanValue(value as boolean);
      case ValueType.Json:
        return new JsonValue(value as Record<string, unknown>);
      default:
        throw new Error(`Unsupported value type: ${type}`);
    }
  }

  public async assignValue(
    input: AssignSettingValueInput & { expectedCurrentVersionId?: string | null },
    context?: AtomicMutationRequestContext,
  ): Promise<string> {
    const key = new NamespacedKey(input.key);
    const definition = await this.definitionRepo.findByKey(key);
    if (!definition) {
      throw new Error(`Setting definition ${input.key} not found.`);
    }
    if (definition.isDeprecated) {
      throw new Error(
        `Setting definition ${input.key} is deprecated and cannot receive new values.`,
      );
    }
    if (definition.isSecret) {
      throw new Error(
        'Secret values cannot be written through the Settings API. Use the approved runtime secret provider.',
      );
    }

    const scope = new ScopeIdentifier(input.level, input.scopeId);
    const valueData = this.createValueData(input.type, input.value);

    this.validationService.validate(definition, valueData);

    let assignment = await this.assignmentRepo.findByScopeAndKey(scope, key);
    if (
      input.expectedCurrentVersionId !== undefined &&
      (assignment?.getCurrentVersion().id ?? null) !== input.expectedCurrentVersionId
    )
      throw new Error('SETTINGS_VERSION_CONFLICT: Reload the current value before saving.');
    if (assignment) {
      assignment.updateValue(input.versionId, valueData, input.authorId);
    } else {
      const version = new SettingVersion(input.versionId, valueData, new Date(), input.authorId);
      assignment = new SettingAssignment(
        {
          id: input.assignmentId,
          key,
          scope,
          versions: [version],
        },
        true,
      );
    }

    return this.persistAssignment(assignment, 'ASSIGN_SETTING_VALUE', context, {
      key: input.key,
      level: input.level,
      scopeId: input.scopeId,
      versionId: input.versionId,
    });
  }

  public async rollbackValue(
    input: RollbackSettingValueInput & { expectedCurrentVersionId?: string },
    context?: AtomicMutationRequestContext,
  ): Promise<string> {
    const assignments = await this.assignmentRepo.findBy({
      isSatisfiedBy: (a: SettingAssignment) => a.id === input.assignmentId,
    });
    const assignment = assignments[0];

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const definition = await this.definitionRepo.findByKey(assignment.key);
    if (!definition || definition.isDeprecated)
      throw new Error('Setting definition missing or deprecated; rollback is unavailable.');
    if (definition.isSecret) {
      throw new Error(
        'Secret values cannot be rolled back through the Settings API. Use the approved runtime secret provider.',
      );
    }
    if (
      input.expectedCurrentVersionId !== undefined &&
      assignment.getCurrentVersion().id !== input.expectedCurrentVersionId
    )
      throw new Error('SETTINGS_VERSION_CONFLICT: Reload the current value before rollback.');
    const previous = assignment
      .getVersions()
      .find((version) => version.id === input.previousVersionId);
    if (!previous) throw new Error('Previous version not found');
    this.validationService.validate(definition, previous.value);

    assignment.rollbackTo(input.previousVersionId, input.newVersionId, input.authorId);
    return this.persistAssignment(assignment, 'ROLLBACK_SETTING_VALUE', context, {
      previousVersionId: input.previousVersionId,
      newVersionId: input.newVersionId,
    });
  }

  private async persistAssignment(
    assignment: SettingAssignment,
    action: string,
    context: AtomicMutationRequestContext | undefined,
    metadata: Record<string, unknown>,
  ): Promise<string> {
    if (!this.atomicMutations) await this.assignmentRepo.save(assignment);
    else {
      if (!this.assignmentRepo.withTransaction || !context?.actorId)
        throw new Error('SETTINGS_ATOMIC_CONTEXT_REQUIRED');
      await this.atomicMutations.execute(
        {
          domain: 'SETTINGS',
          aggregateType: 'SETTING_ASSIGNMENT',
          aggregateId: assignment.id,
          action,
          context,
          auditMetadata: { ...metadata, assignmentId: assignment.id },
        },
        (transaction) => this.assignmentRepo.withTransaction!(transaction).save(assignment),
      );
    }
    return assignment.id;
  }
}

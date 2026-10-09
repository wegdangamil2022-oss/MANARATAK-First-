import { randomUUID } from 'node:crypto';
import {
  ISettingDefinitionRepository,
  SettingDefinitionPageQuery,
  SettingAssignmentPageQuery,
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
  SettingValidationRules,
  IIdentityRepository,
  LifeStatus,
} from '@manaratak/domain';
import {
  CreateSettingDefinitionInput,
  AssignSettingValueInput,
  RollbackSettingValueInput,
  UpdateSettingDefinitionInput,
  ClearSettingOverrideInput,
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
  validationRules?: SettingValidationRules;
  isFeatureFlag: boolean;
  isDeprecated: boolean;
  isSecret: boolean;
  revision?: string;
}

export interface SettingVersionAdminView {
  id: string;
  value: unknown;
  valueType: ValueType;
  authorId?: string;
  createdAt: Date;
  rollbackOfVersionId?: string;
  operation: 'SET' | 'CLEAR_OVERRIDE';
  changeReason?: string;
}

export interface SettingAssignmentAdminView {
  id: string;
  key: string;
  level: ScopeLevel;
  scopeId?: string;
  currentVersionId: string;
  currentValue: unknown;
  isOverrideCleared: boolean;
  versions: SettingVersionAdminView[];
  versionCount?: number;
  isWritable?: boolean;
}

export class ManageSettingsUseCase {
  constructor(
    private definitionRepo: ISettingDefinitionRepository,
    private assignmentRepo: ISettingAssignmentRepository,
    private validationService: ConfigurationValidationService,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
    private readonly identityRepository?: Pick<IIdentityRepository, 'findById'>,
  ) {}

  public async listDefinitions(): Promise<SettingDefinitionAdminView[]> {
    const definitions = await this.definitionRepo.findAll();
    return definitions.map((definition) => ({
      id: definition.id,
      revision: definition.revision,
      key: definition.key.getValue(),
      valueType: definition.valueType,
      description: definition.description,
      defaultValue: definition.isSecret ? undefined : definition.defaultValue,
      validationRules: definition.validationRules,
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
        operation: version.operation,
        changeReason: redact ? undefined : version.changeReason,
      }));
      const currentVersion = assignment.getCurrentVersion();
      views.push({
        id: assignment.id,
        key,
        level: assignment.scope.getLevel(),
        scopeId: assignment.scope.getScopeId(),
        currentVersionId: currentVersion.id,
        currentValue: redact ? '********' : assignment.isOverrideCleared ? null : currentVersion.value.getValue(),
        isOverrideCleared: assignment.isOverrideCleared,
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

  public async listAssignmentSummaries(filters: { key?: string; level?: ScopeLevel; scopeId?: string } = {}) {
    if (!this.assignmentRepo.readSummaries) throw new Error('Settings summary reader unavailable');
    const summaries = await this.assignmentRepo.readSummaries(filters);
    const definitions = new Map<string, SettingDefinition | null>();
    const views: SettingAssignmentAdminView[] = [];
    for (const row of summaries) {
      if (!definitions.has(row.key)) definitions.set(row.key, await this.definitionRepo.findByKey(new NamespacedKey(row.key)));
      const definition = definitions.get(row.key);
      const redact = !definition || definition.isSecret;
      views.push({ id: row.id, key: row.key, level: row.scope.getLevel(), scopeId: row.scope.getScopeId(),
        currentVersionId: row.currentVersion.id, isOverrideCleared: row.currentVersion.operation === 'CLEAR_OVERRIDE',
        currentValue: redact ? '********' : row.currentVersion.operation === 'CLEAR_OVERRIDE' ? null : row.currentVersion.value.getValue(),
        versionCount: row.versionCount, versions: [] });
    }
    return views;
  }

  private definitionView(definition: SettingDefinition): SettingDefinitionAdminView {
    return { id: definition.id, key: definition.key.getValue(), revision: definition.revision,
      valueType: definition.valueType, description: definition.description,
      defaultValue: definition.isSecret ? undefined : definition.defaultValue, validationRules: definition.validationRules, isFeatureFlag: definition.isFeatureFlag,
      isSecret: definition.isSecret, isDeprecated: definition.isDeprecated };
  }

  public async definitionPage(query: SettingDefinitionPageQuery) {
    if (!this.definitionRepo.findPage) throw new Error('SETTINGS_DURABLE_PAGE_READER_UNAVAILABLE');
    const page = await this.definitionRepo.findPage(query);
    return { definitions: page.items.map(item => this.definitionView(item)), nextCursor: page.nextCursor };
  }

  public async assignmentPage(query: SettingAssignmentPageQuery) {
    if (!this.assignmentRepo.readSummaryPage || !this.definitionRepo.findByKeys) throw new Error('SETTINGS_DURABLE_PAGE_READER_UNAVAILABLE');
    const page = await this.assignmentRepo.readSummaryPage(query);
    const definitions = new Map((await this.definitionRepo.findByKeys([...new Set(page.items.map(item => item.key))])).map(item => [item.key.getValue(), item]));
    const assignments = page.items.map(row => {
      const definition = definitions.get(row.key);
      const redact = !definition || definition.isSecret;
      return { id: row.id, key: row.key, level: row.scope.getLevel(), scopeId: row.scope.getScopeId(),
        currentVersionId: row.currentVersion.id, isOverrideCleared: row.currentVersion.operation === 'CLEAR_OVERRIDE',
        currentValue: redact ? '********' : row.currentVersion.operation === 'CLEAR_OVERRIDE' ? null : row.currentVersion.value.getValue(),
        versionCount: row.versionCount, versions: [], isWritable: !!definition && !definition.isSecret && !definition.isDeprecated };
    });
    return { assignments, nextCursor: page.nextCursor };
  }

  public async assignmentContext(key: string, level: ScopeLevel, scopeId?: string) {
    const scope = new ScopeIdentifier(level, scopeId);
    const definition = await this.definitionRepo.findByKey(new NamespacedKey(key));
    if (!definition) throw new Error('SETTINGS_DEFINITION_NOT_FOUND');
    // Unique key/scope lookup is independent of the currently displayed page/filter.
    const page = await this.assignmentPage({ key, level, scopeId: scope.getScopeId() ?? 'GLOBAL', limit: 1 });
    return { definition: this.definitionView(definition), assignment: page.assignments[0] ?? null };
  }

  public async assignmentHistory(id: string, expectedCurrentVersionId: string, limit = 50, cursor?: string) {
    if (!this.assignmentRepo.readHistory) throw new Error('Settings history reader unavailable');
    const page = await this.assignmentRepo.readHistory(id, expectedCurrentVersionId, limit, cursor);
    const definition = await this.definitionRepo.findByKey(new NamespacedKey(page.key));
    const redact = !definition || definition.isSecret;
    return { nextCursor: page.nextCursor, versions: page.versions.map(version => ({
      id: version.id, value: redact ? '********' : version.value.getValue(), valueType: version.value.type,
      createdAt: version.createdAt, authorId: version.authorId, rollbackOfVersionId: version.rollbackOfVersionId,
      operation: version.operation, changeReason: redact ? undefined : version.changeReason,
    })) };
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
        validationRules: input.validationRules,
        isFeatureFlag: input.isFeatureFlag || false,
        isDeprecated: false,
        isSecret: input.isSecret || false,
      },
      true,
    );

    const correlationId = context?.correlationId ?? randomUUID();
    if (!this.atomicMutations) return this.definitionRepo.save(definition, { correlationId });
    if (!this.definitionRepo.withTransaction || !context?.actorId)
      throw new Error('SETTINGS_ATOMIC_CONTEXT_REQUIRED');
    await this.atomicMutations.execute(
      {
        domain: 'SETTINGS',
        aggregateType: 'SETTING_DEFINITION',
        aggregateId: definition.id,
        action: 'CREATE_SETTING_DEFINITION',
        context: { ...context!, correlationId },
        auditMetadata: {
          key: input.key,
          valueType: input.valueType,
          isSecret: input.isSecret,
          isFeatureFlag: input.isFeatureFlag,
        },
      },
      (transaction) => this.definitionRepo.withTransaction!(transaction).save(definition, { correlationId }),
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

    const changeReason = this.changeReason(input.changeReason, definition.isFeatureFlag);
    const scope = new ScopeIdentifier(input.level, input.scopeId);
    await this.assertAdminWritableScope(scope);
    const valueData = this.createValueData(input.type, input.value);

    this.validationService.validate(definition, valueData);

    let assignment = await this.assignmentRepo.findByScopeAndKey(scope, key);
    if (
      input.expectedCurrentVersionId !== undefined &&
      (assignment?.getCurrentVersion().id ?? null) !== input.expectedCurrentVersionId
    )
      throw new Error('SETTINGS_VERSION_CONFLICT: Reload the current value before saving.');
    if (assignment) {
      assignment.updateValue(input.versionId, valueData, input.authorId, changeReason);
    } else {
      const version = new SettingVersion(input.versionId, valueData, new Date(), input.authorId, undefined, 'SET', changeReason);
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
      changeReason,
    });
  }

  public async rollbackValue(
    input: RollbackSettingValueInput & { expectedCurrentVersionId?: string },
    context?: AtomicMutationRequestContext,
  ): Promise<string> {
    const assignment = await this.findAssignment(input.assignmentId);

    if (!assignment) {
      throw new Error('Assignment not found');
    }
    await this.assertAdminWritableScope(assignment.scope);

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

    const changeReason = this.changeReason(input.changeReason, true)!;
    assignment.rollbackTo(input.previousVersionId, input.newVersionId, input.authorId, changeReason);
    return this.persistAssignment(assignment, 'ROLLBACK_SETTING_VALUE', context, {
      previousVersionId: input.previousVersionId,
      newVersionId: input.newVersionId,
      changeReason,
    });
  }

  private async assertAdminWritableScope(scope: ScopeIdentifier): Promise<void> {
    // Historical overrides remain readable. Neither TENANT nor DOMAIN currently has
    // an approved canonical owner selector, so Admin cannot write guessed IDs.
    if (scope.getLevel() === ScopeLevel.TENANT) throw new Error('SETTINGS_TENANT_SCOPE_UNAPPROVED');
    if (scope.getLevel() === ScopeLevel.DOMAIN) throw new Error('SETTINGS_DOMAIN_SCOPE_UNAPPROVED');
    if (scope.getLevel() !== ScopeLevel.IDENTITY) return;
    if (!this.identityRepository) throw new Error('SETTINGS_IDENTITY_SCOPE_VALIDATOR_UNAVAILABLE');
    const identity = await this.identityRepository.findById(scope.getScopeId()!);
    if (!identity || identity.status === LifeStatus.PURGED) throw new Error('SETTINGS_IDENTITY_SCOPE_NOT_FOUND');
  }

  private changeReason(value: string | undefined, required: boolean): string | undefined {
    const normalized = value?.trim();
    if (!normalized && !required) return undefined;
    if (!normalized || normalized.length < 3 || normalized.length > 1000 || /[\u0000-\u001f\u007f]/.test(normalized))
      throw new Error('SETTINGS_CHANGE_REASON_REQUIRED');
    return normalized;
  }

  private async findAssignment(id: string): Promise<SettingAssignment | null> {
    if (this.assignmentRepo.findById) return this.assignmentRepo.findById(id);
    // Compatibility for non-production in-memory repositories only.
    return (await this.assignmentRepo.findBy({ isSatisfiedBy: item => item.id === id }))[0] ?? null;
  }

  public async definitionImpact(keyString: string): Promise<{ assignmentCount: number }> {
    const key = new NamespacedKey(keyString);
    if (!await this.definitionRepo.findByKey(key)) throw new Error('SETTINGS_DEFINITION_NOT_FOUND');
    if (!this.assignmentRepo.countByKey) throw new Error('SETTINGS_IMPACT_READ_MODEL_REQUIRED');
    return { assignmentCount: await this.assignmentRepo.countByKey(key) };
  }

  public async updateDefinition(input: UpdateSettingDefinitionInput, context?: AtomicMutationRequestContext): Promise<void> {
    const definition = await this.definitionRepo.findByKey(new NamespacedKey(input.key));
    if (!definition) throw new Error('SETTINGS_DEFINITION_NOT_FOUND');
    if (!definition.revision || definition.revision !== input.expectedRevision) throw new Error('SETTINGS_DEFINITION_CONFLICT');
    const changeReason = this.changeReason(input.changeReason, true)!;
    if (input.description !== undefined && input.description.length > 2000) throw new Error('SETTINGS_DESCRIPTION_INVALID');
    if (input.isDeprecated !== undefined && input.isDeprecated !== true) throw new Error('SETTINGS_DEFINITION_REACTIVATION_UNAVAILABLE');
    const impact = input.isDeprecated ? await this.definitionImpact(input.key) : undefined;
    const updated = definition.amendMetadata({ description: input.description?.trim(), isDeprecated: input.isDeprecated });
    const correlationId = context?.correlationId ?? randomUUID();
    if (!this.atomicMutations) return this.definitionRepo.save(updated, { correlationId });
    if (!this.definitionRepo.withTransaction || !context?.actorId) throw new Error('SETTINGS_ATOMIC_CONTEXT_REQUIRED');
    await this.atomicMutations.execute({ domain: 'SETTINGS', aggregateType: 'SETTING_DEFINITION', aggregateId: definition.id,
      action: 'UPDATE_SETTING_DEFINITION', context: { ...context!, correlationId },
      auditMetadata: { key: input.key, previousRevision: definition.revision, isDeprecated: updated.isDeprecated, changeReason, impact } },
      transaction => this.definitionRepo.withTransaction!(transaction).save(updated, { correlationId }));
  }

  public async clearOverride(input: ClearSettingOverrideInput, context?: AtomicMutationRequestContext): Promise<string> {
    const changeReason = this.changeReason(input.changeReason, true)!;
    const assignment = await this.findAssignment(input.assignmentId);
    if (!assignment) throw new Error('SETTINGS_ASSIGNMENT_NOT_FOUND');
    await this.assertAdminWritableScope(assignment.scope);
    if (assignment.getCurrentVersion().id !== input.expectedCurrentVersionId) throw new Error('SETTINGS_VERSION_CONFLICT');
    const definition = await this.definitionRepo.findByKey(assignment.key);
    if (!definition || definition.isDeprecated || definition.isSecret) throw new Error('SETTINGS_DEFINITION_NOT_WRITABLE');
    assignment.clearOverride(input.newVersionId, input.authorId, changeReason);
    return this.persistAssignment(assignment, 'CLEAR_SETTING_OVERRIDE', context, { key: assignment.key.getValue(),
      level: assignment.scope.getLevel(), scopeId: assignment.scope.getScopeId(),
      previousVersionId: input.expectedCurrentVersionId, newVersionId: input.newVersionId, changeReason });
  }

  private async persistAssignment(
    assignment: SettingAssignment,
    action: string,
    context: AtomicMutationRequestContext | undefined,
    metadata: Record<string, unknown>,
  ): Promise<string> {
    const correlationId = context?.correlationId ?? randomUUID();
    if (!this.atomicMutations) await this.assignmentRepo.save(assignment, { correlationId });
    else {
      if (!this.assignmentRepo.withTransaction || !context?.actorId)
        throw new Error('SETTINGS_ATOMIC_CONTEXT_REQUIRED');
      await this.atomicMutations.execute(
        {
          domain: 'SETTINGS',
          aggregateType: 'SETTING_ASSIGNMENT',
          aggregateId: assignment.id,
          action,
          context: { ...context!, correlationId },
          auditMetadata: { ...metadata, assignmentId: assignment.id },
        },
        (transaction) => this.assignmentRepo.withTransaction!(transaction).save(assignment, { correlationId }),
      );
    }
    return assignment.id;
  }
}

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
  SettingValueData
} from '@manaratak/domain';
import { CreateSettingDefinitionInput, AssignSettingValueInput, RollbackSettingValueInput } from '../dtos/SettingsDtos';

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
    private validationService: ConfigurationValidationService
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

  public async listAssignments(filters: { key?: string; level?: ScopeLevel; scopeId?: string } = {}): Promise<SettingAssignmentAdminView[]> {
    const assignments = await this.assignmentRepo.findBy({
      isSatisfiedBy: (assignment: SettingAssignment) => {
        if (filters.key && assignment.key.getValue() !== filters.key) return false;
        if (filters.level && assignment.scope.getLevel() !== filters.level) return false;
        if (filters.scopeId && assignment.scope.getScopeId() !== filters.scopeId) return false;
        return true;
      }
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
      const redact = definition?.isSecret === true;
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

    return views.sort((a, b) => a.key.localeCompare(b.key) || a.level.localeCompare(b.level) || (a.scopeId ?? '').localeCompare(b.scopeId ?? ''));
  }

  public async createDefinition(input: CreateSettingDefinitionInput): Promise<void> {
    const key = new NamespacedKey(input.key);
    const existing = await this.definitionRepo.findByKey(key);
    if (existing) {
      throw new Error(`Setting definition for key ${input.key} already exists.`);
    }
    if (input.isSecret && input.defaultValue !== undefined && input.defaultValue !== null) {
      throw new Error('Secret settings cannot persist default values. Use the approved runtime secret provider.');
    }

    const definition = new SettingDefinition({
      id: input.id,
      key,
      valueType: input.valueType,
      description: input.description,
      defaultValue: input.defaultValue,
      isFeatureFlag: input.isFeatureFlag || false,
      isDeprecated: false,
      isSecret: input.isSecret || false
    }, true);

    await this.definitionRepo.save(definition);
  }

  private createValueData(type: ValueType, value: unknown): SettingValueData {
    switch (type) {
      case ValueType.String: return new StringValue(value as string);
      case ValueType.Number: return new NumberValue(value as number);
      case ValueType.Boolean: return new BooleanValue(value as boolean);
      case ValueType.Json: return new JsonValue(value as Record<string, unknown>);
      default: throw new Error(`Unsupported value type: ${type}`);
    }
  }

  public async assignValue(input: AssignSettingValueInput): Promise<void> {
    const key = new NamespacedKey(input.key);
    const definition = await this.definitionRepo.findByKey(key);
    if (!definition) {
      throw new Error(`Setting definition ${input.key} not found.`);
    }
    if (definition.isDeprecated) {
      throw new Error(`Setting definition ${input.key} is deprecated and cannot receive new values.`);
    }
    if (definition.isSecret) {
      throw new Error('Secret values cannot be written through the Settings API. Use the approved runtime secret provider.');
    }

    const scope = new ScopeIdentifier(input.level, input.scopeId);
    const valueData = this.createValueData(input.type, input.value);

    this.validationService.validate(definition, valueData);

    let assignment = await this.assignmentRepo.findByScopeAndKey(scope, key);
    if (assignment) {
      assignment.updateValue(input.versionId, valueData, input.authorId);
    } else {
      const version = new SettingVersion(input.versionId, valueData, new Date(), input.authorId);
      assignment = new SettingAssignment({
        id: input.assignmentId,
        key,
        scope,
        versions: [version]
      }, true);
    }

    await this.assignmentRepo.save(assignment);
  }

  public async rollbackValue(input: RollbackSettingValueInput): Promise<void> {
    const assignments = await this.assignmentRepo.findBy({
      isSatisfiedBy: (a: SettingAssignment) => a.id === input.assignmentId
    });
    const assignment = assignments[0];

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const definition = await this.definitionRepo.findByKey(assignment.key);
    if (definition?.isSecret) {
      throw new Error('Secret values cannot be rolled back through the Settings API. Use the approved runtime secret provider.');
    }

    assignment.rollbackTo(input.previousVersionId, input.newVersionId, input.authorId);
    await this.assignmentRepo.save(assignment);
  }
}

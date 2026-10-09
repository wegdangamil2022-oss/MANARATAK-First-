import { describe, it, expect, beforeEach } from 'vitest';
import {
  ISettingDefinitionRepository,
  ISettingAssignmentRepository,
  SettingDefinition,
  SettingAssignment,
  NamespacedKey,
  ScopeIdentifier,
  ConfigurationValidationService,
  ValueType
} from '@manaratak/domain';
import { ManageSettingsUseCase } from '../../src/settings/use-cases/ManageSettingsUseCase';

class InMemoryDefinitionRepository implements ISettingDefinitionRepository {
  private definitions = new Map<string, SettingDefinition>();

  async findByKey(key: NamespacedKey): Promise<SettingDefinition | null> {
    return this.definitions.get(key.getValue()) || null;
  }

  async findAll(): Promise<SettingDefinition[]> {
    return Array.from(this.definitions.values());
  }

  async save(definition: SettingDefinition): Promise<void> {
    this.definitions.set(definition.key.getValue(), definition);
  }
}

class InMemoryAssignmentRepository implements ISettingAssignmentRepository {
  private assignments = new Map<string, SettingAssignment>();

  private makeKey(scope: ScopeIdentifier, key: NamespacedKey): string {
    return `${scope.getLevel()}:${scope.getScopeId() || 'GLOBAL'}:${key.getValue()}`;
  }

  async findByScopeAndKey(scope: ScopeIdentifier, key: NamespacedKey): Promise<SettingAssignment | null> {
    return this.assignments.get(this.makeKey(scope, key)) || null;
  }

  async findBy(spec: { isSatisfiedBy: (assignment: SettingAssignment) => boolean }): Promise<SettingAssignment[]> {
    return Array.from(this.assignments.values()).filter((a) => spec.isSatisfiedBy(a));
  }

  async save(assignment: SettingAssignment): Promise<void> {
    this.assignments.set(this.makeKey(assignment.scope, assignment.key), assignment);
  }
}

describe('ManageSettingsUseCase', () => {
  let defRepo: InMemoryDefinitionRepository;
  let assignRepo: InMemoryAssignmentRepository;
  let validationService: ConfigurationValidationService;
  let useCase: ManageSettingsUseCase;

  beforeEach(() => {
    defRepo = new InMemoryDefinitionRepository();
    assignRepo = new InMemoryAssignmentRepository();
    validationService = new ConfigurationValidationService();
    useCase = new ManageSettingsUseCase(defRepo, assignRepo, validationService);
  });

  it('creates setting definition and assigns values cleanly', async () => {
    await useCase.createDefinition({
      id: 'def-1',
      key: 'system.maintenance_mode',
      valueType: ValueType.Boolean,
      description: 'System maintenance flag',
      defaultValue: false,
    });

    const savedDef = await defRepo.findByKey(new NamespacedKey('system.maintenance_mode'));
    expect(savedDef).not.toBeNull();
    expect(savedDef?.key.getValue()).toBe('system.maintenance_mode');

    await useCase.assignValue({
      assignmentId: 'assign-1',
      key: 'system.maintenance_mode',
      level: 'GLOBAL',
      versionId: 'v1',
      value: true,
      type: ValueType.Boolean,
      authorId: 'admin-user',
    });

    const scope = new ScopeIdentifier('GLOBAL');
    const key = new NamespacedKey('system.maintenance_mode');
    const assignment = await assignRepo.findByScopeAndKey(scope, key);

    expect(assignment).not.toBeNull();
    expect(assignment?.getCurrentVersion().value.getValue()).toBe(true);
  });

  it('rejects database writes for secret definitions', async () => {
    await useCase.createDefinition({ id: 'secret-1', key: 'integration.provider.key', valueType: ValueType.String, isSecret: true });
    await expect(useCase.assignValue({
      assignmentId: 'assign-secret', key: 'integration.provider.key', level: 'GLOBAL', versionId: 'v-secret', value: 'raw-secret', type: ValueType.String, authorId: 'admin-1'
    })).rejects.toThrow(/Secret values cannot be written/);
  });

  it('supports version update and rollback', async () => {
    await useCase.createDefinition({
      id: 'def-2',
      key: 'ui.theme',
      valueType: ValueType.String,
      defaultValue: 'light',
    });

    await useCase.assignValue({
      assignmentId: 'assign-2',
      key: 'ui.theme',
      level: 'DOMAIN',
      scopeId: 'courses',
      versionId: 'v1',
      value: 'dark',
      type: ValueType.String,
      authorId: 'admin-1',
    });

    await useCase.assignValue({
      assignmentId: 'assign-2',
      key: 'ui.theme',
      level: 'DOMAIN',
      scopeId: 'courses',
      versionId: 'v2',
      value: 'twilight',
      type: ValueType.String,
      authorId: 'admin-2',
    });

    await expect(useCase.assignValue({
      assignmentId: 'assign-2', key: 'ui.theme', level: 'DOMAIN', scopeId: 'courses', versionId: 'v2', value: 'overwrite', type: ValueType.String, authorId: 'admin-3'
    })).rejects.toThrow(/already exists/);

    await useCase.rollbackValue({
      assignmentId: 'assign-2',
      previousVersionId: 'v1',
      changeReason: 'Restore reviewed prior theme',
      newVersionId: 'v3',
      authorId: 'admin-1',
    });

    const scope = new ScopeIdentifier('DOMAIN', 'courses');
    const key = new NamespacedKey('ui.theme');
    const assignment = await assignRepo.findByScopeAndKey(scope, key);

    expect(assignment?.getCurrentVersion().id).toBe('v3');
    expect(assignment?.getCurrentVersion().value.getValue()).toBe('dark');
  });
  it('rejects out-of-bounds configuration values before any assignment write', async () => {
    await useCase.createDefinition({ id: 'constrained', key: 'upload.max_files', valueType: ValueType.Number,
      defaultValue: 10, validationRules: { min: 1, max: 50, integer: true } });
    const invalid = { assignmentId: 'outside', key: 'upload.max_files', level: 'GLOBAL',
      versionId: 'v1', value: 100, type: ValueType.Number };
    await expect(useCase.assignValue(invalid)).rejects.toThrow('SETTINGS_VALUE_OUTSIDE_CONSTRAINTS');
    expect(await assignRepo.findByScopeAndKey(new ScopeIdentifier('GLOBAL'), new NamespacedKey('upload.max_files'))).toBeNull();
    await useCase.assignValue({ ...invalid, value: 20 });
    expect((await assignRepo.findByScopeAndKey(new ScopeIdentifier('GLOBAL'), new NamespacedKey('upload.max_files')))
      ?.getCurrentVersion().value.getValue()).toBe(20);
  });
  it('rejects feature flags without an explicit default before persisting anything', async () => {
    await expect(useCase.createDefinition({ id: 'flag', key: 'feature.safe', valueType: ValueType.Boolean,
      isFeatureFlag: true })).rejects.toThrow('SETTINGS_FEATURE_FLAG_BOOLEAN_DEFAULT_REQUIRED');
    expect(await defRepo.findByKey(new NamespacedKey('feature.safe'))).toBeNull();
  });
  it('rejects a hidden GLOBAL identifier before writing a version', async () => {
    await useCase.createDefinition({ id: 'def', key: 'feature.safe', valueType: ValueType.Boolean, defaultValue: false });
    await expect(useCase.assignValue({ assignmentId: 'hidden', key: 'feature.safe', level: 'GLOBAL',
      scopeId: 'hidden-id', versionId: 'v1', value: true, type: ValueType.Boolean }))
      .rejects.toThrow('SETTINGS_GLOBAL_SCOPE_ID_FORBIDDEN');
    expect(await assignRepo.findByScopeAndKey(new ScopeIdentifier('GLOBAL'), new NamespacedKey('feature.safe'))).toBeNull();
  });

});

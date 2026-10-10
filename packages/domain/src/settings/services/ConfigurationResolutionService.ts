import { NamespacedKey } from '../value-objects/NamespacedKey';
import { ScopeIdentifier } from '../value-objects/ScopeIdentifier';
import { ScopeLevel } from '../enums/ScopeLevel';
import { ISettingDefinitionRepository } from '../repositories/ISettingDefinitionRepository';
import { ISettingAssignmentRepository } from '../repositories/ISettingAssignmentRepository';
import { ConfigurationValidationService } from './ConfigurationValidationService';
import { ConfigurationResolutionContext, IResolvedSettingsReader, ResolvedSetting, SettingResolutionStep } from './IResolvedSettingsReader';
export type { ConfigurationResolutionContext } from './IResolvedSettingsReader';

// Compatibility only: the database reader never returns secret material, regardless of this option.
export interface ResolutionOptions { allowSecrets?: boolean; }

export class ConfigurationResolutionService implements IResolvedSettingsReader {
  constructor(
    private readonly definitionRepo: ISettingDefinitionRepository,
    private readonly assignmentRepo: ISettingAssignmentRepository,
  ) {}

  public async readSetting(keyString: string, context: ConfigurationResolutionContext = {}): Promise<ResolvedSetting> {
    const key = new NamespacedKey(keyString);
    const base = { key: key.getValue(), usedDefault: false, chain: [] as SettingResolutionStep[] };
    const definition = await this.definitionRepo.findByKey(key);
    if (!definition) return { ...base, status: 'NOT_DEFINED' };
    const metadata = { ...base, definitionId: definition.id, valueType: definition.valueType };
    if (definition.isSecret) return { ...metadata, status: 'SECRET_UNAVAILABLE' };
    if (definition.isDeprecated) return { ...metadata, status: 'DEPRECATED' };
    const chain = metadata.chain;
    const scopes: Array<[ScopeLevel, string | undefined]> = [
      [ScopeLevel.IDENTITY, context.identityId], [ScopeLevel.TENANT, context.tenantId],
      [ScopeLevel.DOMAIN, context.domainId], [ScopeLevel.GLOBAL, undefined],
    ];
    const validation = new ConfigurationValidationService();
    for (const [level, rawId] of scopes) {
      const scopeId = rawId?.trim() || undefined;
      if (level !== ScopeLevel.GLOBAL && !scopeId) {
        chain.push({ scope: level, status: 'NOT_APPLICABLE' }); continue;
      }
      const assignment = await this.assignmentRepo.findByScopeAndKey(new ScopeIdentifier(level, scopeId), key);
      if (!assignment) { chain.push({ scope: level, scopeId, status: 'NO_OVERRIDE' }); continue; }
      const version = assignment.getCurrentVersion();
      if (assignment.isOverrideCleared) {
        chain.push({ scope: level, scopeId, status: 'INHERITED', versionId: version.id }); continue;
      }
      validation.validate(definition, version.value);
      chain.push({ scope: level, scopeId, status: 'VALUE', versionId: version.id, value: version.value.getValue() });
    }
    chain.push(definition.defaultValue !== undefined && definition.defaultValue !== null
      ? { scope: 'DEFAULT', status: 'VALUE', value: definition.defaultValue }
      : { scope: 'DEFAULT', status: 'NO_OVERRIDE' });
    const winner = chain.find(step => step.status === 'VALUE');
    if (!winner) return { ...metadata, status: 'NO_VALUE' };
    winner.winner = true;
    return { ...metadata, status: 'RESOLVED', value: winner.value,
      sourceScope: winner.scope, sourceScopeId: winner.scopeId, versionId: winner.versionId,
      usedDefault: winner.scope === 'DEFAULT' };
  }

  public async resolve(key: NamespacedKey, context: ConfigurationResolutionContext = {}, _options?: ResolutionOptions): Promise<unknown> {
    const result = await this.readSetting(key.getValue(), context);
    return result.status === 'RESOLVED' ? result.value : null;
  }
}

import { NamespacedKey } from '../value-objects/NamespacedKey';
import { ScopeIdentifier } from '../value-objects/ScopeIdentifier';
import { ScopeLevel } from '../enums/ScopeLevel';
import { ISettingDefinitionRepository } from '../repositories/ISettingDefinitionRepository';
import { ISettingAssignmentRepository } from '../repositories/ISettingAssignmentRepository';

export interface ResolutionOptions {
  allowSecrets?: boolean;
}

export interface ConfigurationResolutionContext {
  identityId?: string;
  tenantId?: string;
  domainId?: string;
}

export class ConfigurationResolutionService {
  constructor(
    private readonly definitionRepo: ISettingDefinitionRepository,
    private readonly assignmentRepo: ISettingAssignmentRepository
  ) {}

  public async resolve(
    key: NamespacedKey,
    context: ConfigurationResolutionContext = {},
    options?: ResolutionOptions
  ): Promise<unknown> {
    const definition = await this.definitionRepo.findByKey(key);
    if (!definition) return null;

    // Settings may describe a secret-bearing capability, but secret material is
    // never stored/resolved from this database-backed context.
    if (definition.isSecret) {
      return options?.allowSecrets ? null : '********';
    }

    const resolveAt = async (level: ScopeLevel, scopeId?: string) => {
      if (level !== ScopeLevel.GLOBAL && !scopeId?.trim()) return null;
      return this.assignmentRepo.findByScopeAndKey(new ScopeIdentifier(level, scopeId), key);
    };

    const identityAssignment = await resolveAt(ScopeLevel.IDENTITY, context.identityId);
    if (identityAssignment) return identityAssignment.getCurrentVersion().value.getValue();

    const tenantAssignment = await resolveAt(ScopeLevel.TENANT, context.tenantId);
    if (tenantAssignment) return tenantAssignment.getCurrentVersion().value.getValue();

    const domainAssignment = await resolveAt(ScopeLevel.DOMAIN, context.domainId);
    if (domainAssignment) return domainAssignment.getCurrentVersion().value.getValue();

    const globalAssignment = await resolveAt(ScopeLevel.GLOBAL);
    if (globalAssignment) return globalAssignment.getCurrentVersion().value.getValue();

    return definition.defaultValue ?? null;
  }
}

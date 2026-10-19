import { Prisma, type PrismaClient } from '@prisma/client';
import {
  validateSettingsDependencyPolicy,
  evaluateSettingsDependencies,
  validateSettingRuleValue,
  ValueType,
  NumberValue,
  StringValue,
  BooleanValue,
  JsonValue,
  type SettingsDependencyPolicy,
  type SettingValidationRules,
} from '@absheer/domain';
export interface SettingsValueChange {
  key: string;
  level: string;
  scopeId?: string;
  value?: unknown;
  cleared?: boolean;
}
type Client = PrismaClient | Prisma.TransactionClient;
export class PrismaSettingsDependencyGuard {
  constructor(private readonly db: Client) {}
  async lock() {
    await this.db
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'settings-governance'},0))::text`;
  }
  async policy() {
    const row = await this.db.settingsGovernanceRecord.findUnique({
      where: { id: 'dependencies' },
    });
    return {
      revision: row?.revision ?? 0,
      policy: row ? validateSettingsDependencyPolicy(row.payload) : { rules: [] },
    };
  }
  private typed(type: string, value: unknown) {
    switch (type) {
      case 'Number':
        new NumberValue(value as number);
        break;
      case 'String':
        new StringValue(value as string);
        break;
      case 'Boolean':
        new BooleanValue(value as boolean);
        break;
      case 'Json':
        new JsonValue(value as Record<string, unknown>);
        break;
      default:
        throw new Error('SETTINGS_DEPENDENCY_DEFINITION_INVALID');
    }
  }
  async read(
    key: string,
    context: { domainId?: string; identityId?: string },
    changes: SettingsValueChange[] = [],
    deprecatedKeys: string[] = [],
  ) {
    const definition = await this.db.settingDefinitionRecord.findUnique({ where: { key } });
    if (!definition || definition.isDeprecated || deprecatedKeys.includes(key))
      return { available: false };
    if (definition.isSecret) throw new Error('SETTINGS_DEPENDENCY_SECRET_FORBIDDEN');
    for (const [level, scopeId] of [
      ['IDENTITY', context.identityId],
      ['DOMAIN', context.domainId],
      ['GLOBAL', 'GLOBAL'],
    ] as const) {
      if (!scopeId) continue;
      const overlay = changes.find(
        (change) =>
          change.key === key && change.level === level && (change.scopeId ?? 'GLOBAL') === scopeId,
      );
      if (overlay) {
        if (overlay.cleared) continue;
        this.typed(definition.valueType, overlay.value);
        return { available: true, value: overlay.value };
      }
      const assignment = await this.db.settingAssignmentRecord.findUnique({
        where: { key_scopeLevel_scopeId: { key, scopeLevel: level, scopeId } },
        include: { currentVersion: true },
      });
      if (assignment && assignment.currentVersion.operation !== 'CLEAR_OVERRIDE') {
        this.typed(definition.valueType, assignment.currentVersion.value);
        validateSettingRuleValue(
          definition.valueType as ValueType,
          assignment.currentVersion.value,
          definition.validationRules == null
            ? undefined
            : (definition.validationRules as unknown as SettingValidationRules),
        );
        return { available: true, value: assignment.currentVersion.value };
      }
    }
    if (definition.defaultValue != null) this.typed(definition.valueType, definition.defaultValue);
    return { available: definition.defaultValue != null, value: definition.defaultValue };
  }
  async assert(
    changes: SettingsValueChange[] = [],
    proposed?: SettingsDependencyPolicy,
    deprecatedKeys: string[] = [],
  ) {
    const policy = proposed ?? (await this.policy()).policy;
    // Only administrator-declared contexts are governed; no inferred tenant/domain dependencies.
    for (const rule of policy.rules) {
      for (const key of [rule.triggerKey, ...rule.requiredKeys]) {
        const definition = await this.db.settingDefinitionRecord.findUnique({ where: { key } });
        if (
          !definition ||
          definition.isSecret ||
          (key === rule.triggerKey && definition.valueType !== 'Boolean')
        )
          throw new Error('SETTINGS_DEPENDENCY_DEFINITION_INVALID');
      }
    }
    await evaluateSettingsDependencies(policy, (key, context) =>
      this.read(key, context, changes, deprecatedKeys),
    );
  }
}

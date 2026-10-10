import type { ValueType } from '../enums/ValueType';
import type { ScopeLevel } from '../enums/ScopeLevel';

export interface ConfigurationResolutionContext {
  identityId?: string;
  tenantId?: string;
  domainId?: string;
}
export interface SettingResolutionStep {
  scope: ScopeLevel | 'DEFAULT';
  scopeId?: string;
  status: 'NOT_APPLICABLE' | 'NO_OVERRIDE' | 'INHERITED' | 'VALUE';
  versionId?: string;
  value?: unknown;
  winner?: boolean;
}
export interface ResolvedSetting {
  status: 'RESOLVED' | 'NOT_DEFINED' | 'NO_VALUE' | 'SECRET_UNAVAILABLE' | 'DEPRECATED';
  key: string;
  definitionId?: string;
  valueType?: ValueType;
  value?: unknown;
  sourceScope?: ScopeLevel | 'DEFAULT';
  sourceScopeId?: string;
  versionId?: string;
  usedDefault: boolean;
  chain: SettingResolutionStep[];
}
/** Dynamic, non-secret settings only. Bootstrap and provider credentials stay external. */
export interface IResolvedSettingsReader {
  readSetting(key: string, context?: ConfigurationResolutionContext): Promise<ResolvedSetting>;
}

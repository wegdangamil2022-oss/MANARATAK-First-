import { ValueType, SettingValidationRules } from '@manaratak/domain';

export interface CreateSettingDefinitionInput {
  id: string;
  key: string;
  valueType: ValueType;
  description?: string;
  defaultValue?: unknown;
  validationRules?: SettingValidationRules;
  isFeatureFlag?: boolean;
  isSecret?: boolean;
}

export interface AssignSettingValueInput {
  assignmentId: string;
  key: string;
  level: string; // 'GLOBAL', 'TENANT', 'DOMAIN', 'IDENTITY'
  scopeId?: string;
  versionId: string;
  value: unknown;
  type: ValueType;
  authorId?: string;
  changeReason?: string;
}

export interface RollbackSettingValueInput {
  assignmentId: string;
  previousVersionId: string;
  newVersionId: string;
  authorId?: string;
  changeReason?: string;
}



export interface UpdateSettingDefinitionInput {
  key: string;
  expectedRevision: string;
  description?: string;
  isDeprecated?: true;
  changeReason: string;
}
export interface ClearSettingOverrideInput {
  assignmentId: string;
  expectedCurrentVersionId: string;
  newVersionId: string;
  authorId?: string;
  changeReason: string;
}

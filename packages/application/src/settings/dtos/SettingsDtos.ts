import { ValueType } from '@manaratak/domain';

export interface CreateSettingDefinitionInput {
  id: string;
  key: string;
  valueType: ValueType;
  description?: string;
  defaultValue?: unknown;
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
}

export interface RollbackSettingValueInput {
  assignmentId: string;
  previousVersionId: string;
  newVersionId: string;
  authorId?: string;
}



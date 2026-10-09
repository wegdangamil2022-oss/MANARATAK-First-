import { ValueType } from '../enums/ValueType';

export interface SettingValidationRules {
  min?: number;
  max?: number;
  integer?: boolean;
  minLength?: number;
  maxLength?: number;
  allowedValues?: Array<string | number | boolean>;
}

/**
 * An intentionally bounded schema for approved settings: no regex, arbitrary
 * JSON schema or executable expressions. Definition rules are immutable.
 */
export function validateSettingRuleDefinition(type: ValueType, rules?: SettingValidationRules): void {
  if (rules === undefined) return;
  if (!rules || typeof rules !== 'object' || Array.isArray(rules) ||
      !Object.keys(rules).length || Object.keys(rules).some(key =>
        !['min', 'max', 'integer', 'minLength', 'maxLength', 'allowedValues'].includes(key)))
    throw new Error('SETTINGS_VALIDATION_RULES_INVALID');

  const numberFields = ['min', 'max', 'integer'];
  const stringFields = ['minLength', 'maxLength'];
  const keys = Object.keys(rules);
  if (type === ValueType.Json || (type !== ValueType.Number && numberFields.some(key => keys.includes(key))) ||
      (type !== ValueType.String && stringFields.some(key => keys.includes(key))))
    throw new Error('SETTINGS_VALIDATION_RULES_TYPE_MISMATCH');

  if (rules.min !== undefined && (typeof rules.min !== 'number' || !Number.isFinite(rules.min))) throw new Error('SETTINGS_VALIDATION_RULES_INVALID');
  if (rules.max !== undefined && (typeof rules.max !== 'number' || !Number.isFinite(rules.max))) throw new Error('SETTINGS_VALIDATION_RULES_INVALID');
  if (rules.integer !== undefined && typeof rules.integer !== 'boolean') throw new Error('SETTINGS_VALIDATION_RULES_INVALID');
  if (rules.min !== undefined && rules.max !== undefined && rules.min > rules.max) throw new Error('SETTINGS_VALIDATION_RULES_INVALID');
  for (const field of [rules.minLength, rules.maxLength]) {
    if (field !== undefined && (!Number.isSafeInteger(field) || field < 0 || field > 100000))
      throw new Error('SETTINGS_VALIDATION_RULES_INVALID');
  }
  if (rules.minLength !== undefined && rules.maxLength !== undefined && rules.minLength > rules.maxLength)
    throw new Error('SETTINGS_VALIDATION_RULES_INVALID');

  if (rules.allowedValues !== undefined) {
    const values = rules.allowedValues;
    if (!Array.isArray(values) || values.length < 1 || values.length > 50 ||
        !values.every(value =>
          (type === ValueType.String && typeof value === 'string') ||
          (type === ValueType.Number && typeof value === 'number' && Number.isFinite(value)) ||
          (type === ValueType.Boolean && typeof value === 'boolean')) ||
        new Set(values).size !== values.length)
      throw new Error('SETTINGS_VALIDATION_RULES_INVALID');
  }
}

export function validateSettingRuleValue(type: ValueType, value: unknown, rules?: SettingValidationRules): void {
  if (!rules) return;
  // The value's type is validated separately, before this function is invoked.
  if (type === ValueType.Number) {
    const number = value as number;
    if ((rules.min !== undefined && number < rules.min) ||
        (rules.max !== undefined && number > rules.max) ||
        (rules.integer === true && !Number.isInteger(number)))
      throw new Error('SETTINGS_VALUE_OUTSIDE_CONSTRAINTS');
  }
  if (type === ValueType.String) {
    const length = (value as string).length;
    if ((rules.minLength !== undefined && length < rules.minLength) ||
        (rules.maxLength !== undefined && length > rules.maxLength))
      throw new Error('SETTINGS_VALUE_OUTSIDE_CONSTRAINTS');
  }
  if (rules.allowedValues && !rules.allowedValues.includes(value as string | number | boolean))
    throw new Error('SETTINGS_VALUE_OUTSIDE_CONSTRAINTS');
}

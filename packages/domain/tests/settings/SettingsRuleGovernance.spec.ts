import { describe, expect, it } from 'vitest';
import { SettingDefinition } from '../../src/settings/entities/SettingDefinition';
import { NamespacedKey } from '../../src/settings/value-objects/NamespacedKey';
import { NumberValue, StringValue } from '../../src/settings/value-objects/SettingValueData';
import { ValueType } from '../../src/settings/enums/ValueType';
import { SettingValidationRules } from '../../src/settings/value-objects/SettingValidationRules';
import { ConfigurationValidationService } from '../../src/settings/services/ConfigurationValidationService';

function numberDefinition(rules: Record<string, unknown>, defaultValue: unknown = 10) {
  return new SettingDefinition({ id: 'number', key: new NamespacedKey('upload.max_files'),
    valueType: ValueType.Number, defaultValue,
    validationRules: rules as unknown as SettingValidationRules }, false);
}

describe('Settings bounded definition constraint enforcement', () => {
  it('enforces numeric bounds/integer at default construction and assignment validation', () => {
    const definition = numberDefinition({ min: 1, max: 100, integer: true });
    const service = new ConfigurationValidationService();
    expect(() => service.validate(definition, new NumberValue(15))).not.toThrow();
    for (const value of [0, 101, 2.5])
      expect(() => service.validate(definition, new NumberValue(value))).toThrow('SETTINGS_VALUE_OUTSIDE_CONSTRAINTS');
    expect(() => numberDefinition({ min: 1, max: 100, integer: true }, 0)).toThrow('SETTINGS_VALUE_OUTSIDE_CONSTRAINTS');
  });
  it('enforces text lengths and finite scalar allowlists', () => {
    const definition = new SettingDefinition({ id: 'name', key: new NamespacedKey('site.theme'),
      valueType: ValueType.String, defaultValue: 'light',
      validationRules: { minLength: 4, maxLength: 6, allowedValues: ['light', 'dark'] } });
    const service = new ConfigurationValidationService();
    expect(() => service.validate(definition, new StringValue('dark'))).not.toThrow();
    expect(() => service.validate(definition, new StringValue('unknown'))).toThrow('SETTINGS_VALUE_OUTSIDE_CONSTRAINTS');
    expect(() => service.validate(definition, new StringValue('red'))).toThrow('SETTINGS_VALUE_OUTSIDE_CONSTRAINTS');
  });
  it('refuses invalid, type-incompatible and unbounded rule definitions', () => {
    for (const rules of [{ min: NaN }, { min: 10, max: 1 }, { integer: 'yes' },
      { minLength: -1 }, { minLength: 10, maxLength: 2 }, { allowedValues: [] },
      { allowedValues: [1, 1] }, { allowedValues: ['wrong type'] },
      { pattern: '(a+)+$' }, { jsonSchema: { type: 'object' } }]) {
      expect(() => numberDefinition(rules)).toThrow(/SETTINGS_VALIDATION_RULES_/);
    }
    expect(() => new SettingDefinition({ id: 'str', key: new NamespacedKey('site.name'),
      valueType: ValueType.String, validationRules: { min: 1 } })).toThrow('SETTINGS_VALIDATION_RULES_TYPE_MISMATCH');
    expect(() => new SettingDefinition({ id: 'json', key: new NamespacedKey('site.json'),
      valueType: ValueType.Json, validationRules: { maxLength: 2 } })).toThrow('SETTINGS_VALIDATION_RULES_TYPE_MISMATCH');
  });
  it('keeps rules immutable and retains them during metadata deprecation', () => {
    const definition = numberDefinition({ min: 1, allowedValues: [10, 20] });
    expect(Object.isFrozen(definition.validationRules)).toBe(true);
    expect(Object.isFrozen(definition.validationRules?.allowedValues)).toBe(true);
    expect(definition.amendMetadata({ isDeprecated: true }).validationRules).toEqual({ min: 1, allowedValues: [10, 20] });
  });
});

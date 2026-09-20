import { describe, it, expect } from 'vitest';
import { NamespacedKey } from '../../src/settings/value-objects/NamespacedKey';
import { ScopeIdentifier } from '../../src/settings/value-objects/ScopeIdentifier';
import { ValueType } from '../../src/settings/enums/ValueType';
import { StringValue, NumberValue, BooleanValue } from '../../src/settings/value-objects/SettingValueData';
import { SettingVersion } from '../../src/settings/value-objects/SettingVersion';
import { SettingDefinition } from '../../src/settings/entities/SettingDefinition';
import { SettingAssignment } from '../../src/settings/entities/SettingAssignment';
import { ConfigurationValidationService } from '../../src/settings/services/ConfigurationValidationService';

describe('Setting Core Domain Objects', () => {
  it('validates value type compatibility in ConfigurationValidationService', () => {
    const key = new NamespacedKey('site.max_upload_mb');
    const def = new SettingDefinition({
      id: 'def-1',
      key,
      valueType: ValueType.Number,
      defaultValue: 50,
    });

    const validationService = new ConfigurationValidationService();
    const validValue = new NumberValue(100);
    expect(() => validationService.validate(def, validValue)).not.toThrow();

    const invalidValue = new StringValue('100MB');
    expect(() => validationService.validate(def, invalidValue)).toThrow(
      "Expected type 'Number' but got 'String'"
    );
  });

  it('manages version history and rollback in SettingAssignment', () => {
    const key = new NamespacedKey('feature.beta_ui');
    const scope = new ScopeIdentifier('GLOBAL');
    const v1 = new SettingVersion('v1', new BooleanValue(false), new Date(), 'admin-1');

    const assignment = new SettingAssignment({
      id: 'assign-1',
      key,
      scope,
      versions: [v1],
    });

    expect(assignment.getCurrentVersion().id).toBe('v1');
    expect(assignment.getCurrentVersion().value.getValue()).toBe(false);

    // Update value to v2
    assignment.updateValue('v2', new BooleanValue(true), 'admin-2');
    expect(assignment.getCurrentVersion().id).toBe('v2');
    expect(assignment.getCurrentVersion().value.getValue()).toBe(true);

    // Rollback to v1 as v3
    assignment.rollbackTo('v1', 'v3', 'admin-1');
    expect(assignment.getCurrentVersion().id).toBe('v3');
    expect(assignment.getCurrentVersion().value.getValue()).toBe(false);
    expect(assignment.getVersions().length).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import { canEditSettingsAssignment, canEditSettingsScope, type SettingsAdminScope } from './settingsAssignmentGovernance';

describe('settings Admin scope governance', () => {
  it('keeps TENANT and DOMAIN read-only until their scope ownership is approved', () => {
    expect(canEditSettingsScope('TENANT')).toBe(false);
    expect(canEditSettingsScope('DOMAIN')).toBe(false);
    expect(canEditSettingsAssignment('DOMAIN', true, true)).toBe(false);
    expect(canEditSettingsAssignment('TENANT', true, true)).toBe(false);
  });

  it.each(['GLOBAL', 'IDENTITY'] as SettingsAdminScope[])(
    'preserves governed editing for %s when server context is writable', (scope) => {
      expect(canEditSettingsScope(scope)).toBe(true);
      expect(canEditSettingsAssignment(scope, true, true)).toBe(true);
      expect(canEditSettingsAssignment(scope, false, true)).toBe(false);
      expect(canEditSettingsAssignment(scope, undefined, true)).toBe(false);
      expect(canEditSettingsAssignment(scope, true, false)).toBe(false);
    },
  );
});

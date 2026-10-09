import { describe, expect, it } from 'vitest';
import { canEditSettingsAssignment, canEditSettingsScope, type SettingsAdminScope } from './settingsAssignmentGovernance';

describe('settings Admin scope governance', () => {
  it('keeps TENANT read-only while retaining approved DOMAIN editing', () => {
    expect(canEditSettingsScope('TENANT')).toBe(false);
    expect(canEditSettingsScope('DOMAIN')).toBe(true);
    expect(canEditSettingsAssignment('DOMAIN', true, true)).toBe(true);
    expect(canEditSettingsAssignment('TENANT', true, true)).toBe(false);
  });

  it.each(['GLOBAL', 'DOMAIN', 'IDENTITY'] as SettingsAdminScope[])(
    'preserves governed editing for %s when server context is writable', (scope) => {
      expect(canEditSettingsScope(scope)).toBe(true);
      expect(canEditSettingsAssignment(scope, true, true)).toBe(true);
      expect(canEditSettingsAssignment(scope, false, true)).toBe(false);
      expect(canEditSettingsAssignment(scope, undefined, true)).toBe(false);
      expect(canEditSettingsAssignment(scope, true, false)).toBe(false);
    },
  );
});

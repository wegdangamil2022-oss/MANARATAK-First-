/**
 * Control-plane boundary only. TENANT remains a persisted/resolvable legacy scope,
 * but Admin must not create or mutate its values before an authoritative owner,
 * canonical identifier and approval policy exist.
 */
export type SettingsAdminScope = 'GLOBAL' | 'DOMAIN' | 'TENANT' | 'IDENTITY';

export function canEditSettingsScope(level: SettingsAdminScope): boolean {
  return level === 'GLOBAL' || level === 'IDENTITY';
}

export function canEditSettingsAssignment(
  level: SettingsAdminScope,
  writable: boolean | undefined,
  ready: boolean,
): boolean {
  return ready && writable === true && canEditSettingsScope(level);
}

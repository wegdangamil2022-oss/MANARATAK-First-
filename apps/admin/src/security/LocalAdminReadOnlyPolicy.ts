const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isUnsafeAdminMethod(method?: string): boolean {
  return !SAFE_METHODS.has((method || 'GET').toUpperCase());
}

export function assertLocalReadOnlyRequestAllowed(method: string | undefined, enabled: boolean): void {
  if (enabled && isUnsafeAdminMethod(method)) throw new Error('READ_ONLY_PREVIEW');
}

export function assertLocalReadOnlyBuildAllowed(values: { mode?: string; nodeEnv?: string; localReadOnly?: string }): void {
  const tier = (values.nodeEnv || values.mode || '').toLowerCase();
  if ((tier === 'production' || tier === 'staging') && values.localReadOnly === 'true') {
    throw new Error('VITE_LOCAL_ADMIN_READ_ONLY is forbidden in production/staging builds');
  }
}

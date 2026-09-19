export type PublicBuildTier = 'development' | 'test' | 'staging' | 'production' | string;

export function assertPublicBuildDataMode(values: { mode?: string; nodeEnv?: string; dataMode?: string }): void {
  const tier = (values.nodeEnv || values.mode || '').toLowerCase();
  if ((tier === 'production' || tier === 'staging') && values.dataMode === 'prototype') {
    throw new Error('VITE_PUBLIC_TEMPLATE_DATA_MODE=prototype is forbidden in production/staging builds');
  }
}

export function prototypeCapabilityEnabled(tier?: string): boolean {
  const normalized = (tier || '').toLowerCase();
  return normalized !== 'production' && normalized !== 'staging';
}

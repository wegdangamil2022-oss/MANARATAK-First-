/** Only identifiers from known code contracts may leave the bootstrap boundary. */
export function bootstrapDiagnostics(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  const configurationFields = message.startsWith('Configuration validation failed:')
    ? [...message.matchAll(/^([A-Z][A-Z0-9_]{1,100}):/gm)].map((match) => match[1]) : [];
  const category = configurationFields.length ? 'CONFIGURATION_VALIDATION_FAILED'
    : message.startsWith('Production readiness') ? 'PRODUCTION_READINESS_BLOCKED'
      : message === 'DATABASE_URL is required for this runtime mode' ? 'DATABASE_CONFIGURATION_MISSING'
        : 'API_BOOTSTRAP_FAILED';
  const locations = error instanceof Error ? (error.stack ?? '').split('\n').slice(1)
    .map((line) => line.match(/(?:apps\/api|packages\/[^/\s]+)\/[A-Za-z0-9_./-]+:\d+:\d+/)?.[0])
    .filter((location): location is string => Boolean(location)).slice(0, 5) : [];
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  return {
    category,
    configurationFields: [...new Set(configurationFields)],
    ...(typeof code === 'string' && /^(P\d{4}|ERR_MODULE_NOT_FOUND|ECONNREFUSED|ETIMEDOUT|ENOTFOUND)$/.test(code) ? { code } : {}),
    locations,
  };
}

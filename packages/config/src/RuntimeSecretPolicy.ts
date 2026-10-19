/** Shared rejection of known defaults; length alone is not an entropy guarantee. */
export const DEVELOPMENT_CSRF_SECRET = 'dev-csrf-secret-at-least-32-chars-long';
const INSECURE_PATTERNS = [
  'dev-secret', 'dev-csrf-secret', 'at-least-32-chars-long',
  'absheer-local-development', 'absheer-session-secret', 'absheer-default-csrf-secret',
  'absheer-admin-bearer-token', 'change-me', 'placeholder', '12345678',
  'default-secret', 'short-secret', 'password', 'local-env', 'demo-token',
];
export function isStrongRuntimeSecret(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 32
    && !INSECURE_PATTERNS.some(pattern => value.toLowerCase().includes(pattern));
}

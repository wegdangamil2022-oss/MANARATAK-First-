const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'pass',
  'pwd',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'session_token',
  'secret',
  'jwt_secret',
  'session_secret',
  'csrf_secret',
  'client_secret',
  'apikey',
  'api_key',
  'x-api-key',
  'bearer',
  'authorization',
  'auth',
  'databaseurl',
  'database_url',
  'admin_bearer_token',
  'creditcard',
  'credit_card',
  'cookie',
  'set-cookie',
  'privatekey',
  'private_key'
]);

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lowerKey)) {
    return true;
  }
  // Check specific suffixes/patterns for secret fields without matching container objects like 'credentials'
  if (
    lowerKey.endsWith('password') ||
    lowerKey.endsWith('_hash') ||
    lowerKey.endsWith('token') ||
    lowerKey.endsWith('secret') ||
    (lowerKey.endsWith('key') && lowerKey !== 'settingkey' && lowerKey !== 'setting_key') ||
    lowerKey.startsWith('bearer') ||
    lowerKey.startsWith('auth') ||
    lowerKey === 'cookie' ||
    lowerKey === 'set-cookie'
  ) {
    return true;
  }
  return false;
}

export class AuditSecretSanitizer {
  public static sanitize<T>(input: T): T {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      const lower = input.toLowerCase();
      if (lower.startsWith('bearer ') || lower.startsWith('basic ') || (input.startsWith('eyJ') && input.length > 20)) {
        return '[REDACTED]' as unknown as T;
      }
      return input;
    }

    if (typeof input !== 'object') {
      return input;
    }

    if (input instanceof Date) {
      return new Date(input.getTime()) as unknown as T;
    }

    if (Array.isArray(input)) {
      return input.map(item => AuditSecretSanitizer.sanitize(item)) as unknown as T;
    }

    const sanitizedObj: Record<string, any> = {};
    const obj = input as Record<string, any>;

    for (const key of Object.keys(obj)) {
      if (isSensitiveKey(key)) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = AuditSecretSanitizer.sanitize(obj[key]);
      }
    }

    return sanitizedObj as T;
  }
}


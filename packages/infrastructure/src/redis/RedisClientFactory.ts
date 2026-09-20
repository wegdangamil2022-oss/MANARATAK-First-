import { createClient, RedisClientType } from 'redis';

export interface RedisClientConfig {
  REDIS_URL?: string;
  redisUrl?: string;
  REDIS_NAMESPACE?: string;
  redisNamespace?: string;
  getOptional?: <T = string>(key: string) => T | undefined;
}

export class RedisClientFactory {
  /**
   * Sanitizes a Redis URL or connection string by masking credentials/passwords.
   */
  public static sanitizeUrl(url?: string): string {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      if (parsed.password) parsed.password = '***';
      if (parsed.username) parsed.username = '***';
      return parsed.toString();
    } catch {
      return url.replace(/\/\/[^@]+@/, '//***@');
    }
  }

  /**
   * Sanitizes log/error messages ensuring secrets/passwords are never leaked.
   */
  public static sanitizeMessage(message: string, rawUrl?: string): string {
    let sanitized = message;
    if (rawUrl) {
      const sanitizedUrl = RedisClientFactory.sanitizeUrl(rawUrl);
      sanitized = sanitized.replace(rawUrl, sanitizedUrl);
    }
    sanitized = sanitized.replace(/redis(s)?:\/\/[^@\s]+@/g, 'redis$1://***@');
    return sanitized;
  }

  /**
   * Generates a canonical namespaced Redis key following `<namespace>:<feature>:<key>`.
   */
  public static buildKey(namespace: string, feature: string, key: string): string {
    const cleanNs = (namespace || 'manaratak:').trim();
    const formattedNs = cleanNs.endsWith(':') ? cleanNs : `${cleanNs}:`;
    const cleanFeature = feature.replace(/^:+|:+$/g, '');
    const cleanKey = key.replace(/^:+/, '');
    return `${formattedNs}${cleanFeature}:${cleanKey}`;
  }

  /**
   * Creates an authenticated, bounded, real Redis client.
   */
  public static createClient(config: RedisClientConfig | string, logger?: any): RedisClientType & { buildKey: (feature: string, key: string) => string } {
    let rawUrl: string | undefined;
    let namespace: string = 'manaratak:';

    if (typeof config === 'string') {
      rawUrl = config;
    } else if (config && typeof config === 'object') {
      rawUrl = config.REDIS_URL || config.redisUrl || (typeof config.getOptional === 'function' ? config.getOptional('REDIS_URL') : undefined);
      namespace = config.REDIS_NAMESPACE || config.redisNamespace || (typeof config.getOptional === 'function' ? config.getOptional('REDIS_NAMESPACE') : undefined) || 'manaratak:';
    }

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      throw new Error('Redis configuration error: REDIS_URL is required to create a Redis client');
    }

    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl.startsWith('redis://') && !trimmedUrl.startsWith('rediss://')) {
      throw new Error('Redis configuration error: REDIS_URL must start with redis:// or rediss://');
    }

    const sanitizedUrl = RedisClientFactory.sanitizeUrl(trimmedUrl);

    const client = createClient({
      url: trimmedUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries: number) => {
          // Bounded reconnect policy: max 3 attempts to prevent infinite network loops
          if (retries >= 3) {
            return false;
          }
          return Math.min(retries * 500, 2000);
        }
      }
    }) as any;

    let hasLoggedError = false;
    client.on('error', (err: any) => {
      if (!hasLoggedError) {
        hasLoggedError = true;
        const rawMsg = err?.message || String(err);
        const safeMsg = RedisClientFactory.sanitizeMessage(rawMsg, trimmedUrl);
        if (logger && typeof logger.error === 'function') {
          logger.error(`[Redis] Connection issue (${sanitizedUrl}): ${safeMsg}`);
        }
      }
    });

    client.buildKey = (feature: string, key: string): string => {
      return RedisClientFactory.buildKey(namespace, feature, key);
    };

    client.connect().catch((_err: any) => {
      // Connect rejection is handled by the error event listener and health check
    });

    return client;
  }
}

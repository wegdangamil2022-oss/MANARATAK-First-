import { IRateLimiter } from '@manaratak/core';
import { IAssetMalwareScannerGateway, IAssetSanitizationGateway, IAssetStorageGateway } from '@manaratak/domain';
import type { IImportRawSnapshotStore } from '@manaratak/application';
import {
  DefaultRateLimiter,
  HttpAssetMalwareScannerGateway,
  HttpAssetSanitizationGateway,
  HttpAssetStorageGateway,
  HttpImportRawSnapshotStore,
  LocalAssetStorageGateway,
  LocalImportRawSnapshotStore,
  NoopAssetMalwareScannerGateway,
  NoopAssetSanitizationGateway,
  RedisClientFactory,
  RedisRateLimiter,
  createUnavailableCapability,
} from '@manaratak/infrastructure';

export type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

type RuntimeCapability = {
  readonly capabilityStatus?: string;
  readonly isProductionReady?: boolean;
  readonly generateUploadGrant?: unknown;
  readonly generateDeliveryGrant?: unknown;
  readonly get?: unknown;
  readonly read?: unknown;
};

type RedisClientFactoryFn = typeof RedisClientFactory.createClient;

const productionLike = (env: RuntimeEnvironment): boolean => env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';

const positiveInt = (value: string | undefined, fallback: number, key: string): number => {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${key}_INVALID`);
  return parsed;
};

const assetProviderConfig = (env: RuntimeEnvironment) => {
  const baseUrl = env.MANARATAK_ASSET_PROVIDER_BASE_URL?.trim();
  const apiKey = env.MANARATAK_ASSET_PROVIDER_API_KEY?.trim();
  const signingSecret = env.MANARATAK_ASSET_PROVIDER_SIGNING_SECRET;
  const supplied = Boolean(baseUrl || apiKey || signingSecret);
  const complete = Boolean(baseUrl && apiKey && signingSecret);
  if (supplied && !complete) throw new Error('ASSET_PROVIDER_CONFIGURATION_INCOMPLETE');
  if (!complete) return null;
  return {
    baseUrl: baseUrl!,
    apiKey: apiKey!,
    signingSecret: signingSecret!,
    timeoutMs: positiveInt(env.MANARATAK_ASSET_PROVIDER_TIMEOUT_MS, 10_000, 'MANARATAK_ASSET_PROVIDER_TIMEOUT_MS'),
    maxResponseBytes: positiveInt(env.MANARATAK_ASSET_PROVIDER_MAX_RESPONSE_BYTES, 64 * 1024 * 1024, 'MANARATAK_ASSET_PROVIDER_MAX_RESPONSE_BYTES'),
    allowInsecureHttp: !productionLike(env) && env.MANARATAK_ASSET_PROVIDER_ALLOW_INSECURE_HTTP === 'true',
  };
};

export function isDatabaseRequiredForRuntime(env: RuntimeEnvironment): boolean {
  return productionLike(env) || env.DATABASE_REQUIRED === 'true' || env.RUNTIME_CLOSURE_MODE === 'true';
}

export function createAssetStorageGatewayForRuntime(env: RuntimeEnvironment): IAssetStorageGateway {
  const provider = assetProviderConfig(env);
  if (provider) return new HttpAssetStorageGateway(provider);
  if (productionLike(env)) return createUnavailableCapability('assetStorageGateway') as IAssetStorageGateway;
  return new LocalAssetStorageGateway('local-dev-bucket', env.MANARATAK_LOCAL_ASSET_ROOT || undefined, false);
}

export function createAssetMalwareScannerGatewayForRuntime(env: RuntimeEnvironment): IAssetMalwareScannerGateway {
  const provider = assetProviderConfig(env);
  if (provider) return new HttpAssetMalwareScannerGateway(provider);
  if (productionLike(env)) return createUnavailableCapability('assetMalwareScannerGateway') as IAssetMalwareScannerGateway;
  return new NoopAssetMalwareScannerGateway();
}

export function createAssetSanitizationGatewayForRuntime(env: RuntimeEnvironment): IAssetSanitizationGateway {
  const provider = assetProviderConfig(env);
  if (provider) return new HttpAssetSanitizationGateway(provider);
  if (productionLike(env)) return createUnavailableCapability('assetSanitizationGateway') as IAssetSanitizationGateway;
  return new NoopAssetSanitizationGateway();
}

export function assertAssetSecurityProvidersForRuntime(
  env: RuntimeEnvironment,
  providers: {
    storage: RuntimeCapability;
    malwareScanner: RuntimeCapability;
    sanitizer: RuntimeCapability;
  },
): void {
  if (!productionLike(env)) return;

  const unavailable = Object.entries(providers)
    .filter(([, provider]) => provider?.isProductionReady !== true && provider?.capabilityStatus !== 'PRODUCTION_CAPABLE')
    .map(([name]) => name);

  const storage = providers.storage;
  if (typeof storage?.generateUploadGrant !== 'function' || typeof storage?.generateDeliveryGrant !== 'function') {
    if (!unavailable.includes('storage')) unavailable.push('storage');
  }

  if (unavailable.length > 0) {
    throw new Error(`Production asset security providers are unavailable: ${unavailable.join(', ')}`);
  }
}

export function createImportRawSnapshotStoreForRuntime(
  env: RuntimeEnvironment,
  configuredDirectory?: string,
): IImportRawSnapshotStore {
  const provider = assetProviderConfig(env);
  if (provider) {
    return new HttpImportRawSnapshotStore({
      ...provider,
      retentionDays: positiveInt(env.MANARATAK_IMPORT_RAW_RETENTION_DAYS, 365, 'MANARATAK_IMPORT_RAW_RETENTION_DAYS'),
    });
  }
  if (productionLike(env)) {
    return createUnavailableCapability('durableImportRawSnapshotStore') as IImportRawSnapshotStore;
  }
  return new LocalImportRawSnapshotStore(configuredDirectory);
}

export function assertImportRawSnapshotStoreForRuntime(env: RuntimeEnvironment, store: RuntimeCapability): void {
  if (!productionLike(env)) return;
  const durable = store?.isProductionReady === true
    && store?.capabilityStatus === 'PRODUCTION_CAPABLE';
  const hasRetrieval = typeof store?.get === 'function' && typeof store?.read === 'function';
  if (!durable || !hasRetrieval) throw new Error('Production durable import raw snapshot store is unavailable');
}

export function createRateLimiterForRuntime(
  env: RuntimeEnvironment,
  logger?: unknown,
  createRedisClient: RedisClientFactoryFn = RedisClientFactory.createClient,
  sharedRedisClient?: ReturnType<RedisClientFactoryFn> | null,
): IRateLimiter {
  if (!productionLike(env)) return new DefaultRateLimiter();

  const redisUrl = env.REDIS_URL?.trim();
  if (!redisUrl) {
    throw new Error('REDIS_URL is required for production/staging distributed rate limiting');
  }

  const client = sharedRedisClient ?? createRedisClient(
    {
      REDIS_URL: redisUrl,
      REDIS_NAMESPACE: env.REDIS_NAMESPACE,
    },
    logger,
  );
  const keyPrefix = typeof (client as any).buildKey === 'function'
    ? `${(client as any).buildKey('rate-limit', '')}`
    : 'manaratak:rate-limit:';
  return new RedisRateLimiter(client as any, keyPrefix);
}

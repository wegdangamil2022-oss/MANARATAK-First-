import { describe, expect, it, vi } from 'vitest';
import {
  assertAssetSecurityProvidersForRuntime,
  assertImportRawSnapshotStoreForRuntime,
  createAssetMalwareScannerGatewayForRuntime,
  createAssetSanitizationGatewayForRuntime,
  createAssetStorageGatewayForRuntime,
  createImportRawSnapshotStoreForRuntime,
  createRateLimiterForRuntime,
  isDatabaseRequiredForRuntime,
} from '../../../src/infrastructure/di/RuntimeDependencyPolicy';


describe('RuntimeDependencyPolicy', () => {
  it('requires database in production, staging and runtime-closure modes', () => {
    expect(isDatabaseRequiredForRuntime({ NODE_ENV: 'production' })).toBe(true);
    expect(isDatabaseRequiredForRuntime({ NODE_ENV: 'staging' })).toBe(true);
    expect(isDatabaseRequiredForRuntime({ NODE_ENV: 'development', RUNTIME_CLOSURE_MODE: 'true' })).toBe(true);
    expect(isDatabaseRequiredForRuntime({ NODE_ENV: 'development' })).toBe(false);
  });

  it('keeps local asset storage development-only', () => {
    expect(() => createAssetStorageGatewayForRuntime({ NODE_ENV: 'development' })).not.toThrow();
    const productionGateway = createAssetStorageGatewayForRuntime({ NODE_ENV: 'production' }) as any;
    expect(productionGateway.capabilityStatus ?? productionGateway.status?.()).toBeDefined();
  });

  it('fails production and staging closed when mandatory asset security providers are unavailable', () => {
    const unavailable = { capabilityStatus: 'UNAVAILABLE' };
    const providers = { storage: unavailable, malwareScanner: unavailable, sanitizer: unavailable };

    expect(() => assertAssetSecurityProvidersForRuntime({ NODE_ENV: 'production' }, providers))
      .toThrow(/storage, malwareScanner, sanitizer/);
    expect(() => assertAssetSecurityProvidersForRuntime({ NODE_ENV: 'staging' }, providers))
      .toThrow(/Production asset security providers are unavailable/);
    expect(() => assertAssetSecurityProvidersForRuntime({ NODE_ENV: 'development' }, providers))
      .not.toThrow();
  });

  it('requires secure upload and delivery methods on production storage, not a status flag alone', () => {
    const ready = { capabilityStatus: 'PRODUCTION_CAPABLE' };
    expect(() => assertAssetSecurityProvidersForRuntime(
      { NODE_ENV: 'production' },
      { storage: ready, malwareScanner: ready, sanitizer: ready },
    )).toThrow(/storage/);

    const secureStorage = {
      capabilityStatus: 'PRODUCTION_CAPABLE',
      generateUploadGrant: () => undefined,
      generateDeliveryGrant: () => undefined,
    };
    expect(() => assertAssetSecurityProvidersForRuntime(
      { NODE_ENV: 'production' },
      { storage: secureStorage, malwareScanner: ready, sanitizer: ready },
    )).not.toThrow();
  });

  it('composes production-capable signed HTTP asset providers when all credentials are configured', () => {
    const env = {
      NODE_ENV: 'production',
      MANARATAK_ASSET_PROVIDER_BASE_URL: 'https://asset-provider.internal/api/',
      MANARATAK_ASSET_PROVIDER_API_KEY: 'asset-provider-key',
      MANARATAK_ASSET_PROVIDER_SIGNING_SECRET: '0123456789abcdef0123456789abcdef',
    };
    const storage = createAssetStorageGatewayForRuntime(env) as any;
    const malwareScanner = createAssetMalwareScannerGatewayForRuntime(env) as any;
    const sanitizer = createAssetSanitizationGatewayForRuntime(env) as any;
    expect(storage.capabilityStatus).toBe('PRODUCTION_CAPABLE');
    expect(typeof storage.generateUploadGrant).toBe('function');
    expect(typeof storage.generateDeliveryGrant).toBe('function');
    expect(malwareScanner.capabilityStatus).toBe('PRODUCTION_CAPABLE');
    expect(sanitizer.capabilityStatus).toBe('PRODUCTION_CAPABLE');
    expect(() => assertAssetSecurityProvidersForRuntime(env, { storage, malwareScanner, sanitizer })).not.toThrow();
  });

  it('never permits insecure HTTP provider transport in production', () => {
    expect(() => createAssetStorageGatewayForRuntime({
      NODE_ENV: 'production',
      MANARATAK_ASSET_PROVIDER_BASE_URL: 'http://asset-provider.internal/',
      MANARATAK_ASSET_PROVIDER_API_KEY: 'key',
      MANARATAK_ASSET_PROVIDER_SIGNING_SECRET: '0123456789abcdef0123456789abcdef',
      MANARATAK_ASSET_PROVIDER_ALLOW_INSECURE_HTTP: 'true',
    })).toThrow(/PROVIDER_HTTPS_REQUIRED/);
  });


  it('keeps local raw snapshots development-only and composes durable provider storage in production', () => {
    const developmentStore = createImportRawSnapshotStoreForRuntime(
      { NODE_ENV: 'development' },
      'var/test-import-raw',
    ) as any;
    expect(developmentStore.persistenceClassification).toBe('DEVELOPMENT_ONLY');

    const env = {
      NODE_ENV: 'production',
      MANARATAK_ASSET_PROVIDER_BASE_URL: 'https://asset-provider.internal/api/',
      MANARATAK_ASSET_PROVIDER_API_KEY: 'asset-provider-key',
      MANARATAK_ASSET_PROVIDER_SIGNING_SECRET: '0123456789abcdef0123456789abcdef',
      MANARATAK_IMPORT_RAW_RETENTION_DAYS: '365',
    };
    const productionStore = createImportRawSnapshotStoreForRuntime(env) as any;
    expect(productionStore.persistenceClassification).toBe('DURABLE');
    expect(productionStore.capabilityStatus).toBe('PRODUCTION_CAPABLE');
    expect(typeof productionStore.read).toBe('function');
    expect(() => assertImportRawSnapshotStoreForRuntime(env, productionStore)).not.toThrow();
  });

  it('fails production closed when durable raw snapshot provider configuration is absent', () => {
    const unavailable = createImportRawSnapshotStoreForRuntime({ NODE_ENV: 'production' }) as any;
    expect(() => assertImportRawSnapshotStoreForRuntime({ NODE_ENV: 'production' }, unavailable))
      .toThrow(/durable import raw snapshot store is unavailable/);
  });

  it('selects process-local limiter only outside production-like environments', () => {
    const limiter = createRateLimiterForRuntime({ NODE_ENV: 'development' });
    expect(limiter.isProductionReady).toBe(false);
    expect(limiter.kind).toBe('process-local');
  });

  it('requires Redis for production-like rate limiting', () => {
    expect(() => createRateLimiterForRuntime({ NODE_ENV: 'production' })).toThrow(/REDIS_URL/);
  });

  it('builds a production-capable Redis limiter from the composition boundary', () => {
    const evalMock = vi.fn().mockResolvedValue([1, 60_000]);
    const fakeClient = {
      eval: evalMock,
      buildKey: (feature: string, key: string) => `mnr:${feature}:${key}`,
    };
    const factory = vi.fn(() => fakeClient as any);
    const limiter = createRateLimiterForRuntime(
      { NODE_ENV: 'production', REDIS_URL: 'redis://redis.internal:6379', REDIS_NAMESPACE: 'mnr:' },
      undefined,
      factory as any,
    );

    expect(limiter.isProductionReady).toBe(true);
    expect(limiter.kind).toBe('real');
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

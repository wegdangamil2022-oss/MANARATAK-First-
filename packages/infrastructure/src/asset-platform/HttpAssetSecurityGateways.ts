import { createHash } from 'node:crypto';
import {
  AssetDeliveryGrant,
  AssetSanitizationMetadata,
  AssetStorageLocator,
  AssetStorageZone,
  AssetUploadGrant,
  AssetUploadGrantRequest,
  IAssetMalwareScannerGateway,
  IAssetSanitizationGateway,
  IAssetStorageGateway,
  MalwareScanResult,
  SanitizationResult,
} from '@manaratak/domain';
import { SignedProviderHttpClient, SignedProviderHttpClientOptions } from '../provider-http/SignedProviderHttpClient';

export interface HttpAssetProviderOptions extends SignedProviderHttpClientOptions {}

type LocatorWire = { storageZone: string; bucketName: string; pathKey: string };
type UploadGrantWire = { locator: LocatorWire; uploadUrl: string; method: string; headers?: Record<string, string>; expiresAt: string };
type DeliveryGrantWire = { url: string; headers?: Record<string, string>; expiresAt: string };

const locatorPayload = (locator: AssetStorageLocator) => ({
  storageZone: locator.storageZone,
  bucketName: locator.bucketName,
  pathKey: locator.pathKey,
});

const operationIdempotencyKey = (operation: string, payload: unknown): string =>
  `asset:${operation}:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;

const parseZone = (value: string): AssetStorageZone => {
  if (value === AssetStorageZone.QUARANTINE) return AssetStorageZone.QUARANTINE;
  if (value === AssetStorageZone.CLEAN) return AssetStorageZone.CLEAN;
  throw new Error('ASSET_PROVIDER_STORAGE_ZONE_INVALID');
};

const parseLocator = (wire: LocatorWire): AssetStorageLocator => {
  if (!wire || typeof wire.bucketName !== 'string' || typeof wire.pathKey !== 'string' || typeof wire.storageZone !== 'string') {
    throw new Error('ASSET_PROVIDER_LOCATOR_INVALID');
  }
  return new AssetStorageLocator(parseZone(wire.storageZone), wire.bucketName, wire.pathKey);
};

const requireHttpsGrant = (value: string, code: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(code);
  }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(code);
  return url.toString();
};

const parseDate = (value: string, code: string): Date => {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(code);
  return parsed;
};

const parseGrantExpiry = (value: string, maxTtlSeconds: number): Date => {
  const expiresAt = parseDate(value, 'ASSET_PROVIDER_GRANT_EXPIRY_INVALID');
  const now = Date.now();
  if (expiresAt.getTime() <= now) throw new Error('ASSET_PROVIDER_GRANT_ALREADY_EXPIRED');
  if (expiresAt.getTime() > now + (maxTtlSeconds * 1000) + 5000) throw new Error('ASSET_PROVIDER_GRANT_TTL_EXCESSIVE');
  return expiresAt;
};

const sanitizeHeaders = (headers: Record<string, string> | undefined): Readonly<Record<string, string>> => {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (!/^[a-z0-9-]+$/i.test(name) || typeof value !== 'string' || value.length > 8192) throw new Error('ASSET_PROVIDER_GRANT_HEADER_INVALID');
    if (/^(authorization|cookie|set-cookie|proxy-authorization)$/i.test(name)) throw new Error('ASSET_PROVIDER_GRANT_SECRET_HEADER_FORBIDDEN');
    result[name] = value;
  }
  return Object.freeze(result);
};

export class HttpAssetStorageGateway implements IAssetStorageGateway {
  public readonly capabilityStatus = 'PRODUCTION_CAPABLE' as const;
  public readonly isProductionReady = true as const;
  private readonly client: SignedProviderHttpClient;

  constructor(options: HttpAssetProviderOptions) {
    this.client = new SignedProviderHttpClient(options);
  }

  async generateUploadLocator(zone: AssetStorageZone = AssetStorageZone.QUARANTINE): Promise<AssetStorageLocator> {
    const payload = { storageZone: zone };
    const response = await this.client.json<{ locator: LocatorWire }>('POST', '/v1/assets/locators', payload, {
      idempotencyKey: operationIdempotencyKey('locator', payload),
    });
    const locator = parseLocator(response.locator);
    if (locator.storageZone !== zone) throw new Error('ASSET_PROVIDER_LOCATOR_ZONE_MISMATCH');
    return locator;
  }

  async generateUploadGrant(zone: AssetStorageZone, request: AssetUploadGrantRequest): Promise<AssetUploadGrant> {
    if (zone !== AssetStorageZone.QUARANTINE) throw new Error('ASSET_UPLOAD_MUST_TARGET_QUARANTINE');
    if (!request.originalFilename?.trim()) throw new Error('ASSET_UPLOAD_FILENAME_REQUIRED');
    if (!request.mimeType?.trim()) throw new Error('ASSET_UPLOAD_MIME_TYPE_REQUIRED');
    if (!Number.isSafeInteger(request.byteSize) || request.byteSize <= 0) throw new Error('ASSET_UPLOAD_BYTE_SIZE_INVALID');
    const payload = {
      storageZone: zone,
      originalFilename: request.originalFilename,
      mimeType: request.mimeType,
      byteSize: request.byteSize,
    };
    const response = await this.client.json<UploadGrantWire>('POST', '/v1/assets/upload-grants', payload, {
      idempotencyKey: operationIdempotencyKey('upload-grant', payload),
    });
    const locator = parseLocator(response.locator);
    if (locator.storageZone !== zone) throw new Error('ASSET_PROVIDER_LOCATOR_ZONE_MISMATCH');
    if (response.method !== 'PUT' && response.method !== 'POST') throw new Error('ASSET_PROVIDER_UPLOAD_METHOD_INVALID');
    return {
      locator,
      uploadUrl: requireHttpsGrant(response.uploadUrl, 'ASSET_PROVIDER_UPLOAD_URL_HTTPS_REQUIRED'),
      method: response.method,
      headers: sanitizeHeaders(response.headers),
      expiresAt: parseGrantExpiry(response.expiresAt, 900),
    };
  }

  async generateDeliveryGrant(locator: AssetStorageLocator, expiresInSeconds: number): Promise<AssetDeliveryGrant> {
    if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 3600) throw new Error('ASSET_DELIVERY_EXPIRY_INVALID');
    if (locator.storageZone !== AssetStorageZone.CLEAN) throw new Error('ASSET_DELIVERY_CLEAN_LOCATOR_REQUIRED');
    const payload = { locator: locatorPayload(locator), expiresInSeconds };
    const response = await this.client.json<DeliveryGrantWire>('POST', '/v1/assets/delivery-grants', payload, {
      idempotencyKey: operationIdempotencyKey('delivery-grant', payload),
    });
    return {
      url: requireHttpsGrant(response.url, 'ASSET_PROVIDER_DELIVERY_URL_HTTPS_REQUIRED'),
      headers: sanitizeHeaders(response.headers),
      expiresAt: parseGrantExpiry(response.expiresAt, expiresInSeconds + 60),
    };
  }

  async moveToCleanZone(quarantineLocator: AssetStorageLocator): Promise<AssetStorageLocator> {
    if (quarantineLocator.storageZone !== AssetStorageZone.QUARANTINE) throw new Error('ASSET_STORAGE_QUARANTINE_LOCATOR_REQUIRED');
    const payload = { locator: locatorPayload(quarantineLocator) };
    const response = await this.client.json<{ locator: LocatorWire }>('POST', '/v1/assets/move-to-clean', payload, {
      idempotencyKey: operationIdempotencyKey('move-to-clean', payload),
    });
    const locator = parseLocator(response.locator);
    if (locator.storageZone !== AssetStorageZone.CLEAN) throw new Error('ASSET_PROVIDER_CLEAN_LOCATOR_REQUIRED');
    return locator;
  }

  async read(locator: AssetStorageLocator, maxBytes: number): Promise<Uint8Array> {
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > 64 * 1024 * 1024) throw new Error('ASSET_READ_MAX_BYTES_INVALID');
    const data = await this.client.bytes('POST', '/v1/assets/read', { locator: locatorPayload(locator), maxBytes });
    if (data.byteLength > maxBytes) throw new Error(`ASSET_READ_SIZE_LIMIT_EXCEEDED:${data.byteLength}:${maxBytes}`);
    return data;
  }

  async archive(locator: AssetStorageLocator): Promise<void> {
    const payload = { locator: locatorPayload(locator) };
    await this.client.json<void>('POST', '/v1/assets/archive', payload, { idempotencyKey: operationIdempotencyKey('archive', payload) });
  }

  async restore(locator: AssetStorageLocator): Promise<void> {
    const payload = { locator: locatorPayload(locator) };
    await this.client.json<void>('POST', '/v1/assets/restore', payload, { idempotencyKey: operationIdempotencyKey('restore', payload) });
  }

  async delete(locator: AssetStorageLocator): Promise<void> {
    const payload = { locator: locatorPayload(locator) };
    await this.client.json<void>('DELETE', '/v1/assets', payload, { idempotencyKey: operationIdempotencyKey('delete', payload) });
  }
}

export class HttpAssetMalwareScannerGateway implements IAssetMalwareScannerGateway {
  public readonly capabilityStatus = 'PRODUCTION_CAPABLE' as const;
  public readonly isProductionReady = true as const;
  private readonly client: SignedProviderHttpClient;

  constructor(options: HttpAssetProviderOptions) { this.client = new SignedProviderHttpClient(options); }

  async scan(locator: AssetStorageLocator): Promise<MalwareScanResult> {
    if (locator.storageZone !== AssetStorageZone.QUARANTINE) throw new Error('ASSET_MALWARE_SCAN_QUARANTINE_REQUIRED');
    const payload = { locator: locatorPayload(locator) };
    const result = await this.client.json<{ clean: boolean; threatsFound?: string[] }>('POST', '/v1/assets/malware-scan', payload, {
      idempotencyKey: operationIdempotencyKey('malware-scan', payload),
    });
    if (typeof result.clean !== 'boolean') throw new Error('ASSET_MALWARE_SCAN_RESPONSE_INVALID');
    if (result.threatsFound && (!Array.isArray(result.threatsFound) || result.threatsFound.some((value) => typeof value !== 'string' || value.length > 512))) {
      throw new Error('ASSET_MALWARE_SCAN_RESPONSE_INVALID');
    }
    if (!result.clean && (!result.threatsFound || result.threatsFound.length === 0)) throw new Error('ASSET_MALWARE_SCAN_THREAT_EVIDENCE_REQUIRED');
    return { clean: result.clean, threatsFound: result.threatsFound };
  }
}

export class HttpAssetSanitizationGateway implements IAssetSanitizationGateway {
  public readonly capabilityStatus = 'PRODUCTION_CAPABLE' as const;
  public readonly isProductionReady = true as const;
  private readonly client: SignedProviderHttpClient;

  constructor(options: HttpAssetProviderOptions) { this.client = new SignedProviderHttpClient(options); }

  async sanitize(locator: AssetStorageLocator): Promise<SanitizationResult> {
    if (locator.storageZone !== AssetStorageZone.QUARANTINE) throw new Error('ASSET_SANITIZATION_QUARANTINE_REQUIRED');
    const payload = { locator: locatorPayload(locator) };
    const result = await this.client.json<{
      sanitizedLocator: LocatorWire;
      exifStripped: boolean;
      sanitizedAt: string;
      sanitizerNotes?: string;
    }>('POST', '/v1/assets/sanitize', payload, {
      idempotencyKey: operationIdempotencyKey('sanitize', payload),
    });
    if (typeof result.exifStripped !== 'boolean') throw new Error('ASSET_SANITIZATION_RESPONSE_INVALID');
    if (result.sanitizerNotes !== undefined && (typeof result.sanitizerNotes !== 'string' || result.sanitizerNotes.length > 5000)) {
      throw new Error('ASSET_SANITIZATION_RESPONSE_INVALID');
    }
    const sanitizedLocator = parseLocator(result.sanitizedLocator);
    if (sanitizedLocator.storageZone !== AssetStorageZone.QUARANTINE) throw new Error('ASSET_SANITIZATION_MUST_REMAIN_QUARANTINED');
    const sanitizedAt = parseDate(result.sanitizedAt, 'ASSET_SANITIZATION_TIMESTAMP_INVALID');
    return {
      sanitizedLocator,
      metadata: new AssetSanitizationMetadata(result.exifStripped, sanitizedAt, result.sanitizerNotes ?? null),
    };
  }
}

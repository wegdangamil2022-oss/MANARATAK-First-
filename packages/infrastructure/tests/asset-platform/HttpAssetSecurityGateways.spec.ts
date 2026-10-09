import { describe, expect, it, vi } from 'vitest';
import { AssetStorageLocator, AssetStorageZone } from '@manaratak/domain';
import {
  HttpAssetMalwareScannerGateway,
  HttpAssetSanitizationGateway,
  HttpAssetStorageGateway,
} from '../../src/asset-platform/HttpAssetSecurityGateways';
import { SignedProviderHttpClient } from '../../src/provider-http/SignedProviderHttpClient';

const secret = '0123456789abcdef0123456789abcdef';
const jsonResponse = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json' },
});

const options = (fetchImpl: typeof fetch) => ({
  baseUrl: 'https://asset-provider.internal/api/',
  apiKey: 'asset-key',
  signingSecret: secret,
  fetchImpl,
  now: () => new Date('2026-09-07T00:00:00.000Z'),
});

describe('W3 MNT-AUD-0011 production asset provider adapters', () => {
  it('signs provider requests, preserves the configured base path, and does not send the signing secret', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.href).toBe('https://asset-provider.internal/api/v1/ping');
      const headers = new Headers(init?.headers);
      expect(headers.get('x-manaratak-provider-key')).toBe('asset-key');
      expect(headers.get('x-manaratak-signature')).toMatch(/^[a-f0-9]{64}$/);
      expect(headers.get('x-manaratak-content-sha256')).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(init?.headers)).not.toContain(secret);
      return jsonResponse({ ok: true });
    });
    const client = new SignedProviderHttpClient(options(fetchMock as any));
    await expect(client.json('POST', '/v1/ping', { hello: 'world' })).resolves.toEqual({ ok: true });
  });

  it('returns only HTTPS quarantine upload grants and emits an idempotency key', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('idempotency-key')).toMatch(/^asset:upload-grant:[a-f0-9]{64}$/);
      return jsonResponse({
        locator: { storageZone: 'QUARANTINE', bucketName: 'q', pathKey: 'uploads/a.pdf' },
        uploadUrl: 'https://object.example.test/presigned-upload',
        method: 'PUT',
        headers: { 'content-type': 'application/pdf' },
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      });
    });
    const gateway = new HttpAssetStorageGateway(options(fetchMock as any));
    const grant = await gateway.generateUploadGrant(AssetStorageZone.QUARANTINE, {
      originalFilename: 'a.pdf',
      mimeType: 'application/pdf',
      byteSize: 1024,
    });
    expect(grant.locator.storageZone).toBe(AssetStorageZone.QUARANTINE);
    expect(grant.uploadUrl).toBe('https://object.example.test/presigned-upload');
    expect(grant.method).toBe('PUT');
  });

  it('rejects HTTP grants and forbidden credential-bearing headers returned by a provider', async () => {
    const httpGrant = new HttpAssetStorageGateway(options((async () => jsonResponse({
      locator: { storageZone: 'QUARANTINE', bucketName: 'q', pathKey: 'uploads/a.pdf' },
      uploadUrl: 'http://object.example.test/upload',
      method: 'PUT',
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    })) as any));
    await expect(httpGrant.generateUploadGrant(AssetStorageZone.QUARANTINE, {
      originalFilename: 'a.pdf', mimeType: 'application/pdf', byteSize: 1,
    })).rejects.toThrow('ASSET_PROVIDER_UPLOAD_URL_HTTPS_REQUIRED');

    const secretHeader = new HttpAssetStorageGateway(options((async () => jsonResponse({
      locator: { storageZone: 'QUARANTINE', bucketName: 'q', pathKey: 'uploads/a.pdf' },
      uploadUrl: 'https://object.example.test/upload',
      method: 'PUT',
      headers: { Authorization: 'secret' },
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    })) as any));
    await expect(secretHeader.generateUploadGrant(AssetStorageZone.QUARANTINE, {
      originalFilename: 'a.pdf', mimeType: 'application/pdf', byteSize: 1,
    })).rejects.toThrow('ASSET_PROVIDER_GRANT_SECRET_HEADER_FORBIDDEN');
  });

  it('requires explicit threat evidence when a malware provider reports an infected object', async () => {
    const gateway = new HttpAssetMalwareScannerGateway(options((async () => jsonResponse({ clean: false })) as any));
    await expect(gateway.scan(new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'uploads/eicar.txt')))
      .rejects.toThrow('ASSET_MALWARE_SCAN_THREAT_EVIDENCE_REQUIRED');
  });

  it('keeps sanitized output quarantined until activation and rejects provider attempts to publish directly to CLEAN', async () => {
    const gateway = new HttpAssetSanitizationGateway(options((async () => jsonResponse({
      sanitizedLocator: { storageZone: 'CLEAN', bucketName: 'clean', pathKey: 'unsafe-shortcut.pdf' },
      exifStripped: true,
      sanitizedAt: '2026-09-07T00:00:01.000Z',
    })) as any));
    await expect(gateway.sanitize(new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'uploads/a.pdf')))
      .rejects.toThrow('ASSET_SANITIZATION_MUST_REMAIN_QUARANTINED');
  });

  it('issues delivery grants only for CLEAN assets', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      url: 'https://cdn.example.test/download?signature=x',
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    }));
    const gateway = new HttpAssetStorageGateway(options(fetchMock as any));
    await expect(gateway.generateDeliveryGrant(
      new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'uploads/a.pdf'),
      300,
    )).rejects.toThrow('ASSET_DELIVERY_CLEAN_LOCATOR_REQUIRED');
    await expect(gateway.generateDeliveryGrant(
      new AssetStorageLocator(AssetStorageZone.CLEAN, 'clean', 'a.pdf'),
      300,
    )).resolves.toMatchObject({ url: expect.stringContaining('https://cdn.example.test/download') });
  });
  it('binds locator and upload-grant idempotency to asset identity, not just shared metadata', async () => {
    const keys: string[] = [];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      keys.push(new Headers(init?.headers).get('idempotency-key') ?? '');
      return jsonResponse({
        locator: { storageZone: 'QUARANTINE', bucketName: 'q', pathKey: 'uploads/a.pdf' },
        uploadUrl: 'https://object.example.test/upload', method: 'PUT',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      });
    });
    const gateway = new HttpAssetStorageGateway(options(fetchMock as any));
    await gateway.generateUploadLocator(AssetStorageZone.QUARANTINE, 'asset-a');
    await gateway.generateUploadLocator(AssetStorageZone.QUARANTINE, 'asset-b');
    await gateway.generateUploadLocator(AssetStorageZone.QUARANTINE, 'asset-a');
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0]).toBe(keys[2]);
    const base = { originalFilename: 'same.pdf', mimeType: 'application/pdf', byteSize: 200 };
    await gateway.generateUploadGrant(AssetStorageZone.QUARANTINE, { ...base, assetId: 'asset-a' });
    await gateway.generateUploadGrant(AssetStorageZone.QUARANTINE, { ...base, assetId: 'asset-b' });
    await gateway.generateUploadGrant(AssetStorageZone.QUARANTINE, { ...base, assetId: 'asset-a' });
    expect(keys[3]).not.toBe(keys[4]);
    expect(keys[3]).toBe(keys[5]);
  });

  it('rejects forged provider verification and accepts only observed signed content metadata', async () => {
    const locator = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'uploads/a.pdf');
    const request = { expectedByteSize: 50, declaredMimeType: 'application/pdf' };
    const provider = (result: unknown) => new HttpAssetStorageGateway(options(
      (async () => jsonResponse(result)) as any,
    ));
    await expect(provider({
      byteSize: 50, verifiedMimeType: 'application/pdf', signatureVerified: false,
      checksumSha256: 'a'.repeat(64), verifiedAt: new Date().toISOString(),
    }).verifyUploadedObject(locator, request)).rejects.toThrow('ASSET_PROVIDER_UPLOAD_VERIFICATION_FAILED');
    await expect(provider({
      byteSize: 51, verifiedMimeType: 'application/pdf', signatureVerified: true,
      checksumSha256: 'a'.repeat(64), verifiedAt: new Date().toISOString(),
    }).verifyUploadedObject(locator, request)).rejects.toThrow('ASSET_PROVIDER_UPLOAD_VERIFICATION_FAILED');
    await expect(provider({
      byteSize: 50, verifiedMimeType: 'application/pdf', signatureVerified: true,
      checksumSha256: 'a'.repeat(64), verifiedAt: new Date().toISOString(),
    }).verifyUploadedObject(locator, request)).resolves.toMatchObject({ byteSize: 50, signatureVerified: true });
  });

  it('requires an echoed source digest on provider promotion into CLEAN', async () => {
    const source = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'sanitized/asset.pdf');
    const sha256 = 'd'.repeat(64);
    const gateway = new HttpAssetStorageGateway(options((async (_url: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(new TextDecoder().decode(init?.body as Uint8Array));
      expect(payload.expectedSha256).toBe(sha256);
      return jsonResponse({
        locator: { storageZone: 'CLEAN', bucketName: 'c', pathKey: 'clean/asset.pdf' },
        verifiedSourceSha256: sha256,
      });
    }) as any));
    await expect(gateway.moveToCleanZone(source)).rejects.toThrow('ASSET_CLEAN_PROMOTION_CHECKSUM_REQUIRED');
    await expect(gateway.moveToCleanZone(source, sha256)).resolves.toMatchObject({
      storageZone: AssetStorageZone.CLEAN,
    });
    const legacy = new HttpAssetStorageGateway(options((async () => jsonResponse({
      locator: { storageZone: 'CLEAN', bucketName: 'c', pathKey: 'clean/asset.pdf' },
    })) as any));
    await expect(legacy.moveToCleanZone(source, sha256))
      .rejects.toThrow('ASSET_PROVIDER_ATOMIC_PROMOTION_PROOF_REQUIRED');
  });

  it('requires authoritative clean-byte proof before restored objects can be delivered', async () => {
    const locator = new AssetStorageLocator(AssetStorageZone.CLEAN, 'clean-bucket', 'clean/restored.pdf');
    const sha = 'a'.repeat(64);
    const request = { expectedSha256: sha, expectedByteSize: 125, declaredMimeType: 'application/pdf' };
    const healthy = new HttpAssetStorageGateway(options((async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(new TextDecoder().decode(init?.body as Uint8Array));
      expect(body.expectedSha256).toBe(sha);
      expect(body.locator.storageZone).toBe('CLEAN');
      return jsonResponse({
        verifiedSha256: sha, verifiedByteSize: 125, verifiedMimeType: 'application/pdf',
        verifiedAt: new Date().toISOString(), signatureVerified: true,
      });
    }) as any));
    await expect(healthy.verifyRestoredObject(locator, request)).resolves.toBeUndefined();
    const untrusted = new HttpAssetStorageGateway(options((async () => jsonResponse({
      verifiedSha256: sha, verifiedByteSize: 125, verifiedMimeType: 'application/pdf',
      verifiedAt: new Date().toISOString(),
    })) as any));
    await expect(untrusted.verifyRestoredObject(locator, request))
      .rejects.toThrow('ASSET_RESTORE_CONTENT_VERIFICATION_FAILED');
  });

});

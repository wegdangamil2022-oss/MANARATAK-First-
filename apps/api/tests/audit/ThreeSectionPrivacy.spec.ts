import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryAuditRecordRepository } from '@manaratak/infrastructure';
import { createAuditRecordFromDto, ManageAuditRecordsUseCase } from '@manaratak/application';
import { AssetPlatformRouter } from '../../src/presentation/api/router/AssetPlatformRouter';
import { AuditRouter } from '../../src/presentation/api/router/AuditRouter';

describe('three-section P0 privacy', () => {
  it.each(['get', 'post', 'put', 'delete'] as const)('blocks private owner asset ID through %s before effects', async method => {
    const effects = { requestDeliveryGrant: vi.fn(), purgeAsset: vi.fn() };
    const app = express(); app.use(express.json());
    app.use('/assets', AssetPlatformRouter.create({ ingestAssetUseCase: {} as never, processAssetLifecycleUseCase: effects as never,
      assetRecordRepository: { findById: vi.fn(async () => ({ owner: { ownerType: 'STUDENT' }, classification: 'PUBLIC' })) } as never }));
    const path = method === 'get' ? '' : method === 'put' ? '/rights' : method === 'delete' ? '/purge' : '/delivery-grant';
    const response = await request(app)[method]('/assets/private-id' + path).send({});
    expect(response.status).toBe(404);
    expect(effects.requestDeliveryGrant).not.toHaveBeenCalled(); expect(effects.purgeAsset).not.toHaveBeenCalled();
  });

  it('does not let the shared upload form create private student assets', async () => {
    const ingest = { requestUploadLocator: vi.fn() };
    const app = express(); app.use(express.json());
    app.use('/assets', AssetPlatformRouter.create({ ingestAssetUseCase: ingest as never, processAssetLifecycleUseCase: {} as never }));
    const response = await request(app).post('/assets/upload-locator').send({
      assetId: 'asset', assetReference: 'EAP-asset', ownerId: 'student', ownerType: 'STUDENT',
      originalFilename: 'private.pdf', mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 64, classification: 'INTERNAL',
    });
    expect(response.status).toBe(403); expect(ingest.requestUploadLocator).not.toHaveBeenCalled();
  });

  it('redacts legacy text and signed links on search/detail/export and audits access', async () => {
    const repository = new InMemoryAuditRecordRepository();
    await repository.save(createAuditRecordFromDto({ id: 'legacy', reference: 'AUD-legacy', action: 'LEGACY', category: 'SUPPORT',
      severity: 'INFO', actorId: 'staff', actorType: 'IDENTITY', targetId: 'case', targetType: 'SUPPORT_CASE', source: 'legacy', timestamp: new Date(),
      contextMetadata: { body: 'private-message', originalFilename: 'private-passport.pdf', link: 'https://storage.test/a?X-Amz-Signature=secret-link' } }));
    const app = express(); app.use((req, _res, next) => { req.authUserId = 'auditor'; next(); });
    app.use('/audit', AuditRouter.create({ manageAuditRecordsUseCase: new ManageAuditRecordsUseCase(repository), auditRecordRepo: repository }));
    for (const path of ['/records?reference=AUD-legacy', '/records/legacy', '/export?format=json&reference=AUD-legacy']) {
      const response = await request(app).get('/audit' + path);
      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toMatch(/private-message|private-passport|secret-link/);
      if (path.startsWith('/export')) expect(response.body.manifest).toMatchObject({ scope: 'BOUNDED_PAGE', cryptographicRecordVerification: false, exportedCount: 1 });
    }
    expect((await repository.queryPage({ category: 'AUDIT_ACCESS' })).items).toHaveLength(3);
  });

  it('fails closed before returning sensitive audit details if access auditing fails', async () => {
    const repository = new InMemoryAuditRecordRepository();
    const app = express(); app.use((req, _res, next) => { req.authUserId = 'auditor'; next(); });
    app.use('/audit', AuditRouter.create({ manageAuditRecordsUseCase: new ManageAuditRecordsUseCase(repository),
      auditRecordRepo: { save: vi.fn(async () => { throw Error('offline'); }) } as never }));
    expect((await request(app).get('/audit/export?format=json')).status).toBe(500);
  });
});

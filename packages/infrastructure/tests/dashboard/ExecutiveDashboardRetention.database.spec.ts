import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import { PrismaManagedApplicationEvidenceGateway } from '../../src/dashboard/PrismaDashboardMeasurementGateway';

describe('Executive evidence retention on the attested synthetic application-role target', () => {
  let db: PrismaClient, purge: PrismaManagedApplicationEvidenceGateway;
  let requestId = '',
    heldRequestId = '',
    assetId = '';
  const expired = new Date(Date.now() - 86400000),
    historic = new Date(Date.now() - 181 * 86400000);
  const held = randomUUID(),
    assetHeld = randomUUID(),
    removable = randomUUID(),
    current = randomUUID();
  beforeAll(async () => {
    if (
      process.env.EXECUTIVE_DASHBOARD_DB_TESTS !== 'YES' ||
      process.env.POST28_TARGET_LABEL !== 'DB-T' ||
      process.env.DATABASE_URL !== process.env.DIRECT_URL
    )
      throw new Error('EXECUTIVE_ISOLATED_DATABASE_AUTHORIZATION_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE!, 'utf8'));
    if (contract.kind !== 'POST28_LOCAL_DATABASE_TARGETS' || contract.postgresMajor !== 16)
      throw new Error('EXECUTIVE_LOCAL_POSTGRES16_REQUIRED');
    await preflightTargets(
      contract,
      [{ label: 'DB-T', url: process.env.DATABASE_URL }],
      process.env,
      contract.sourceSha,
      readDatabaseIdentity,
      { requireValidatedCatalog: true },
    );
    db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    const [role] = await db.$queryRaw<
      Array<{ safe: boolean }>
    >`SELECT NOT(rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls) AS safe FROM pg_roles WHERE rolname=current_user`;
    expect(role.safe).toBe(true);
    const service = await db.serviceCatalogRecord.findFirstOrThrow({
      where: { managedApplication: true },
    });
    const owner = await db.identityRecord.findFirstOrThrow({
      where: { createdBy: 'isolated-dashboard-fixture', status: 'ACTIVE' },
    });
    const asset = await db.assetRecord.findFirstOrThrow();
    assetId = asset.id;
    await db.assetRecord.update({
      where: { id: assetId },
      data: { legalHoldUntil: new Date(Date.now() + 86400000) },
    });
    const create = (legalHold: boolean) =>
      db.serviceRequestRecord.create({
        data: {
          publicId: 'retention-fixture-' + randomUUID(),
          studentReferenceId: owner.id,
          serviceId: service.id,
          status: 'IN_PROGRESS',
          requestParameters: {},
          serviceSnapshot: { managedApplication: true, fulfillmentPolicy: 'FREE' },
          ...(legalHold ? { legalHoldUntil: new Date(Date.now() + 86400000) } : {}),
        },
      });
    requestId = (await create(false)).id;
    heldRequestId = (await create(true)).id;
    await db.serviceApplicationEvidence.createMany({
      data: [
        {
          id: held,
          requestId: heldRequestId,
          evidenceAssetId: null,
          expiresAt: expired,
          verifiedAt: historic,
        },
        {
          id: assetHeld,
          requestId,
          evidenceAssetId: assetId,
          expiresAt: expired,
          verifiedAt: historic,
        },
        {
          id: removable,
          requestId,
          evidenceAssetId: null,
          expiresAt: expired,
          verifiedAt: historic,
        },
        {
          id: current,
          requestId,
          evidenceAssetId: null,
          expiresAt: new Date(Date.now() + 86400000),
          verifiedAt: new Date(),
        },
      ].map((row) => ({
        ...row,
        actorId: owner.id,
        kind: 'NEEDS_INFORMATION',
        idempotencyKey: 'retention-fixture-' + row.id,
      })),
    });
    purge = new PrismaManagedApplicationEvidenceGateway(db, async () => null);
  });
  afterAll(async () => {
    await db?.$disconnect();
  });
  it('retains expired attestations under request or asset legal hold while removing only expired unheld rows', async () => {
    await purge.purgeExpired();
    expect(
      (
        await db.serviceApplicationEvidence.findMany({
          where: { id: { in: [held, assetHeld, removable, current] } },
          select: { id: true },
        })
      )
        .map((row) => row.id)
        .sort(),
    ).toEqual([held, assetHeld, current].sort());
    await expect(db.serviceApplicationEvidence.delete({ where: { id: held } })).rejects.toThrow();
    await expect(
      db.serviceApplicationEvidence.delete({ where: { id: assetHeld } }),
    ).rejects.toThrow();
  });
  it('rejects direct SQL-null proof digests and duplicate proven stages without weakening the owner safeguards', async () => {
    const data = {
      requestId,
      kind: 'UNIVERSITY_SUBMITTED',
      actorId: 'synthetic-test-actor',
      idempotencyKey: 'proof-null-' + randomUUID(),
      evidenceDigest: null,
      expiresAt: new Date(Date.now() + 86400000),
    };
    await expect(db.serviceApplicationEvidence.create({ data })).rejects.toThrow();
    await db.serviceApplicationEvidence.create({
      data: { ...data, evidenceDigest: 'a'.repeat(64) },
    });
    await expect(
      db.serviceApplicationEvidence.create({
        data: {
          ...data,
          evidenceDigest: 'a'.repeat(64),
          idempotencyKey: 'different-command-' + randomUUID(),
        },
      }),
    ).rejects.toThrow();
  });
  it('binds the trusted private asset under the transaction lock and replays its atomic receipt once', async () => {
    const asset = await db.assetRecord.findUniqueOrThrow({ where: { id: assetId } });
    const gateway = new PrismaManagedApplicationEvidenceGateway(db, async () => null);
    const input = {
      requestId: heldRequestId,
      expectedVersion: 1,
      actorId: asset.ownerId,
      evidenceAssetId: assetId,
      kind: 'UNIVERSITY_SUBMITTED' as const,
      key: 'atomic-private-proof-' + randomUUID(),
    };
    const recorded = await gateway.append(input);
    expect(await gateway.append(input)).toEqual(recorded);
    expect(
      await db.transactionalOutboxRecord.count({
        where: { aggregateId: heldRequestId, eventType: 'ManagedApplicationEvidenceRecorded.v1' },
      }),
    ).toBe(1);
    expect(
      await db.auditRecord.count({
        where: { targetId: heldRequestId, action: 'MANAGED_APPLICATION_EVIDENCE_RECORDED' },
      }),
    ).toBe(1);
  });
  it('keeps the canonical mounted API readable through actual session and permission guards after router separation', async () => {
    const { createApiApp } = await import('../../../../apps/api/src/app');
    const { container } = await import('../../../../apps/api/src/infrastructure/di/container');
    const actor = await db.roleAssignmentRecord.findFirstOrThrow({
      where: { roleId: 'dashboard-lab-admin' },
    });
    const app = await createApiApp({
      resetCache: true,
      connectExternalServices: false,
      databaseClient: db,
      env: {
        NODE_ENV: 'test',
        LOG_LEVEL: 'error',
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_URL: process.env.DIRECT_URL,
      },
    });
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('ISOLATED_API_BIND_FAILED');
      const tokenProvider = container.resolve<any>('tokenProvider'),
        sessionId = randomUUID();
      await container
        .resolve<any>('sessionManager')
        .createSession(actor.identityId, await tokenProvider.generateRefreshToken(), sessionId);
      const token = await tokenProvider.generateAccessToken({
        userId: actor.identityId,
        sessionId,
      });
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/admin/dashboard/users?days=7`,
        { headers: { Authorization: 'Bearer ' + token } },
      );
      expect(response.status).toBe(200);
      expect((await response.json()).registeredUsers).toBe(2004);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await app.locals.runtimeResourceRegistry?.closeAll();
    }
  });
  it('detaches only expired unheld source files while preserving attestations and held evidence links', async () => {
    const asset = await db.assetRecord.findUniqueOrThrow({ where: { id: assetId } });
    const retained = await db.serviceApplicationEvidence.create({
      data: {
        requestId,
        kind: 'NEEDS_INFORMATION',
        actorId: asset.ownerId,
        idempotencyKey: 'source-retention-' + randomUUID(),
        evidenceAssetId: assetId,
        evidenceDigest: asset.checksumHash,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await db.assetRecord.update({
      where: { id: assetId },
      data: { legalHoldUntil: null, retentionExpiresAt: new Date(Date.now() - 1000) },
    });
    await purge.purgeExpired();
    const after = await db.serviceApplicationEvidence.findUniqueOrThrow({
      where: { id: retained.id },
    });
    expect(after.evidenceAssetId).toBeNull();
    expect(after.evidenceDigest).toBe(retained.evidenceDigest);
    expect(after.verifiedAt).toEqual(retained.verifiedAt);
    expect(
      await db.serviceApplicationEvidence.count({
        where: { requestId: heldRequestId, evidenceAssetId: assetId },
      }),
    ).toBeGreaterThan(0);
  });
  it('blocks direct evidence-link removal under asset hold, live retention or request hold', async () => {
    const asset = await db.assetRecord.findUniqueOrThrow({ where: { id: assetId } });
    const createEvidence = (ownerRequest: string) => db.serviceApplicationEvidence.create({
      data: {
        requestId: ownerRequest,
        actorId: asset.ownerId,
        kind: 'NEEDS_INFORMATION',
        idempotencyKey: 'direct-link-guard-' + randomUUID(),
        evidenceAssetId: assetId,
        evidenceDigest: asset.checksumHash,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const ordinary = await createEvidence(requestId);
    const heldRequest = await createEvidence(heldRequestId);
    const detach = (id: string) => db.serviceApplicationEvidence.update({
      where: { id }, data: { evidenceAssetId: null },
    });
    await db.assetRecord.update({ where: { id: assetId }, data: {
      retentionExpiresAt: new Date(Date.now() - 1000),
      legalHoldUntil: new Date(Date.now() + 86400000),
    } });
    await expect(detach(ordinary.id)).rejects.toThrow(/SERVICE_APPLICATION_EVIDENCE_RETENTION_PROTECTED/);
    await db.assetRecord.update({ where: { id: assetId }, data: {
      retentionExpiresAt: new Date(Date.now() + 86400000), legalHoldUntil: null,
    } });
    await expect(detach(ordinary.id)).rejects.toThrow(/SERVICE_APPLICATION_EVIDENCE_RETENTION_PROTECTED/);
    await db.assetRecord.update({ where: { id: assetId }, data: {
      retentionExpiresAt: new Date(Date.now() - 1000),
    } });
    await expect(detach(heldRequest.id)).rejects.toThrow(/SERVICE_APPLICATION_EVIDENCE_RETENTION_PROTECTED/);
    const detached = await detach(ordinary.id);
    expect(detached.evidenceDigest).toBe(ordinary.evidenceDigest);
    expect(detached.verifiedAt).toEqual(ordinary.verifiedAt);
    expect(detached.evidenceAssetId).toBeNull();
    expect((await db.serviceApplicationEvidence.findUniqueOrThrow({ where: { id: heldRequest.id } })).evidenceAssetId).toBe(assetId);
  });
});

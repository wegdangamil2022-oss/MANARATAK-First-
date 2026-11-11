import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { referenceCityScopeKey, normalizeReferenceIdentityToken, type AtomicPersistenceContext, type UniversalImportHandoff } from '@manaratak/domain';
import type { IReviewedGeographyBatchGateway, ReviewedGeographyBatch, GeographyBatchResult } from '@manaratak/application';
import { geographyCityHandoffs } from '@manaratak/application';
import { referenceImportPayloadDigest } from '@manaratak/application';
import { screeningReceiptIdentity } from '../import-foundation/PrismaImportScreeningReceiptStore';
import { PrismaReferenceOwnerReviewGateway } from './PrismaReferenceOwnerReviewGateway';

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const active = (row: { isActive: boolean; lifecycleState: string }) => row.isActive && row.lifecycleState === 'ACTIVE';
/** Bounded create-only persistence in the reference-data owner; no direct operator SQL writes. */
export class PrismaReviewedGeographyBatchGateway implements IReviewedGeographyBatchGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async screen(handoffs: UniversalImportHandoff[], results: unknown[]): Promise<void> {
    if (handoffs.length !== results.length || !handoffs.length || handoffs.length > 100) throw Error('GEOGRAPHY_SCREENING_BATCH_INVALID');
    const identities = handoffs.map(screeningReceiptIdentity);
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'screening:geography:' + handoffs[0].execution.executionId},0))::text`;
      const prior = await tx.importScreeningReceipt.findMany({ where: { ownerDomain: 'REFERENCE_DATA', handoffKey: { in: identities.map(row => row.handoffKey) } },
        select: { handoffKey: true, requestHash: true } });
      const rows = identities.flatMap((identity, index) => {
        const existing = prior.find(row => row.handoffKey === identity.handoffKey);
        if (existing && existing.requestHash !== identity.requestHash) throw Error('IMPORT_RECEIPT_CONTENT_CONFLICT');
        return existing ? [] : [{ id: randomUUID(), ...identity, result: json(results[index]) }];
      });
      if (rows.length) await tx.importScreeningReceipt.createMany({ data: rows });
    });
  }
  async create(batch: ReviewedGeographyBatch, context: AtomicPersistenceContext, actorId: string): Promise<GeographyBatchResult> {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx || !actorId) throw Error('GEOGRAPHY_OWNER_TRANSACTION_REQUIRED');
    // Identity scopes never cross countries. Serialize a country's creates while
    // allowing independent countries to progress without a global network lock.
    // Parent/region row locks and unique keys still protect ordinary owner edits.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'reference-data:geography-country:' + batch.countryIso2Code},0))::text`;
    // Never fetch the full retained source JSON merely to decide replay. This
    // keeps every batch response bounded even on a high-latency connection.
    const history = await tx.$queryRaw<Array<{ referenceId: string; reviewedHash: string; sourceKey: string; sourceRowHash: string }>>`SELECT "referenceId",snapshot->'source'->>'reviewedHash' AS "reviewedHash",snapshot->'source'->>'sourceKey' AS "sourceKey",snapshot->'source'->>'sourceRowHash' AS "sourceRowHash" FROM "ReferenceVersionRecord" WHERE "entityType"=${batch.entity} AND "changeReason"=${'SOURCE_BATCH:' + batch.batchId}`;
    if (history.length) {
      if (history.length !== batch.rows.length) throw Error('GEOGRAPHY_PARTIAL_BATCH_CONFLICT');
      const records = history.map(row => {
        const source = batch.rows.find(item => item.sourceKey === row.sourceKey);
        if (!source || row.reviewedHash !== batch.reviewedHash || row.sourceRowHash !== source.sourceRowHash) throw Error('GEOGRAPHY_REPLAY_SOURCE_CONFLICT');
        return { sourceKey: source.sourceKey, id: row.referenceId };
      });
      if (new Set(records.map(row => row.sourceKey)).size !== batch.rows.length) throw Error('GEOGRAPHY_REPLAY_IDENTITY_CONFLICT');
      return { records, replay: true };
    }
    const owner = new PrismaReferenceOwnerReviewGateway(this.prisma).withTransaction(context);
    await owner.verifyArtifact(batch.sourceArtifactId, batch.sourceContentHash);
    const parents = await tx.$queryRaw<Array<{ id: string; iso2Code: string; versionNumber: number; isActive: boolean; lifecycleState: string }>>`SELECT id,"iso2Code","versionNumber","isActive","lifecycleState" FROM "ReferenceCountry" WHERE "iso2Code"=${batch.countryIso2Code} FOR SHARE`;
    if (parents.length !== 1 || !active(parents[0])) throw Error('GEOGRAPHY_COUNTRY_INACTIVE');
    const country = parents[0], now = new Date();
    // Raw source rows already live in the checksum-verified permanent asset.
    // Keep an exact row locator/hash in each version instead of uploading the
    // entire source row a second time inside a snapshot of the same import.
    const source = (index: number) => ({ sourceKey: batch.rows[index].sourceKey, sourceRowHash: batch.rows[index].sourceRowHash,
      sourceFileHash: batch.rows[index].sourceFileHash, reviewedHash: batch.reviewedHash, batchId: batch.batchId,
      sourceArtifactId: batch.sourceArtifactId, sourceContentHash: batch.sourceContentHash, reviewer: actorId, reason: batch.reason });
    let records: Array<{ id: string; sourceKey: string }>, snapshots: Array<Record<string, unknown>>;
    if (batch.entity === 'REGION') {
      const codes = batch.rows.map(row => String(row.payload.regionCode));
      if (new Set(codes).size !== codes.length) throw Error('GEOGRAPHY_REGION_COLLISION');
      const existing = await tx.administrativeRegion.findMany({ where: { countryIso2Code: batch.countryIso2Code, regionCode: { in: codes } } });
      if (existing.length) throw Error('GEOGRAPHY_EXISTING_REGION_REQUIRES_VERSIONED_OWNER_EDIT');
      const rows = batch.rows.map(row => ({ id: randomUUID(), countryReferenceId: country.id, countryIso2Code: batch.countryIso2Code, regionCode: String(row.payload.regionCode), name: String(row.payload.name),
        nameAr: row.payload.nameAr as string | undefined, localName: row.payload.localName as string | undefined, regionType: row.payload.regionType as string | undefined,
        versionNumber: 1, lifecycleState: 'ACTIVE', isActive: true, effectiveFrom: now }));
      await tx.administrativeRegion.createMany({ data: rows });
      records = rows.map((row, index) => ({ id: row.id, sourceKey: batch.rows[index].sourceKey }));
      snapshots = rows.map((row, index) => ({ ...row, source: source(index) }));
    } else {
      const ids = [...new Set(batch.rows.map(row => String(row.payload.administrativeRegionId)))].sort();
      const regions = await tx.$queryRaw<Array<{ id: string; countryReferenceId: string; countryIso2Code: string; versionNumber: number; name: string; isActive: boolean; lifecycleState: string }>>(Prisma.sql`SELECT id,"countryReferenceId","countryIso2Code","versionNumber",name,"isActive","lifecycleState" FROM "AdministrativeRegion" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
      if (regions.length !== ids.length || regions.some(row => !active(row) || row.countryIso2Code !== country.iso2Code || row.countryReferenceId !== country.id)) throw Error('GEOGRAPHY_REGION_COUNTRY_MISMATCH');
      const candidates = await tx.referenceCity.findMany({ where: { countryIso2Code: batch.countryIso2Code },
        select: { countryIso2Code: true, name: true, administrativeRegionId: true, region: true } });
      const identities = new Set(candidates.map(referenceCityScopeKey));
      const keys = new Set<string>();
      for (const row of batch.rows) {
        const payload = row.payload as unknown as Parameters<typeof referenceCityScopeKey>[0], key = referenceCityScopeKey(payload);
        const parent = regions.find(item => item.id === payload.administrativeRegionId);
        if (identities.has(key) || keys.has(key) || !parent || normalizeReferenceIdentityToken(payload.region ?? '') !== normalizeReferenceIdentityToken(parent.name)) throw Error('GEOGRAPHY_CITY_IDENTITY_COLLISION_OR_REGION_NAME');
        keys.add(key);
      }
      const handoffs = geographyCityHandoffs(batch), receiptKeys = handoffs.map(row => screeningReceiptIdentity(row).handoffKey);
      const receipts = await tx.$queryRaw<Array<{ id: string; handoffKey: string; requestHash: string; screen: unknown }>>(Prisma.sql`SELECT id,"handoffKey","requestHash",jsonb_build_object('state',result->'state','normalizedPayloadHash',result->'normalizedPayloadHash','dryRun',result->'dryRun','sourceArtifactId',result->'sourceArtifactId','sourceContentHash',result->'sourceContentHash','issues',result->'issues') AS screen FROM "ImportScreeningReceipt" WHERE "ownerDomain"='REFERENCE_DATA' AND "handoffKey" IN (${Prisma.join(receiptKeys)})`);
      const evidence = handoffs.map((handoff, index) => {
        const identity = screeningReceiptIdentity(handoff), receipt = receipts.find(row => row.handoffKey === identity.handoffKey);
        const screen = receipt?.screen as { state: string; normalizedPayloadHash: string; dryRun: boolean; sourceArtifactId: string; sourceContentHash: string; issues: unknown[] };
        if (!receipt || receipt.requestHash !== identity.requestHash || screen.state !== 'NEEDS_OWNER_REVIEW' || screen.dryRun !== false || screen.issues.length || screen.sourceArtifactId !== batch.sourceArtifactId || screen.sourceContentHash !== batch.sourceContentHash || screen.normalizedPayloadHash !== referenceImportPayloadDigest(batch.rows[index].payload)) throw Error('GEOGRAPHY_SCREENING_EVIDENCE_CONFLICT');
        return receipt;
      });
      const rows = batch.rows.map(row => ({ id: randomUUID(), countryReferenceId: country.id, countryIso2Code: batch.countryIso2Code, name: String(row.payload.name), nameAr: row.payload.nameAr as string | undefined,
        region: String(row.payload.region), administrativeRegionId: String(row.payload.administrativeRegionId), canonicalIdentityKey: digest(referenceCityScopeKey(row.payload as unknown as Parameters<typeof referenceCityScopeKey>[0])), metadata: row.payload.metadata as Prisma.InputJsonValue | undefined,
        versionNumber: 1, lifecycleState: 'ACTIVE', isActive: true, effectiveFrom: now }));
      await tx.referenceCity.createMany({ data: rows });
      await tx.referenceOwnerImportReview.createMany({ data: rows.map((row, index) => {
        const preview = { issues: [], currentId: null, currentVersion: null, dependencyHash: referenceImportPayloadDigest({ country, region: regions.find(item => item.id === row.administrativeRegionId) }) };
        return { id: 'geo-review-' + digest(evidence[index].id), receiptId: evidence[index].id, sourceHash: evidence[index].requestHash, entityType: 'CITY', payload: json(batch.rows[index].payload), preview: json(preview), previewHash: referenceImportPayloadDigest({ payload: batch.rows[index].payload, preview }),
          version: 1, status: 'APPLIED', reviewer: actorId, reason: batch.reason + ' Batch approval hash: ' + batch.reviewedHash, result: json(row) };
      }) });
      records = rows.map((row, index) => ({ id: row.id, sourceKey: batch.rows[index].sourceKey }));
      snapshots = rows.map((row, index) => ({ ...row, source: source(index) }));
    }
    await tx.referenceVersionRecord.createMany({ data: records.map((row, index) => ({ id: randomUUID(), entityType: batch.entity, referenceId: row.id, versionNumber: 1, lifecycleState: 'ACTIVE', effectiveFrom: now, snapshot: json(snapshots[index]), changeReason: 'SOURCE_BATCH:' + batch.batchId, actorId })) });
    return { records, replay: false };
  }
}

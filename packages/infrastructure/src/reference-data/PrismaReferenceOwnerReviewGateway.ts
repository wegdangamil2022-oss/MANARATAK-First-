import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { AssetId, AtomicPersistenceContext, referenceCityScopeKey, normalizeReferenceIdentityToken } from '@manaratak/domain';
import type { IReferenceOwnerReviewGateway, ReferenceOwnerReview, ReferenceSnapshotRecord, P7ScreeningDecision } from '@manaratak/application';
import { referenceImportPayloadDigest } from '@manaratak/application';
import { PrismaAssetRecordRepository } from '../asset-platform/PrismaAssetRecordRepository';
import { PrismaReferenceDataRepository } from './PrismaReferenceDataRepository';
const tables = { COUNTRY: 'ReferenceCountry', CURRENCY: 'ReferenceCurrency', LANGUAGE: 'ReferenceLanguage', CITY: 'ReferenceCity' } as const;
export class PrismaReferenceOwnerReviewGateway implements IReferenceOwnerReviewGateway {
  constructor(private readonly prisma: PrismaClient, private readonly bound = false) {}
  withTransaction(context: AtomicPersistenceContext) {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('REFERENCE_OWNER_TRANSACTION_REQUIRED');
    return new PrismaReferenceOwnerReviewGateway(tx as unknown as PrismaClient, true);
  }
  async lock(key: string) {
    if (!this.bound) throw new Error('REFERENCE_OWNER_TRANSACTION_REQUIRED');
    await this.prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'reference-data:owner-review'}, 0))`;
    await this.prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
  async screening(id: string) {
    const receipt = await this.prisma.importScreeningReceipt.findUnique({ where: { id } });
    return receipt?.ownerDomain === 'REFERENCE_DATA' ? { requestHash: receipt.requestHash, result: receipt.result as unknown as P7ScreeningDecision } : null;
  }
  async verifyArtifact(id: string, hash: string) {
    if (!this.bound) throw new Error('REFERENCE_OWNER_TRANSACTION_REQUIRED');
    await this.prisma.$queryRaw`SELECT "id" FROM "AssetRecord" WHERE "id" = ${id} FOR SHARE`;
    const asset = await new PrismaAssetRecordRepository(this.prisma).findById(new AssetId(id));
    if (!asset) throw new Error('REFERENCE_OWNER_SOURCE_ARTIFACT_UNAVAILABLE');
    asset.assertCanDeliver();
    if (asset.checksum?.algorithm.toLowerCase() !== 'sha256' || asset.checksum.hash.toLowerCase() !== hash.toLowerCase()) throw new Error('REFERENCE_OWNER_SOURCE_HASH_CONFLICT');
  }
  private async canonical(type: ReferenceOwnerReview['entityType'], payload: Record<string, unknown>): Promise<any | null> {
    switch (type) {
      case 'COUNTRY': return this.prisma.referenceCountry.findUnique({ where: { iso2Code: String(payload.iso2Code) } });
      case 'CURRENCY': return this.prisma.referenceCurrency.findUnique({ where: { isoCode: String(payload.isoCode) } });
      case 'LANGUAGE': return this.prisma.referenceLanguage.findUnique({ where: { isoCode: String(payload.isoCode) } });
      case 'CITY': {
        const scope = referenceCityScopeKey(payload as any);
        const key = createHash('sha256').update(scope).digest('hex');
        const current = await this.prisma.referenceCity.findUnique({ where: { canonicalIdentityKey: key } });
        const candidates = await this.prisma.referenceCity.findMany({ where: { countryIso2Code: String(payload.countryIso2Code) }, take: 5001 });
        if (candidates.length > 5000) throw new Error('REFERENCE_OWNER_CITY_SCOPE_TOO_LARGE');
        const collisions = candidates.filter(row => referenceCityScopeKey(row) === scope && row.id !== current?.id);
        if (collisions.length) throw new Error('REFERENCE_OWNER_LEGACY_CITY_RECONCILIATION_REQUIRED');
        return current;
      }
    }
  }
  async inspect(type: ReferenceOwnerReview['entityType'], payload: Record<string, unknown>) {
    const current = await this.canonical(type, payload); const issues: string[] = [];
    const dependencies: unknown[] = [];
    if (current) {
      const locked = await this.prisma.$queryRaw<any[]>(Prisma.sql`SELECT to_jsonb(t) AS row FROM ${Prisma.raw(`"${tables[type]}"`)} t WHERE "id" = ${current.id} FOR SHARE`);
      if (locked[0]?.row.versionNumber !== current.versionNumber) throw new Error('REFERENCE_OWNER_STALE_PREVIEW');
      if (current.lifecycleState !== 'ACTIVE' || !current.isActive) issues.push('REFERENCE_NOT_EDITABLE');
      if (type === 'COUNTRY' && current.iso3Code !== payload.iso3Code) issues.push('IMMUTABLE_COUNTRY_ISO3');
      if (type === 'CITY' && normalizeReferenceIdentityToken(current.region ?? '') !== normalizeReferenceIdentityToken(String(payload.region ?? ''))) issues.push('IMMUTABLE_CITY_REGION');
    }
    const dependency = async (table: string, column: string, value: unknown) => {
      if (!value) return;
      const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`SELECT to_jsonb(t) AS row FROM ${Prisma.raw(`"${table}"`)} t WHERE ${Prisma.raw(`"${column}"`)} = ${String(value)} FOR SHARE`);
      const record = rows[0]?.row;
      if (rows.length !== 1 || !record.isActive || record.lifecycleState !== 'ACTIVE') issues.push(`INACTIVE_OR_MISSING_${table}`);
      dependencies.push(record ?? null); return record;
    };
    if (type === 'COUNTRY') { await dependency('ReferenceCurrency','isoCode',payload.defaultCurrencyCode); await dependency('ReferenceLanguage','isoCode',payload.defaultLanguageCode); }
    if (type === 'CITY') {
      const country = await dependency('ReferenceCountry','iso2Code',payload.countryIso2Code);
      const region = await dependency('AdministrativeRegion','id',payload.administrativeRegionId);
      if (region && (region.countryIso2Code !== payload.countryIso2Code || region.countryReferenceId !== country?.id)) issues.push('REGION_COUNTRY_MISMATCH');
    }
    // Flags are authored via the separate reviewed asset reference UI, not imported blindly.
    if (payload.flagAssetId) issues.push('FLAG_REQUIRES_OWNER_ASSET_REVIEW');
    return { issues, currentId: current?.id ?? null, currentVersion: current?.versionNumber ?? null,
      dependencyHash: referenceImportPayloadDigest({ dependencies }) };
  }
  async get(id: string) { const rows = await this.prisma.$queryRaw<ReferenceOwnerReview[]>`SELECT * FROM "ReferenceOwnerImportReview" WHERE "id" = ${id}`; return rows[0] ?? null; }
  async create(plan: ReferenceOwnerReview) {
    await this.prisma.$executeRaw`INSERT INTO "ReferenceOwnerImportReview" ("id","receiptId","sourceHash","entityType","payload","preview","previewHash","version","status","updatedAt") VALUES (${plan.id},${plan.receiptId},${plan.sourceHash},${plan.entityType},${JSON.stringify(plan.payload)}::jsonb,${JSON.stringify(plan.preview)}::jsonb,${plan.previewHash},${plan.version},${plan.status},NOW())`;
  }
  async save(plan: ReferenceOwnerReview, expectedVersion: number) {
    const changed = await this.prisma.$executeRaw`UPDATE "ReferenceOwnerImportReview" SET "preview"=${JSON.stringify(plan.preview)}::jsonb,"previewHash"=${plan.previewHash},"version"=${plan.version},"status"=${plan.status},"reviewer"=${plan.reviewer ?? null},"reason"=${plan.reason ?? null},"result"=${JSON.stringify(plan.result ?? null)}::jsonb,"updatedAt"=NOW() WHERE "id"=${plan.id} AND "version"=${expectedVersion}`;
    if (changed !== 1) throw new Error('REFERENCE_OWNER_REVIEW_CONFLICT');
  }
  async apply(plan: ReferenceOwnerReview, context: AtomicPersistenceContext, actor: string) {
    const repo = new PrismaReferenceDataRepository(this.prisma); const data = { ...plan.payload,
      ...(plan.preview.currentId ? { id: plan.preview.currentId, expectedVersion: plan.preview.currentVersion } : {}) } as any;
    switch (plan.entityType) {
      case 'COUNTRY': return repo.upsertCountryInTransaction(data,context,actor);
      case 'CURRENCY': return repo.upsertCurrencyInTransaction(data,context,actor);
      case 'LANGUAGE': return repo.upsertLanguageInTransaction(data,context,actor);
      case 'CITY': return repo.upsertCityInTransaction(data,context,actor);
    }
  }
  private page(page: number) { if (!Number.isSafeInteger(page) || page < 1 || page > 1000) throw new Error('REFERENCE_OWNER_PAGINATION_INVALID'); return (page-1)*25; }
  async list(page: number, status?: string) {
    const offset = this.page(page);
    const [data, counts] = await Promise.all([
      this.prisma.$queryRaw<ReferenceOwnerReview[]>`SELECT * FROM "ReferenceOwnerImportReview" WHERE (${status ?? null}::text IS NULL OR "status"=${status ?? null}) ORDER BY "updatedAt" DESC,"id" LIMIT 25 OFFSET ${offset}`,
      this.prisma.$queryRaw<Array<{total:bigint}>>`SELECT COUNT(*) AS total FROM "ReferenceOwnerImportReview" WHERE (${status ?? null}::text IS NULL OR "status"=${status ?? null})`]);
    return { data, total: Number(counts[0]?.total ?? 0) };
  }
  async snapshots(page: number) {
    const offset = this.page(page); const [rows, counts] = await Promise.all([
      this.prisma.$queryRaw<Array<{record:ReferenceSnapshotRecord}>>`SELECT "record" FROM "ReferenceStandardSnapshot" ORDER BY "updatedAt" DESC,"id" LIMIT 25 OFFSET ${offset}`,
      this.prisma.$queryRaw<Array<{total:bigint}>>`SELECT COUNT(*) AS total FROM "ReferenceStandardSnapshot"`]);
    return { data: rows.map(row => row.record), total: Number(counts[0]?.total ?? 0) };
  }
  async reviewedSnapshots() { const rows = await this.prisma.$queryRaw<Array<{record:ReferenceSnapshotRecord}>>`SELECT "record" FROM "ReferenceStandardSnapshot" WHERE "status"='REVIEWED' LIMIT 7`; if (rows.length > 6) throw new Error('REFERENCE_STANDARD_REGISTRY_CONFLICT'); return rows.map(row => row.record); }
  async snapshot(id: string) { const rows = await this.prisma.$queryRaw<Array<{record:ReferenceSnapshotRecord}>>`SELECT "record" FROM "ReferenceStandardSnapshot" WHERE "id"=${id}`; return rows[0]?.record ?? null; }
  async saveSnapshot(record: ReferenceSnapshotRecord, expectedVersion?: number) {
    if (expectedVersion === undefined) {
      await this.prisma.$executeRaw`INSERT INTO "ReferenceStandardSnapshot" ("id","family","status","version","record","updatedAt") VALUES (${record.snapshotId},${record.standardFamily},${record.status},${record.version},${JSON.stringify(record)}::jsonb,NOW())`; return;
    }
    const changed = await this.prisma.$executeRaw`UPDATE "ReferenceStandardSnapshot" SET "status"=${record.status},"version"=${record.version},"record"=${JSON.stringify(record)}::jsonb,"updatedAt"=NOW() WHERE "id"=${record.snapshotId} AND "version"=${expectedVersion}`;
    if (changed !== 1) throw new Error('REFERENCE_OWNER_REVIEW_CONFLICT');
  }
}

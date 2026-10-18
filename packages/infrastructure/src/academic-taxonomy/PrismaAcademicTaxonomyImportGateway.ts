import { Prisma, PrismaClient } from '@prisma/client';
import { AssetId, type AtomicPersistenceContext } from '@manaratak/domain';
import { PrismaAssetRecordRepository } from '../asset-platform/PrismaAssetRecordRepository';
import type { AcademicImportReview, IAcademicTaxonomyImportGateway } from '@manaratak/application';
export class PrismaAcademicTaxonomyImportGateway implements IAcademicTaxonomyImportGateway {
  constructor(private readonly prisma: PrismaClient, private readonly bound = false) {}
  withTransaction(context: AtomicPersistenceContext): IAcademicTaxonomyImportGateway {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('TAXONOMY_IMPORT_TRANSACTION_REQUIRED');
    return new PrismaAcademicTaxonomyImportGateway(tx as unknown as PrismaClient, true);
  }
  async verifyArtifact(artifactId: string, sha256: string) {
    if (!this.bound) throw new Error('TAXONOMY_IMPORT_TRANSACTION_REQUIRED');
    if (!artifactId?.trim() || !/^[a-f0-9]{64}$/i.test(sha256)) throw new Error('TAXONOMY_IMPORT_SOURCE_EVIDENCE_REQUIRED');
    await this.prisma.$queryRaw`SELECT "id" FROM "AssetRecord" WHERE "id" = ${artifactId} FOR SHARE`;
    const asset = await new PrismaAssetRecordRepository(this.prisma).findById(new AssetId(artifactId));
    if (!asset) throw new Error('TAXONOMY_IMPORT_SOURCE_ARTIFACT_UNAVAILABLE');
    asset.assertCanDeliver();
    if (asset.checksum?.algorithm.toLowerCase() !== 'sha256' || asset.checksum.hash.toLowerCase() !== sha256.toLowerCase())
      throw new Error('TAXONOMY_IMPORT_SOURCE_HASH_CONFLICT');
  }
  async lock(id: string) { await this.prisma.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`taxonomy-import:${id}`}, 0))`; }
  async screening(receiptId: string) {
    const row = await this.prisma.importScreeningReceipt.findUnique({ where: { id: receiptId } });
    return row && ['ACADEMIC_TAXONOMY', 'TAXONOMY'].includes(row.ownerDomain) ? { id: row.id, requestHash: row.requestHash, result: row.result } : null;
  }
  async get(id: string): Promise<AcademicImportReview | null> {
    const rows = await this.prisma.$queryRaw<AcademicImportReview[]>`SELECT * FROM "AcademicTaxonomyImportReview" WHERE "id" = ${id}`;
    return rows[0] ?? null;
  }
  async create(plan: AcademicImportReview) {
    await this.prisma.$executeRaw`INSERT INTO "AcademicTaxonomyImportReview"
      ("id", "receiptId", "sourceHash", "record", "preview", "previewHash", "status", "version", "updatedAt")
      VALUES (${plan.id}, ${plan.receiptId}, ${plan.sourceHash}, ${JSON.stringify(plan.record)}::jsonb,
      ${JSON.stringify(plan.preview)}::jsonb, ${plan.previewHash}, ${plan.status}, ${plan.version}, NOW())`;
  }
  async save(plan: AcademicImportReview, expectedVersion: number) {
    const changed = await this.prisma.$executeRaw`UPDATE "AcademicTaxonomyImportReview" SET "status" = ${plan.status},
      "preview" = ${JSON.stringify(plan.preview)}::jsonb, "previewHash" = ${plan.previewHash}, "version" = ${plan.version}, "reviewedBy" = ${plan.reviewedBy ?? null}, "reason" = ${plan.reason ?? null},
      "result" = ${JSON.stringify(plan.result ?? null)}::jsonb, "updatedAt" = NOW()
      WHERE "id" = ${plan.id} AND "version" = ${expectedVersion}`;
    if (changed !== 1) throw new Error('TAXONOMY_IMPORT_REVIEW_CONFLICT');
  }
  async list(page: number, status?: AcademicImportReview['status']) {
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000) throw new Error('TAXONOMY_PAGINATION_INVALID');
    const offset = (page - 1) * 25;
    const [data, counts] = await Promise.all([
      this.prisma.$queryRaw<AcademicImportReview[]>`SELECT * FROM "AcademicTaxonomyImportReview" WHERE (${status ?? null}::text IS NULL OR "status" = ${status ?? null}) ORDER BY "updatedAt" DESC, "id" LIMIT 25 OFFSET ${offset}`,
      this.prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*) AS total FROM "AcademicTaxonomyImportReview" WHERE (${status ?? null}::text IS NULL OR "status" = ${status ?? null})`,
    ]);
    return { data, total: Number(counts[0]?.total ?? 0) };
  }
  async listScreenings(page: number) {
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000) throw new Error('TAXONOMY_PAGINATION_INVALID');
    const offset = (page - 1) * 25;
    const [data, counts] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string; createdAt: Date; result: unknown }>>`SELECT s."id", s."createdAt", s."result" FROM "ImportScreeningReceipt" s WHERE s."ownerDomain" IN ('ACADEMIC_TAXONOMY', 'TAXONOMY') AND NOT EXISTS (SELECT 1 FROM "AcademicTaxonomyImportReview" p WHERE p."receiptId" = s."id") ORDER BY s."createdAt" DESC, s."id" LIMIT 25 OFFSET ${offset}`,
      this.prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*) AS total FROM "ImportScreeningReceipt" s WHERE s."ownerDomain" IN ('ACADEMIC_TAXONOMY', 'TAXONOMY') AND NOT EXISTS (SELECT 1 FROM "AcademicTaxonomyImportReview" p WHERE p."receiptId" = s."id")`,
    ]);
    return { data, total: Number(counts[0]?.total ?? 0) };
  }
}

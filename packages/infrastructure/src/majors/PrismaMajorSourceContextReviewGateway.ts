import { Prisma, type PrismaClient } from '@prisma/client';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import { majorSourceAcademicContext, type IMajorSourceContextReviewGateway, type MajorSourceContextReview } from '../../../application/src/majors/use-cases/ReviewMajorSourceContextUseCase';

export class PrismaMajorSourceContextReviewGateway implements IMajorSourceContextReviewGateway {
  async apply(input: MajorSourceContextReview, context: AtomicPersistenceContext, actorId: string) {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!tx || !context.boundaryId || !actorId) throw Error('MAJOR_CONTEXT_TRANSACTION_REQUIRED');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'major-import:owner-review'},0))::text`;
    const owners = await tx.majorLevelProfile.findMany({ where: { id: { in: input.rows.map(r => r.profileId) } }, select: { majorId: true } });
    if (owners.length !== input.rows.length) throw Error('MAJOR_CONTEXT_PROFILE_REQUIRED');
    // Follow the existing graph owner's lock order: major, profile, references.
    const majorIds = [...new Set(owners.map(p => p.majorId))].sort();
    const majors = await tx.$queryRaw<Array<{ id: string; status: string; currentPublishedVersionId: string | null }>>(Prisma.sql`
      SELECT id,status,"currentPublishedVersionId" FROM "Major" WHERE id IN (${Prisma.join(majorIds)}) ORDER BY id FOR UPDATE`);
    const profiles = await tx.$queryRaw<Array<{ id: string; majorId: string; code: string; status: string; academicFieldId: string | null; disciplineId: string | null; currentPublishedVersionId: string | null; updatedAt: Date; metadata: Record<string, unknown> | null }>>(Prisma.sql`
      SELECT id,"majorId",code,status,"academicFieldId","disciplineId","currentPublishedVersionId","updatedAt",metadata
      FROM "MajorLevelProfile" WHERE id IN (${Prisma.join(input.rows.map(r => r.profileId))}) ORDER BY id FOR UPDATE`);
    if (profiles.length !== input.rows.length) throw Error('MAJOR_CONTEXT_PROFILE_REQUIRED');
    const replay = input.rows.every(row => {
      const p = profiles.find(p => p.id === row.profileId), proof = p?.metadata?.sourceContextReview as Record<string, unknown> | undefined;
      return p?.code === row.code && p.academicFieldId === row.academicFieldId && proof?.reviewedHash === input.reviewedHash && proof.sourceVersionId === row.versionId;
    });
    if (replay) return { reviewed: input.rows.length, replay: true };
    const fields = await tx.$queryRaw<Array<{ id: string; nodeType: string; status: string; standardType: string | null; standardCode: string | null }>>(Prisma.sql`
      SELECT id,"nodeType",status,"standardType","standardCode" FROM "AcademicTaxonomyNode"
      WHERE id IN (${Prisma.join([...new Set(input.rows.map(r => r.academicFieldId))])}) ORDER BY id FOR SHARE`);
    // Only the first source table is needed; do not download whole dossiers.
    const versions = await tx.$queryRaw<Array<{ id: string; profileId: string; majorId: string; sourceImportRecordId: string; sourceHash: string; status: string; publishedAt: Date | null; approvedBy: string | null; firstBlock: Prisma.JsonValue }>>(Prisma.sql`
      SELECT id,"profileId","majorId","sourceImportRecordId","sourceHash",status,"publishedAt","approvedBy", "rawContentBlocks"->'contentBlocks'->0 AS "firstBlock"
      FROM "MajorVersion" v WHERE id IN (${Prisma.join(input.rows.map(r => r.versionId))})
        AND id=(SELECT latest.id FROM "MajorVersion" latest WHERE latest."profileId"=v."profileId" ORDER BY latest."versionNumber" DESC LIMIT 1)
        AND EXISTS(SELECT 1 FROM "ImportRecord" r JOIN "MajorImportOwnerReview" o
          ON o.payload=v."rawContentBlocks" AND o.status='APPLIED'
          AND o.result->>'profileId'=v."profileId" AND o.result->>'majorId'=v."majorId"
          WHERE r.id=v."sourceImportRecordId" AND r."rawPayload"->'_phase6HandoffEnvelope'->'normalizedPayload'=o.payload)
      ORDER BY id FOR SHARE`);
    const changes = input.rows.map(row => {
      const p = profiles.find(p => p.id === row.profileId)!, v = versions.find(v => v.id === row.versionId), m = majors.find(m => m.id === p.majorId), field = fields.find(f => f.id === row.academicFieldId);
      if (p.code !== row.code || p.academicFieldId || p.disciplineId || p.metadata?.sourceContextReview || p.updatedAt.getTime() !== Date.parse(row.expectedRevision) ||
        p.status !== 'READY_TO_REVIEW' || p.currentPublishedVersionId || !m || m.status !== 'READY_TO_REVIEW' || m.currentPublishedVersionId ||
        !v || v.profileId !== p.id || v.majorId !== p.majorId || !v.sourceImportRecordId || !v.sourceHash || v.status !== 'NEEDS_REVIEW' || v.publishedAt || v.approvedBy ||
        majorSourceAcademicContext([v.firstBlock]) !== row.sourceContext || !field || field.nodeType !== 'ACADEMIC_FIELD' || field.status !== 'ACTIVE') throw Error('MAJOR_CONTEXT_SOURCE_OR_REVISION_CONFLICT');
      return { ...row, majorId: p.majorId, standardType: field.standardType, standardCode: field.standardCode,
        proof: { reviewedHash: input.reviewedHash, sourceVersionId: v.id, sourceHash: v.sourceHash, sourceContext: row.sourceContext, academicFieldId: field.id, actorId, reason: input.reason } };
    });
    const changed = await tx.$executeRaw`UPDATE "MajorLevelProfile" p SET "academicFieldId"=x.value->>'academicFieldId',
      metadata=COALESCE(p.metadata,'{}'::jsonb) || jsonb_build_object('sourceContextReview',x.value->'proof'),
      "updatedAt"=GREATEST(clock_timestamp(),p."updatedAt"+interval '1 millisecond')
      FROM jsonb_array_elements(${JSON.stringify(changes)}::jsonb) x(value) WHERE p.id=x.value->>'profileId'`;
    if (changed !== changes.length) throw Error('MAJOR_CONTEXT_WRITE_COUNT_CONFLICT');
    await (tx as unknown as PrismaClient).majorClassificationMapping.createMany({ data: changes.map(row => ({ majorId: row.majorId, profileId: row.profileId,
      taxonomyNodeId: row.academicFieldId, relationshipType: 'PRIMARY', standardType: row.standardType, standardCode: row.standardCode,
      notes: input.reason, metadata: { source: 'EXPLICIT_SOURCE_CONTEXT_REVIEW', evidenceReference: row.versionId, reviewedHash: input.reviewedHash } })), skipDuplicates: true });
    return { reviewed: changes.length, replay: false };
  }
}

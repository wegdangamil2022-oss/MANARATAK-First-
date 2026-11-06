import { Prisma } from '@prisma/client';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import type { IMajorClassificationReviewGateway, MajorClassificationReviewBatch } from '../../../application/src/majors/use-cases/ReviewMajorClassificationBatchUseCase';

export class PrismaMajorClassificationReviewGateway implements IMajorClassificationReviewGateway {
  async apply(input: MajorClassificationReviewBatch, context: AtomicPersistenceContext, actorId: string) {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!tx || !context.boundaryId || !actorId) throw Error('MAJOR_CLASSIFICATION_TRANSACTION_REQUIRED');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'major-import:owner-review'},0))::text`;
    const owners = await tx.majorLevelProfile.findMany({ where: { id: { in: input.rows.map(r => r.profileId) } }, select: { majorId: true } });
    if (owners.length !== input.rows.length) throw Error('MAJOR_CLASSIFICATION_PROFILE_REQUIRED');
    const majorIds = [...new Set(owners.map(p => p.majorId))].sort();
    const majors = await tx.$queryRaw<Array<{ id: string; status: string; currentPublishedVersionId: string | null }>>(Prisma.sql`
      SELECT id,status,"currentPublishedVersionId" FROM "Major" WHERE id IN (${Prisma.join(majorIds)}) ORDER BY id FOR UPDATE`);
    const profiles = await tx.$queryRaw<Array<{ id: string; majorId: string; code: string; status: string; academicFieldId: string | null;
      disciplineId: string | null; currentPublishedVersionId: string | null; updatedAt: Date; metadata: Record<string, unknown> | null }>>(Prisma.sql`
      SELECT id,"majorId",code,status,"academicFieldId","disciplineId","currentPublishedVersionId","updatedAt",metadata
      FROM "MajorLevelProfile" WHERE id IN (${Prisma.join(input.rows.map(r => r.profileId))}) ORDER BY id FOR UPDATE`);
    if (profiles.length !== input.rows.length) throw Error('MAJOR_CLASSIFICATION_PROFILE_REQUIRED');
    if (input.rows.every(row => {
      const p = profiles.find(p => p.id === row.profileId), proof = p?.metadata?.classificationReview as Record<string, unknown> | undefined;
      return p?.code === row.code && p.academicFieldId === row.academicFieldId && p.disciplineId === row.disciplineId &&
        proof?.reviewedHash === input.reviewedHash && proof.sourceVersionId === row.versionId;
    })) return { reviewed: input.rows.length, replay: true };
    const ids = [...new Set(input.rows.flatMap(r => [r.academicFieldId, r.disciplineId]))].sort();
    const nodes = await tx.$queryRaw<Array<{ id: string; nodeType: string; status: string; standardType: string; standardCode: string | null }>>(Prisma.sql`
      SELECT id,"nodeType",status,"standardType","standardCode" FROM "AcademicTaxonomyNode" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR SHARE`);
    const edges = await tx.academicTaxonomyEdge.findMany({ where: { parentNodeId: { in: ids }, childNodeId: { in: ids } }, select: { parentNodeId: true, childNodeId: true } });
    const versions = await tx.$queryRaw<Array<{ id: string; profileId: string; majorId: string; canonicalName: string; sourceHash: string; status: string;
      publishedAt: Date | null; approvedBy: string | null }>>(Prisma.sql`
      SELECT v.id,v."profileId",v."majorId",v."rawContentBlocks"->>'canonicalMajorName' AS "canonicalName",v."sourceHash",v.status,v."publishedAt",v."approvedBy"
      FROM "MajorVersion" v WHERE v.id IN (${Prisma.join(input.rows.map(r => r.versionId))})
      AND v.id=(SELECT latest.id FROM "MajorVersion" latest WHERE latest."profileId"=v."profileId" ORDER BY latest."versionNumber" DESC LIMIT 1)
      AND EXISTS(SELECT 1 FROM "ImportRecord" r JOIN "MajorImportOwnerReview" o ON o.payload=v."rawContentBlocks" AND o.status='APPLIED'
        AND o.result->>'profileId'=v."profileId" AND o.result->>'majorId'=v."majorId"
        WHERE r.id=v."sourceImportRecordId" AND r."rawPayload"->'_phase6HandoffEnvelope'->'normalizedPayload'=o.payload)
      ORDER BY v.id FOR SHARE`);
    const changes = input.rows.map(row => {
      const p = profiles.find(p => p.id === row.profileId)!, m = majors.find(m => m.id === p.majorId), v = versions.find(v => v.id === row.versionId);
      const field = nodes.find(n => n.id === row.academicFieldId), discipline = nodes.find(n => n.id === row.disciplineId);
      if (p.code !== row.code || p.academicFieldId || p.disciplineId || p.metadata?.classificationReview ||
        p.updatedAt.getTime() !== Date.parse(row.expectedRevision) || p.status !== 'READY_TO_REVIEW' || p.currentPublishedVersionId ||
        !m || m.status !== 'READY_TO_REVIEW' || m.currentPublishedVersionId || !v || v.profileId !== p.id || v.majorId !== p.majorId ||
        v.canonicalName !== row.canonicalName || !v.sourceHash || v.status !== 'NEEDS_REVIEW' || v.publishedAt || v.approvedBy ||
        field?.nodeType !== 'ACADEMIC_FIELD' || field.status !== 'ACTIVE' || discipline?.nodeType !== 'DISCIPLINE' || discipline.status !== 'ACTIVE' ||
        !edges.some(e => e.parentNodeId === field.id && e.childNodeId === discipline.id)) throw Error('MAJOR_CLASSIFICATION_SOURCE_OR_REFERENCE_CONFLICT');
      return { ...row, majorId: p.majorId, proof: { reviewedHash: input.reviewedHash, sourceVersionId: v.id, sourceHash: v.sourceHash,
        canonicalName: row.canonicalName, academicFieldId: field.id, disciplineId: discipline.id, actorId, rationale: row.rationale } };
    });
    const updates = changes.map(row => ({ profileId: row.profileId, academicFieldId: row.academicFieldId, disciplineId: row.disciplineId, proof: row.proof }));
    const changed = await tx.$executeRaw`UPDATE "MajorLevelProfile" p SET "academicFieldId"=x.value->>'academicFieldId',"disciplineId"=x.value->>'disciplineId',
      metadata=COALESCE(p.metadata,'{}'::jsonb) || jsonb_build_object('classificationReview',x.value->'proof','taxonomyReview','OWNER_REVIEWED_CLASSIFICATION'),
      "updatedAt"=GREATEST(clock_timestamp(),p."updatedAt"+interval '1 millisecond')
      FROM jsonb_array_elements(${JSON.stringify(updates)}::jsonb) x(value) WHERE p.id=x.value->>'profileId'`;
    if (changed !== changes.length) throw Error('MAJOR_CLASSIFICATION_WRITE_COUNT_CONFLICT');
    // Copy the complete rationale already verified and stored above, rather than
    // uploading it again for both mapping rows on a slow database connection.
    await tx.$executeRaw`INSERT INTO "MajorClassificationMapping"
      (id,"majorId","profileId","taxonomyNodeId","relationshipType","standardType","standardCode",notes,metadata,"createdAt","updatedAt")
      SELECT gen_random_uuid()::text,p."majorId",p.id,choice.id,choice.relationship,n."standardType",n."standardCode",
        p.metadata->'classificationReview'->>'rationale',
        jsonb_build_object('source','OWNER_CLASSIFICATION_REVIEW','evidenceReference',p.metadata->'classificationReview'->>'sourceVersionId','reviewedHash',${input.reviewedHash}),
        clock_timestamp(),clock_timestamp()
      FROM "MajorLevelProfile" p CROSS JOIN LATERAL(VALUES(p."academicFieldId",'PRIMARY'),(p."disciplineId",'SECONDARY')) choice(id,relationship)
      JOIN "AcademicTaxonomyNode" n ON n.id=choice.id
      WHERE p.id IN(SELECT jsonb_array_elements_text(${JSON.stringify(changes.map(r => r.profileId))}::jsonb))
        AND p.metadata->'classificationReview'->>'reviewedHash'=${input.reviewedHash}
      ON CONFLICT("majorId","profileId","taxonomyNodeId","relationshipType") DO NOTHING`;
    // Existing concept identities and conflicting degree-specific classifications stay intact.
    await tx.$executeRaw`UPDATE "Major" m SET "academicFieldId"=p."academicFieldId","updatedAt"=GREATEST(clock_timestamp(),m."updatedAt"+interval '1 millisecond')
      FROM "MajorLevelProfile" p WHERE m.id=p."majorId" AND m.id IN(SELECT jsonb_array_elements_text(${JSON.stringify(majorIds)}::jsonb))
      AND m."academicFieldId" IS NULL AND p."academicFieldId" IS NOT NULL
      AND NOT EXISTS(SELECT 1 FROM "MajorLevelProfile" other WHERE other."majorId"=m.id AND other."academicFieldId" IS DISTINCT FROM p."academicFieldId")`;
    return { reviewed: changes.length, replay: false };
  }
}

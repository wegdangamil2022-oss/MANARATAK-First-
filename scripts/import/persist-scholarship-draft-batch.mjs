import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {scholarshipDraftTables} from './native-scholarship-draft-client.mjs';
export const scholarshipDraftPlanHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Called only inside the authorized audited owner transaction. The graph is
 * the frozen output of ScholarshipImportAtomicTransferUseCase + Prisma repository. */
export async function persistScholarshipDraftBatch(tx,batch,context) {
  assert.match(context.planHash,/^[a-f0-9]{64}$/);assert.ok(batch.rows.length>0&&batch.rows.length<=25);
  const requestHash=scholarshipDraftPlanHash(batch),handoffKey=scholarshipDraftPlanHash('draft:'+context.planHash+':'+batch.index);
  await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text','scholarship-draft:'+handoffKey);
  const prior=await tx.importScreeningReceipt.findUnique({where:{ownerDomain_handoffKey:{ownerDomain:'SCHOLARSHIPS',handoffKey}}});
  if(prior){assert.equal(prior.requestHash,requestHash,'DRAFT_REPLAY_DRIFT');return {...prior.result,replayed:true};}
  const ids=batch.rows.map(row=>row.recordId);assert.equal(new Set(ids).size,ids.length);
  await tx.$queryRawUnsafe('SELECT id FROM "ImportRecord" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',ids);
  const sources=context.sources.filter(row=>ids.includes(row.id));assert.equal(sources.length,ids.length);
  await tx.assertDraftSources(sources.map(row=>({id:row.id,rawPayload:row.rawPayload,processingNotes:row.processingNotes??null})));
  const [review]=await tx.$queryRawUnsafe(`SELECT
    (SELECT count(*) FROM "ScholarshipImportVerificationDecision" WHERE "recordId"=ANY($1::text[]))+
    (SELECT count(*) FROM "ScholarshipImportCanonicalResolutionDecision" WHERE "recordId"=ANY($1::text[])) AS count,
    (SELECT count(*) FROM "ImportReviewAssignment" WHERE "recordId"=ANY($1::text[]) AND "claimUntil">now() AND "claimedBy" IS DISTINCT FROM $2) AS leases`,ids,context.actorId);
  assert.equal(Number(review.count),0,'DRAFT_DURABLE_REVIEW_CHANGED');assert.equal(Number(review.leases),0,'DRAFT_REVIEW_LEASE_CONFLICT');
  const references={ReferenceCountry:new Set(),ReferenceLanguage:new Set(),DegreeLevel:new Set(),Major:new Set(),InternationalTest:new Set(),University:new Set(),ReferenceCurrency:new Set()};
  for(const row of batch.rows){
    const root=row.graph.Scholarship;assert.equal(root.length,1);const data=root[0];assert.equal(data.sourceImportRecordId,row.recordId);
    assert.equal(data.publicationStatus,'DRAFT');assert.equal(data.verificationStatus,'PENDING');assert.equal(data.lastVerifiedAt,null);
    assert.ok(data.optionalFields.metadata.sourceDraftReview);assert.equal(data.optionalFields.metadata.sourceDraftReview.actorId,context.actorId);
    assert.equal(data.optionalFields.metadata.sourceArtifactSha256,context.sourceHash);
    assert.equal(row.promotion.promotedEntityId,data.id);
    for(const table of Object.keys(row.graph))assert.ok(scholarshipDraftTables.includes(table));
    const add=(table,id)=>{if(id)references[table].add(id);};
    add('ReferenceCountry',data.countryReferenceId);add('ReferenceLanguage',data.studyLanguageReferenceId);
    for(const item of row.graph.ScholarshipDegreeTarget??[])add('DegreeLevel',item.degreeLevelId);
    for(const item of row.graph.ScholarshipMajorTarget??[])add('Major',item.majorId);
    for(const item of row.graph.ScholarshipEligibilityItem??[]){add('InternationalTest',item.internationalTestId);add('Major',item.majorId);add('DegreeLevel',item.degreeLevelId);add('ReferenceCountry',item.countryReferenceId);}
    for(const item of row.graph.ScholarshipRequiredDocument??[])add('InternationalTest',item.internationalTestId);
    for(const item of row.graph.ScholarshipUniversityLink??[]){add('University',item.universityId);assert.ok(!item.academicProgramId,'DRAFT_PROGRAM_REQUIRES_OWNER_SCOPE');}
    for(const item of row.graph.ScholarshipSponsorContext??[])add('University',item.universityId);
    for(const item of row.graph.ScholarshipBenefit??[])add('ReferenceCurrency',item.currencyReferenceId);
    for(const id of data.optionalFields.metadata.sourceRelationships?.testIds??[])add('InternationalTest',id);
  }
  // All targets remain real and usable in this transaction; never manufacture IDs.
  const checks=[],parameters=[],expectedCounts=new Map();
  for(const[table,set]of Object.entries(references))if(set.size){
    const predicate=table.startsWith('Reference')?'"isActive"=true AND "lifecycleState"=\'ACTIVE\'':table==='DegreeLevel'?"status='ACTIVE'":"status NOT IN ('ARCHIVED','REJECTED','DELETED','INACTIVE')";
    parameters.push([...set]);expectedCounts.set(table,set.size);
    checks.push(`SELECT '${table}' AS "table",count(*)::int AS count FROM "${table}" WHERE id=ANY($${parameters.length}::text[]) AND ${predicate}`);
  }
  if(checks.length)for(const result of await tx.$queryRawUnsafe(checks.join(' UNION ALL '),...parameters))assert.equal(result.count,expectedCounts.get(result.table),'DRAFT_REFERENCE_CHANGED:'+result.table);
  await tx.copyScholarshipGraph(batch.rows.map(row=>row.graph));
  const count=await tx.$executeRawUnsafe(`UPDATE "ImportRecord" actual SET "promotedEntityId"=expected."promotedEntityId","processingNotes"=expected."processingNotes","updatedAt"=now()
    FROM jsonb_to_recordset($1::jsonb) AS expected(id text,"promotedEntityId" text,"processingNotes" text)
    WHERE actual.id=expected.id AND actual."promotedEntityId" IS NULL`,JSON.stringify(batch.rows.map(row=>row.promotion)));assert.equal(count,ids.length);
  const result={transferred:ids.length,scholarshipIds:batch.rows.map(row=>row.promotion.promotedEntityId),publication:false,verification:'PENDING',replayed:false};
  await tx.importScreeningReceipt.create({data:{id:handoffKey,ownerDomain:'SCHOLARSHIPS',handoffKey,requestHash,result}});return result;
}

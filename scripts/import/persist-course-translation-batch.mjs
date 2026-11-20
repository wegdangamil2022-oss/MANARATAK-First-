import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {courseBulkHash} from './persist-external-course-batch.mjs';
/** Run inside the audited atomic coordinator; never publishes or changes source facts. */
export async function persistCourseTranslationBatch(tx,batch,context) {
  assert.ok(batch.length>0&&batch.length<=100);
  assert.match(context.sourceHash,/^[a-f0-9]{64}$/);
  const handoffKey=courseBulkHash(['COURSE_AR_TRANSLATION',context.sourceHash,context.index]);
  await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',handoffKey);
  const requestHash=courseBulkHash(batch);
  const previous=await tx.importScreeningReceipt.findUnique({where:{ownerDomain_handoffKey:{ownerDomain:'COURSE_TRANSLATIONS',handoffKey}}});
  if(previous){assert.equal(previous.requestHash,requestHash,'COURSE_TRANSLATION_REPLAY_DRIFT');return {...previous.result,replayed:true};}
  const ids=batch.map(item=>item.before.id);
  assert.equal(new Set(ids).size,ids.length);
  await tx.$queryRawUnsafe('SELECT id FROM "Course" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',ids);
  const current=await tx.course.findMany({where:{id:{in:ids}}});
  assert.equal(current.length,batch.length);
  for(const item of batch){const actual=current.find(row=>row.id===item.before.id);assert.equal(courseBulkHash(actual),courseBulkHash(item.before),'COURSE_TRANSLATION_OWNER_CHANGED');assert.equal(actual.status,'IMPORTED');assert.equal(actual.originType,'EXTERNAL_LINKED_COURSE');}
  const tables=['CourseModule','CourseLesson','CourseLessonAsset','CourseQuiz','CourseQuestionBank','CourseQuestion','CourseLessonContentBlock'];
  const children=await tx.$queryRawUnsafe(tables.map(table=>`SELECT id FROM "${table}" WHERE "courseId"=ANY($1::text[])`).join(' UNION ALL ')+' LIMIT 1',ids);
  assert.equal(children.length,0,'EXTERNAL_COURSE_HAS_LEARNING_GRAPH');
  const payload=batch.map(item=>({id:item.before.id,version:item.before.version,optionalFields:item.optionalFields}));
  const changed=await tx.$executeRawUnsafe(`UPDATE "Course" c SET "optionalFields"=p."optionalFields", version=c.version+1,"updatedAt"=now() FROM jsonb_to_recordset($1::jsonb) p(id text,version integer,"optionalFields" jsonb) WHERE c.id=p.id AND c.version=p.version AND c.status='IMPORTED'`,JSON.stringify(payload));
  assert.equal(changed,batch.length,'COURSE_TRANSLATION_VERSION_CONFLICT');
  const updated=await tx.course.findMany({where:{id:{in:ids}}});
  const versions=updated.map(course=>({courseId:course.id,versionNumber:course.version,reason:'OWNER_SUPPLIED_ARABIC_TRANSLATION_IMPORT',createdBy:context.actorId,snapshot:JSON.parse(JSON.stringify({course,modules:[],lessons:[],assets:[],quizzes:[],questionBanks:[],questions:[],contentBlocks:[]}))}));
  assert.equal((await tx.courseVersion.createMany({data:versions})).count,batch.length);
  const result={imported:batch.length,courseIds:ids,sourceHash:context.sourceHash};
  await tx.importScreeningReceipt.create({data:{id:randomUUID(),ownerDomain:'COURSE_TRANSLATIONS',handoffKey,requestHash,result}});
  return result;
}

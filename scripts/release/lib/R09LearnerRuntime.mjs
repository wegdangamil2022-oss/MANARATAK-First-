import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export async function seedR09LearnerFixture(setup, credentialHash) {
  const courseId=randomUUID(),moduleId=randomUUID(),lessonIds=[randomUUID(),randomUUID()],otherId=randomUUID(),otherEmail=otherId+'@example.invalid';
  await setup.identityRecord.create({data:{id:otherId,type:'Human',status:'ACTIVE',createdBy:'R09_SYNTHETIC_FIXTURE',user:{create:{displayName:'R09 second learner',primaryEmail:otherEmail,isEmailVerified:true}},account:{create:{accessState:'Active'}},credentials:{create:{type:'password',passwordHash:credentialHash}},roleAssignments:{create:{id:randomUUID(),roleId:'student'}}}});
  await setup.studentWorkspace.create({data:{studentReferenceId:otherId,status:'ACTIVE',displayName:'R09 second learner'}});
  const course=await setup.course.create({data:{id:courseId,publicId:courseId,slug:courseId,canonicalName:courseId,canonicalDedupKey:courseId,displayName:'R09 synthetic learner course',accessType:'FREE_STUDY',originType:'NATIVE_MANARATAK_COURSE',directCourseUrl:'https://example.invalid/'+courseId,status:'PUBLISHED',completenessStatus:'COMPLETE'}});
  const module=await setup.courseModule.create({data:{id:moduleId,courseId,title:'R09 synthetic module',position:1,status:'PUBLISHED'}});
  const lessons=[];for(const [index,id]of lessonIds.entries())lessons.push(await setup.courseLesson.create({data:{id,courseId,moduleId,title:'R09 synthetic lesson '+(index+1),lessonType:'ARTICLE',position:index+1,status:'PUBLISHED',contentText:'R09 synthetic learning content '+(index+1)}}));
  // Immutable published definition is required by the real learning contract.
  await setup.courseVersion.create({data:{courseId,versionNumber:1,reason:'R09 isolated published fixture',createdBy:'R09_SYNTHETIC_FIXTURE',snapshot:JSON.parse(JSON.stringify({course,modules:[module],lessons,assets:[],quizzes:[],questionBanks:[],questions:[]}))}});
  return {courseId,lessonIds,otherId,otherEmail};
}

export async function exerciseR09Learner({page,origin,email,password,db,fixtureId,fixture,proof,pageErrors}) {
  const {courseId,lessonIds,otherId,otherEmail}=fixture;
  const deepLink='/ar/student/courses/'+courseId+'?lesson=intro#progress';
  const workspacePath='/api/v1/student/courses/'+courseId+'/workspace';
  const enrollPath='/api/v1/student/courses/'+courseId+'/enroll';
  const responseFor=(target,method)=>page.waitForResponse(response=>new URL(response.url()).pathname===target&&response.request().method()===method);
  await page.goto(origin+deepLink);
  await page.getByRole('heading',{name:'سجّل الدخول لمتابعة التعلم',exact:true}).waitFor();
  await page.getByRole('link',{name:'تسجيل الدخول',exact:true}).click();await page.waitForURL(origin+'/ar/login');
  await page.locator('#account-email').fill(email);await page.locator('#account-password').fill(password);
  const login=responseFor('/api/v1/auth/login','POST');await page.locator('form button[type=submit]').click();assert.equal((await login).status(),200);
  await page.waitForURL(origin+deepLink);
  await page.getByRole('heading',{name:'ابدأ هذه الدورة على منارتك',exact:true}).waitFor();
  const enrollment=responseFor(enrollPath,'POST');await page.getByRole('button',{name:'التسجيل في الدورة',exact:true}).click();assert.equal((await enrollment).status(),201);
  await page.getByRole('heading',{name:'R09 synthetic lesson 1',exact:true}).waitFor();
  const progress=responseFor('/api/v1/student/courses/'+courseId+'/lessons/'+lessonIds[0]+'/progress','PUT');
  await page.locator('article').filter({has:page.getByRole('heading',{name:'R09 synthetic lesson 1',exact:true})}).getByRole('button',{name:'تحديد الدرس كمكتمل',exact:true}).click();assert.equal((await progress).status(),200);
  await page.locator('progress[value="50"]').waitFor();
  await page.reload();await page.locator('progress[value="50"]').waitFor();assert.equal(new URL(page.url()).hash,'#progress');
  const owned=await db.courseEnrollment.findUniqueOrThrow({where:{courseId_studentReferenceId:{courseId,studentReferenceId:fixtureId}}});
  assert.equal(owned.progressPercentage,50);assert.equal(await db.courseLessonProgress.count({where:{courseId,studentReferenceId:fixtureId,progressPercentage:100}}),1);
  const aggregateIds=[owned.id,courseId+':'+fixtureId];
  assert.equal(await db.auditRecord.count({where:{targetId:{in:aggregateIds}}}),2);
  assert.equal(await db.transactionalOutboxRecord.count({where:{aggregateId:{in:aggregateIds}}}),2);
  await page.screenshot({path:path.join(proof,'r09-learner.png'),fullPage:true});
  const denied=await page.evaluate(async()=>{const r=await fetch('/api/v1/admin/courses',{credentials:'include'});return{status:r.status,body:await r.json()};});assert.equal(denied.status,403);
  await page.goto(origin+'/admin/courses');await page.waitForURL(url=>/^\/(?:ar\/)?student\/?$/.test(url.pathname));
  const otherContext=await page.context().browser().newContext({ignoreHTTPSErrors:false});
  try {
    await otherContext.route('**/*',route=>{const target=new URL(route.request().url());return target.origin===origin||['data:','blob:'].includes(target.protocol)?route.continue():route.abort();});
    const other=await otherContext.newPage();other.on('pageerror',error=>pageErrors.push(error.message));
    await other.goto(origin+'/ar/login');await other.locator('#account-email').fill(otherEmail);await other.locator('#account-password').fill(password);
    const otherLogin=other.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/auth/login'&&response.request().method()==='POST');await other.locator('form button[type=submit]').click();assert.equal((await otherLogin).status(),200);await other.waitForURL(url=>/^\/(?:ar\/)?student\/?$/.test(url.pathname));
    const blocked=other.waitForResponse(response=>new URL(response.url()).pathname===workspacePath);await other.goto(origin+deepLink);assert.equal((await blocked).status(),403);
    await other.getByRole('heading',{name:'ابدأ هذه الدورة على منارتك',exact:true}).waitFor();assert.equal(await other.getByText('R09 synthetic learning content 1',{exact:true}).count(),0);
    const otherEnrollment=other.waitForResponse(response=>new URL(response.url()).pathname===enrollPath&&response.request().method()==='POST');await other.getByRole('button',{name:'التسجيل في الدورة',exact:true}).click();assert.equal((await otherEnrollment).status(),201);
    await other.locator('progress[value="0"]').waitFor();
    assert.equal(await db.courseLessonProgress.count({where:{courseId,studentReferenceId:otherId}}),0);
    assert.equal((await db.courseEnrollment.findUniqueOrThrow({where:{courseId_studentReferenceId:{courseId,studentReferenceId:fixtureId}}})).progressPercentage,50);
  }finally{await otherContext.close();}
  return {localizedDeepLinkPreserved:true,queryAndFragmentPreserved:true,realUiEnrollment:true,realUiLessonCompletion:true,persistedAfterReload:true,firstStudentProgress:50,secondStudentProgress:0,studentAdminApiStatus:denied.status,studentAdminUiRedirected:true,unenrolledContentDenied:true,applicationRole:'post28_app',auditAndOutboxVerified:true,externalProvidersEnabled:false,englishUiEnabled:false,fullR09Acceptance:false};
}

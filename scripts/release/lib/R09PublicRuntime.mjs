import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export async function seedR09PublicFixture(setup) {
  const category='r09-public-'+randomUUID(),privateMarker='R09_PRIVATE_'+randomUUID(),rows=[];
  const states=[['PUBLISHED','COMPLETE'],['PUBLISHED','COMPLETE'],['PUBLISHED','COMPLETE'],['DRAFT','COMPLETE'],['ARCHIVED','COMPLETE'],['PUBLISHED','INCOMPLETE'],['PUBLISHED','COMPLETE','unresolved']];
  for(const [index,[status,completenessStatus,unresolved]]of states.entries()){
    const id=randomUUID();rows.push(await setup.course.create({data:{id,publicId:randomUUID(),slug:'r09-'+id,canonicalName:id,canonicalDedupKey:id,displayName:'R09 public course '+index,category,accessType:'FREE_STUDY',originType:'NATIVE_MANARATAK_COURSE',directCourseUrl:'/courses/r09-'+id,status,completenessStatus,...(unresolved?{learningLanguageRaw:'R09 unresolved language'}:{}),optionalFields:{internalOnlyMarker:privateMarker}}}));
  }
  const module=await setup.courseModule.create({data:{courseId:rows[0].id,title:'R09 public module summary',position:1,status:'PUBLISHED'}});
  await setup.courseLesson.create({data:{courseId:rows[0].id,moduleId:module.id,title:'R09 enrolled-only lesson',position:1,status:'PUBLISHED',lessonType:'ARTICLE',contentText:privateMarker}});
  return {category,privateMarker,published:rows.slice(0,3).map(({id,slug,displayName})=>({id,slug,displayName})),hidden:rows.slice(3).map(({id,slug,displayName,status,completenessStatus,learningLanguageRaw})=>({id,slug,displayName,status,completenessStatus,learningLanguageRaw}))};
}

export async function exerciseR09Public({page,origin,db,fixture,proof}) {
  await page.goto(origin+'/ar/courses');await page.getByRole('heading',{name:'الدورات',exact:true}).waitFor();
  const request=target=>page.evaluate(async target=>{const response=await fetch(target,{credentials:'omit'});return{status:response.status,cacheControl:response.headers.get('cache-control'),body:await response.json()};},target);
  const owners=await db.course.findMany({where:{category:fixture.category},orderBy:{id:'asc'},select:{id:true,status:true,completenessStatus:true,learningLanguageRaw:true}});
  assert.equal(owners.length,7);
  const expected=owners.filter(row=>row.status==='PUBLISHED'&&row.completenessStatus==='COMPLETE'&&!row.learningLanguageRaw).map(row=>row.id);
  assert.equal(expected.length,3);
  const seen=[],pages=[];let cursor=null;
  for(let index=0;index<4;index++){
    const query=new URLSearchParams({locale:'ar',category:fixture.category,limit:'1'});if(cursor)query.set('cursor',cursor);
    const response=await request('/api/v1/public/courses?'+query);assert.equal(response.status,200);assert.equal(response.cacheControl,'no-store');
    const body=response.body;assert.equal(body.total,expected.length);assert.equal(body.totalPages,3);assert.equal(body.data.length,1);assert.equal(JSON.stringify(body).includes(fixture.privateMarker),false);
    seen.push(body.data[0].ownerId);pages.push({ownerId:body.data[0].ownerId,total:body.total,hasMore:body.hasMore});
    if(!body.hasMore){assert.equal(body.nextCursor,null);break;}assert(body.nextCursor&&body.nextCursor!==cursor);cursor=body.nextCursor;
  }
  assert.equal(pages.length,3);assert.deepEqual(seen,expected);assert.equal(new Set(seen).size,3);
  for(const row of fixture.published){const response=await request('/api/v1/public/courses/'+row.slug+'?locale=ar');assert.equal(response.status,200);assert.equal(response.cacheControl,'no-store');assert.equal(response.body.ownerId,row.id);assert.equal(response.body.displayName,row.displayName);assert.equal(JSON.stringify(response.body).includes(fixture.privateMarker),false);if(row.id===fixture.published[0].id){assert.equal(response.body.lessonsCount,1);assert.equal(response.body.curriculumModules[0].title,'R09 public module summary');}}
  const empty=await request('/api/v1/public/courses?category='+fixture.category+'-empty&locale=ar');assert.equal(empty.status,200);assert.equal(empty.body.total,0);assert.deepEqual(empty.body.data,[]);assert.equal(empty.body.hasMore,false);
  for(const row of fixture.hidden){const response=await request('/api/v1/public/courses/'+row.slug+'?locale=ar');assert.equal(response.status,404);assert.equal(JSON.stringify(response.body).includes(fixture.privateMarker),false);}
  const published=fixture.published[0];await page.goto(origin+'/ar/courses/'+published.slug);await page.getByRole('heading',{name:published.displayName,exact:true}).waitFor();
  assert.equal(await page.locator('a[href="/ar/student/courses/'+published.id+'"]').count(),1);assert.equal((await page.locator('body').innerText()).includes(fixture.privateMarker),false);
  await page.screenshot({path:path.join(proof,'r09-public-course.png'),fullPage:true});
  const hidden=fixture.hidden[0];const denied=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/public/courses/'+hidden.slug);await page.goto(origin+'/ar/courses/'+hidden.slug);assert.equal((await denied).status(),404);
  await page.getByRole('heading',{name:'الدورات',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:hidden.displayName,exact:true}).count(),0);assert.equal((await page.locator('body').innerText()).includes(fixture.privateMarker),false);
  await page.screenshot({path:path.join(proof,'r09-public-hidden.png'),fullPage:true});
  return {anonymousRead:true,ownerIdsMatched:true,paginationPages:pages,duplicateOwnerIds:false,hiddenStates:fixture.hidden.map(row=>({status:row.status,completenessStatus:row.completenessStatus,unresolvedLanguage:Boolean(row.learningLanguageRaw),httpStatus:404})),privateLessonContentAbsent:true,privateMetadataAbsent:true,emptyIsSuccessfulZero:true,publishedUiRendered:true,learnerLinkUsesOwnerId:true,hiddenUiFallsBackToCatalog:true,fullPublicationLifecycleExercised:false,fullR09Acceptance:false};
}

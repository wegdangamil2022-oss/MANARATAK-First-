import express from 'express';
import request from 'supertest';
import {randomUUID as fresh} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {PrismaCourseRelationshipRepository} from '../../packages/infrastructure/src/courses/PrismaCourseRelationshipRepository.ts';
import {PrismaCourseRepository} from '../../packages/infrastructure/src/courses/PrismaCourseRepository.ts';
import {PublicCourseUseCases} from '../../packages/application/src/courses/use-cases/PublicCourseUseCases.ts';
import {CourseRelationshipQueryService} from '../../packages/application/src/courses/services/CourseRelationshipQueryService.ts';
import {CoursePublicRouter} from '../../apps/api/src/presentation/api/router/CoursePublicRouter.ts';
let db,app,repository;
const owner=id=>({id,publicId:id,slug:id,canonicalName:id,canonicalDedupKey:id,displayName:'Synthetic DEC05 owner',status:'PUBLISHED',completenessStatus:'COMPLETE'});
async function fixture(independent=false){
 const course=fresh(),major=fresh(),node=fresh(),resolution=fresh(),link=fresh(),projection=fresh();
 await db.course.create({data:{...owner(course),originType:'NATIVE_MANARATAK_COURSE',accessType:'FREE_STUDY',directCourseUrl:'https://example.invalid/synthetic/'+course}});
 await db.major.create({data:owner(major)});
 await db.academicTaxonomyNode.create({data:{id:node,deterministicKey:node,nodeType:'DISCIPLINE',canonicalCode:node,canonicalName:node,status:'ACTIVE'}});
 await db.courseTaxonomyResolution.create({data:{id:resolution,courseId:course,sourceTerm:'Synthetic topic',normalizedTerm:'synthetic topic',status:'APPROVED',candidateTaxonomyNodeIds:[node],chosenTaxonomyNodeId:node}});
 await db.courseAcademicTaxonomyLink.create({data:{id:link,courseId:course,taxonomyNodeId:node,sourceResolutionId:resolution,matchMethod:'MANUAL_REVIEW',sourceTerm:'Synthetic topic',reviewState:'APPROVED'}});
 await db.courseMajorProjection.create({data:{id:projection,projectionKey:projection,courseId:course,majorId:major,taxonomyNodeId:node,sourceCourseTaxonomyLinkId:link,sourceType:'TAXONOMY_MAPPING',relationshipType:'RELATED',projectionState:'APPROVED'}});
 let direct;
 if(independent){direct=fresh();await db.courseMajorProjection.create({data:{id:direct,projectionKey:direct,courseId:course,majorId:major,sourceType:'DIRECT_REVIEWED',relationshipType:'RELATED',projectionState:'APPROVED'}});}
 return {course,major,node,resolution,link,projection,direct};
}

async function page(c,extra={}){return request(app).get('/courses').query({majorId:c.major,...extra});}
async function result(c,n){const r=await page(c);expect(r.status).toBe(200);expect(r.headers['cache-control']).toBe('no-store');expect(r.body.total).toBe(n);expect(r.body.data.map(x=>x.slug)).toEqual(n?[c.course]:[]);return r;}
describe('Post28 course major public visibility and degree facet contract',()=>{
 beforeAll(async()=>{if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='course-major-visibility'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw new Error('POST28_DB_T_RUNNER_REQUIRED');db=new PrismaClient({log:[],errorFormat:'minimal'});await db.$connect();expect((await db.$queryRaw`SELECT current_user AS role`)[0].role).toBe('post28_app');repository=new PrismaCourseRelationshipRepository(db);app=express();app.use('/courses',CoursePublicRouter.create({publicCourseUseCases:new PublicCourseUseCases(new PrismaCourseRepository(db)),courseRelationshipQueryService:new CourseRelationshipQueryService(repository)}));});
 afterAll(async()=>{await db?.$disconnect();});
 it('allows an approved major relationship without profile and does not infer degree from training text',async()=>{const c=await fixture();await db.course.update({where:{id:c.course},data:{studyLevelRaw:'Doctorate professional training'}});const r=await result(c,1);expect(r.body.data[0]).not.toHaveProperty('degreeLevelId');expect(r.body.data[0]).not.toHaveProperty('profileId');});
 it.each(['PROPOSED','REVIEW_REQUIRED'])('hides %s projections before public page and count',async projectionState=>{const c=await fixture();await db.courseMajorProjection.update({where:{id:c.projection},data:{projectionState}});await result(c,0);});
 it.each(['DRAFT','ARCHIVED'])('withdraws courses when their target major becomes %s',async status=>{const c=await fixture();await result(c,1);await db.major.update({where:{id:c.major},data:{status}});await result(c,0);});
 it('rejects an unsupported degree filter rather than returning an unfiltered successful response',async()=>{const c=await fixture();expect((await page(c,{degreeLevelId:fresh()})).status).toBe(400);});
 it('rejects an unsupported profile filter rather than inferring an academic degree',async()=>{const c=await fixture();expect((await page(c,{profileId:fresh()})).status).toBe(400);});
 it('refreshes the next no-store HTTP graph after source reconciliation and preserves independent valid links',async()=>{const c=await fixture(),independent=await fixture(true);await result(c,1);await result(independent,1);for(const item of [c,independent])await repository.reconcileTaxonomyRelationships({courseId:item.course,activeNormalizedTerms:[]});await result(c,0);await result(independent,1);expect((await db.courseMajorProjection.findUnique({where:{id:c.projection}})).projectionState).toBe('REVIEW_REQUIRED');expect((await db.courseMajorProjection.findUnique({where:{id:independent.direct}})).projectionState).toBe('APPROVED');});
});

import fs from 'node:fs';
import ts from 'typescript';
import {randomUUID,randomBytes} from 'node:crypto';
import express from 'express';
import request from 'supertest';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {AuthorizationEvaluatorService} from '@manaratak/domain';
import {CourseAdminRouter} from '../../apps/api/src/presentation/api/router/CourseAdminRouter.ts';
import {CourseAdminCommandUseCases} from '../../packages/application/src/courses/use-cases/CourseAdminCommandUseCases.ts';
import {LearningPathUseCases} from '../../packages/application/src/courses/use-cases/LearningPathUseCases.ts';
import {PrismaLearningPathRepository} from '../../packages/infrastructure/src/courses/PrismaLearningPathRepository.ts';
import {PrismaCourseRepository} from '../../packages/infrastructure/src/courses/PrismaCourseRepository.ts';
import {PrismaCourseProgressRepository} from '../../packages/infrastructure/src/courses/PrismaCourseProgressRepository.ts';
import {JwtTokenProvider,generateEphemeralJwtKeySet} from '../../packages/infrastructure/src/auth/JwtTokenProvider.ts';
import {PrismaSessionManager} from '../../packages/infrastructure/src/auth/PrismaSessionManager.ts';
import {PrismaIdentityRepository} from '../../packages/infrastructure/src/identity/PrismaIdentityRepository.ts';
import {IdentityPrincipalAccessValidator} from '../../packages/application/src/auth/IdentityPrincipalAccessValidator.ts';
import {PrismaRoleRepository} from '../../packages/infrastructure/src/authorization/PrismaRoleRepository.ts';
import {PrismaPolicyRepository} from '../../packages/infrastructure/src/authorization/PrismaPolicyRepository.ts';
import {PrismaRoleAssignmentRepository} from '../../packages/infrastructure/src/authorization/PrismaRoleAssignmentRepository.ts';
import {DefaultPolicyEvaluator} from '../../packages/infrastructure/src/authorization/DefaultPolicyEvaluator.ts';
import {PrismaApiIdempotencyStore} from '../../packages/infrastructure/src/api-foundation/PrismaApiIdempotencyStore.ts';
import {SecurityService} from '../../packages/infrastructure/src/security/SecurityService.ts';
import {SecurityMiddlewareFactory} from '../../apps/api/src/presentation/security/SecurityMiddlewareFactory.ts';
import {createCanonicalIdempotencyMiddleware} from '../../apps/api/src/presentation/middleware/CanonicalIdempotencyMiddleware.ts';
import {AtomicDomainMutationCoordinator} from '../../packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator.ts';
import {AtomicAuditedOutboxMutationExecutor} from '../../packages/application/src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor.ts';
import {PrismaAtomicPersistenceUnitOfWork} from '../../packages/infrastructure/src/event-foundation/PrismaAtomicPersistenceUnitOfWork.ts';
import {PrismaTransactionalOutboxStore} from '../../packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts';
import {PrismaAuditRecordRepository} from '../../packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts';
const fresh=()=>randomUUID();let db,app,tokens,sessions,security;
function productionAdminIdempotency(store,evaluator){
 const source=fs.readFileSync('apps/api/src/app.ts','utf8'),tree=ts.createSourceFile('app.ts',source,ts.ScriptTarget.Latest,true);let callback;
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(tree)==='v1Router.use'&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='/admin'&&ts.isArrowFunction(node.arguments[1])&&node.arguments[1].getText(tree).includes('createCanonicalIdempotencyMiddleware')){if(callback)throw new Error('POST28_AMBIGUOUS_ADMIN_REPLAY_BOUNDARY');callback=node.arguments[1].getText(tree);}ts.forEachChild(node,visit);}
 visit(tree);if(!callback)throw new Error('POST28_ADMIN_REPLAY_BOUNDARY_REQUIRED');
 // Execute the real mounted callback, with real stores and the persisted evaluator.
 return new Function('createCanonicalIdempotencyMiddleware','apiIdempotencyStore','requireAdminPermission','return ('+callback+');')(createCanonicalIdempotencyMiddleware,store,permission=>SecurityMiddlewareFactory.createAdminPermissionGuard(permission,evaluator));
}

async function principal(permissions=[]){const id=fresh(),roleId=fresh(),sessionId=fresh();await db.identityRecord.create({data:{id,type:'Human',status:'ACTIVE',createdBy:'post28-fixture',user:{create:{displayName:'Synthetic reviewer',primaryEmail:id+'@example.invalid',isEmailVerified:true}},account:{create:{accessState:'Active'}}}});await db.roleRecord.create({data:{id:roleId,name:'Synthetic least privilege',description:'Local fixture only',permissions:permissions,policyIds:[]}});await db.roleAssignmentRecord.create({data:{id:fresh(),identityId:id,roleId}});const auth=await tokens.generateTokens({userId:id,sessionId});await sessions.createSession(id,auth.refreshToken,sessionId);return {id,roleId,token:auth.accessToken,refresh:auth.refreshToken};}
const atomic=()=>new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(new PrismaAtomicPersistenceUnitOfWork(db),new PrismaAuditRecordRepository(db),new PrismaTransactionalOutboxStore(db)));
const base='/admin/courses/learning-paths';
function mutate(p,path,body={},method='post',version,key=fresh()){
 const r=request(app)[method](base+path).set('Authorization','Bearer '+p.token).set('Cookie','manaratak_refresh='+p.refresh).set('X-CSRF-Token',security.generateCsrfToken(p.refresh)).set('X-Review-Reason','Synthetic approved-policy author verification').set('Idempotency-Key',key);
 if(version!==undefined)r.set('If-Match',String(version));return r.send(body);
}
async function body(certificateEligible){const key=fresh();const c=await new PrismaCourseRepository(db).create({publicId:key,slug:key,canonicalName:key,canonicalDedupKey:key,displayName:'Synthetic native prerequisite',status:'PUBLISHED',completenessStatus:'COMPLETE',originType:'NATIVE_MANARATAK_COURSE',accessType:'FREE_STUDY',directCourseUrl:'https://example.invalid/'+key});return {title:'Synthetic HTTP path '+key,...(certificateEligible===undefined?{}:{certificateEligible}),courses:[{courseId:c.id,position:1,required:true,prerequisiteCourseIds:[]}]};}
async function facts(id){return {root:await db.learningPath.findUnique({where:{id}}),versions:await db.learningPathVersion.findMany({where:{learningPathId:id},orderBy:{versionNumber:'asc'}}),audits:await db.auditRecord.count({where:{targetId:id}}),outbox:await db.transactionalOutboxRecord.count({where:{aggregateId:id}})};}
describe('CD028 actual authenticated path opt-in author commands',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='learning-path-http'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');db=new PrismaClient({log:[],errorFormat:'minimal'});await db.$connect();expect((await db.$queryRaw`SELECT current_user AS role`)[0].role).toBe('post28_app');
  tokens=new JwtTokenProvider(generateEphemeralJwtKeySet('post28-path-http'));sessions=new PrismaSessionManager(db);security=new SecurityService(undefined,{signingSecret:randomBytes(32).toString('hex')});const evaluator=new AuthorizationEvaluatorService(new PrismaRoleRepository(db),new PrismaPolicyRepository(db),new PrismaRoleAssignmentRepository(db),new DefaultPolicyEvaluator());
  const courses=new PrismaCourseRepository(db),paths=new PrismaLearningPathRepository(db),progress=new PrismaCourseProgressRepository(db),scope=tx=>({learningPathUseCases:new LearningPathUseCases(paths.withTransaction(tx),courses.withTransaction(tx),progress.withTransaction(tx))});
  const commands=new CourseAdminCommandUseCases(courses,paths,atomic(),scope);
  app=express();app.use(express.json());app.use(SecurityMiddlewareFactory.createCsrfGuard(security,{exemptBearerAuth:false}));app.use('/admin',SecurityMiddlewareFactory.createAdminGuard({mode:'strict',tokenProvider:tokens,sessionManager:sessions,principalAccessValidator:new IdentityPrincipalAccessValidator(new PrismaIdentityRepository(db))}));app.use('/admin',productionAdminIdempotency(new PrismaApiIdempotencyStore(db),evaluator));app.use('/admin/courses',SecurityMiddlewareFactory.createAdminPermissionGuard('admin:courses:manage',evaluator),CourseAdminRouter.create({learningPathUseCases:new LearningPathUseCases(paths,courses,progress),courseAdminCommandUseCases:commands}));
 });
 afterAll(async()=>{await db?.$disconnect();});
 it('persists explicit opt-in only through authenticated create review and publication versions',async()=>{const p=await principal(['admin:courses:manage']),created=await mutate(p,'',await body(true));expect(created.status,created.text).toBe(201);let path=created.body;expect(path.certificateEligible).toBe(true);for(const action of ['mark-publishable','publish']){const r=await mutate(p,'/'+path.id+'/'+action,{},'post',path.version);expect(r.status,r.text).toBe(200);path=r.body;expect(path.certificateEligible).toBe(true);}const f=await facts(path.id);expect(f.root.status).toBe('PUBLISHED');expect(f.versions).toHaveLength(3);expect(f.versions.every(v=>v.snapshot.certificateEligibility.enabled===true)).toBe(true);expect(f.audits).toBe(2);expect(f.outbox).toBe(2);});
 it('defaults omitted eligibility to false without inferring Course policy',async()=>{const p=await principal(['admin:courses:manage']),r=await mutate(p,'',await body());expect(r.status,r.text).toBe(201);expect(r.body.certificateEligible).toBe(false);});
 it('rejects revoked permissions on an already issued JWT without appending policy history',async()=>{const p=await principal(['admin:courses:manage']),r=await mutate(p,'',await body(false));expect(r.status,r.text).toBe(201);const before=await facts(r.body.id);await db.roleAssignmentRecord.deleteMany({where:{identityId:p.id}});const denied=await mutate(p,'/'+r.body.id,{title:'Rejected policy change',certificateEligible:true},'patch',r.body.version);expect(denied.status,denied.text).toBe(403);expect(await facts(r.body.id)).toEqual(before);});
 it('rejects stale draft policy edits without updating any prior version',async()=>{const p=await principal(['admin:courses:manage']),r=await mutate(p,'',await body(false));expect(r.status,r.text).toBe(201);const before=await facts(r.body.id),denied=await mutate(p,'/'+r.body.id,{title:r.body.title,certificateEligible:true},'patch',r.body.version+1);expect(denied.status,denied.text).toBe(409);expect(await facts(r.body.id)).toEqual(before);});
 it('rejects published policy editing and preserves every historical snapshot',async()=>{const p=await principal(['admin:courses:manage']),r=await mutate(p,'',await body(false));expect(r.status,r.text).toBe(201);let path=r.body;for(const action of ['mark-publishable','publish']){const x=await mutate(p,'/'+path.id+'/'+action,{},'post',path.version);expect(x.status,x.text).toBe(200);path=x.body;}const before=await facts(path.id),denied=await mutate(p,'/'+path.id,{title:path.title,certificateEligible:true},'patch',path.version);expect(denied.status,denied.text).toBe(400);expect(denied.body.error).toBe('LEARNING_PATH_PUBLISHED_STRUCTURE_IMMUTABLE');expect(await facts(path.id)).toEqual(before);});
});

import {describe,it,expect,vi,beforeEach} from 'vitest';
const policy=vi.hoisted(()=>({enabled:false}));
vi.mock('@manaratak/shared',async original=>{const module=await original<any>();return {...module,assertTranslationContentAuthoringEnabled:(...args:any[])=>{if(!policy.enabled)module.assertTranslationContentAuthoringEnabled(...args);}};});
import {prepareOwnerDescription,approvedOwnerDescriptions,assertOwnerDescriptionsCurrent} from '../../src/localization/OwnerLocalizedDescription';
import {AdminScholarshipUseCases} from '../../src/scholarships/use-cases/AdminScholarshipUseCases';
import {InternationalTestAdminUseCases} from '../../src/tests-platform/use-cases/InternationalTestUseCases';
import {AdminCourseUseCases} from '../../src/courses/use-cases/AdminCourseUseCases';
import {PublicCourseUseCases} from '../../src/courses/use-cases/PublicCourseUseCases';
import {PublicScholarshipUseCases} from '../../src/scholarships/use-cases/PublicScholarshipUseCases';
import {CoursePublicationService} from '../../src/courses/services/CoursePublicationService';
import {LocalizedInternationalTestPublicUseCases} from '../../src/tests-platform/use-cases/LocalizedInternationalTestPublicUseCases';
import {publicInternationalTest} from '@manaratak/domain';
const input={locale:'en' as const,displayName:'Reviewed title',description:'Reviewed description'};
const owner=()=>({id:'owner',publicId:'exact-id',displayName:'Source title',canonicalName:'Canonical source',description:'Source description',version:1,revision:1,status:'DRAFT',completenessStatus:'COMPLETE',originType:'NATIVE_MANARATAK_COURSE',optionalFields:{description:'Source description'}});
beforeEach(()=>{policy.enabled=true;});
describe('B11 native owner description pairs',()=>{
 it('does not activate content writes while implementing the source contract',()=>{policy.enabled=false;expect(()=>prepareOwnerDescription('COURSE',owner(),input)).toThrow('CONTENT_AUTHORING_DISABLED');});
 for(const kind of ['COURSE','SCHOLARSHIP','INTERNATIONAL_TEST'] as const) {
  it(`${kind}: retains one exact owner/checkpoint for both fields, without fabricating missing text`,()=>{
   const source:any=owner();source.optionalFields=prepareOwnerDescription(kind,source,input);
   expect(approvedOwnerDescriptions(kind,source).en).toEqual({displayName:input.displayName,description:input.description});
   expect(source.optionalFields.ownerLocalizedDescriptions.en).toMatchObject({ownerId:'owner',sourceRevision:'1',locale:'en'});
   expect(()=>prepareOwnerDescription(kind,source,{...input,description:' '})).toThrow('REQUIRED_FIELDS_MISSING');
   expect(approvedOwnerDescriptions(kind,{...source,id:'foreign'})).toEqual({});
  });
  it(`${kind}: a source edit or translated field edit requires review and prevents publication`,()=>{
   const source:any=owner();source.optionalFields=prepareOwnerDescription(kind,source,input);
   source.displayName='Changed source';expect(()=>assertOwnerDescriptionsCurrent(kind,source)).toThrow('SOURCE_CHANGED_REVIEW_REQUIRED');
   source.displayName='Source title';source.optionalFields.ownerLocalizedDescriptions.en.description='Unreviewed tamper';expect(()=>assertOwnerDescriptionsCurrent(kind,source)).toThrow('SOURCE_CHANGED_REVIEW_REQUIRED');
  });
  it(`${kind}: AR and EN remain separate in an immutable version copy, and explicit removal is local`,()=>{
   const source:any=owner();source.optionalFields=prepareOwnerDescription(kind,source,input);
   const pinned=structuredClone(source);
   source.optionalFields=prepareOwnerDescription(kind,source,{locale:'ar',displayName:'اسم معتمد',description:'وصف معتمد'});
   expect(approvedOwnerDescriptions(kind,source)).toHaveProperty('ar.displayName','اسم معتمد');expect(approvedOwnerDescriptions(kind,pinned)).not.toHaveProperty('ar');
   source.optionalFields=prepareOwnerDescription(kind,source,{locale:'en',remove:true});expect(approvedOwnerDescriptions(kind,source)).not.toHaveProperty('en');expect(approvedOwnerDescriptions(kind,pinned).en?.description).toBe(input.description);
  });
 }
 it('routes course edits through its owner port, rejects draft public reads and stale publication',async()=>{
  let row:any=owner();const repo:any={findById:async()=>row,findBySlug:async()=>row,update:vi.fn(async(_id,patch)=>row={...row,...patch,version:row.version+1})};
  await new AdminCourseUseCases(repo).saveLocalizedDescription('owner',input);
  const publicUC=new PublicCourseUseCases(repo);await expect(publicUC.getCourse('slug','en')).rejects.toThrow('not found');
  await new CoursePublicationService(repo).assertPublicationReady(row);row.status='PUBLISHED';
  expect(await publicUC.getCourse('slug','en')).toMatchObject({displayName:input.displayName,description:input.description});
  expect(JSON.stringify(await publicUC.getCourse('slug','en'))).not.toContain('sourceDigest');
  row.status='DRAFT';row.optionalFields.description='Changed original';await expect(new CoursePublicationService(repo).assertPublicationReady(row)).rejects.toThrow('SOURCE_CHANGED_REVIEW_REQUIRED');
 });
 it('rejects injecting a pair through the ordinary course JSON update',async()=>{const row:any=owner();const repo:any={findById:async()=>row,update:vi.fn()};await expect(new AdminCourseUseCases(repo).updateCourse('owner',{optionalFields:{ownerLocalizedDescriptions:{}}})).rejects.toThrow('COMMAND_REQUIRED');expect(repo.update).not.toHaveBeenCalled();});
 it('projects the scholarship pair via the existing public owner allowlist and strips evidence',async()=>{
  const row:any=owner();row.status='PUBLISHED';row.optionalFields=prepareOwnerDescription('SCHOLARSHIP',row,input);
  const repo:any={findPublishedBySlug:async()=>row};const result=await new PublicScholarshipUseCases(repo).getScholarship('slug','en');expect(result).toMatchObject({displayName:input.displayName,description:input.description});expect(JSON.stringify(result)).not.toMatch(/sourceDigest|sourceRevision|ownerLocalizedDescriptions/);
 });
 it('retains a sealed test pair through repeated public projection and switches title and description together',async()=>{
  const sealed:any={id:'owner',canonicalName:'Source',displayName:'Source',status:'PUBLISHED',description:'Original',localizedDescriptions:{en:{displayName:'Published',description:'Published description'},ar:{displayName:'اسم',description:' '}}};
  const repo:any={findPublishedBySlug:async()=>publicInternationalTest(sealed)};const uc=new LocalizedInternationalTestPublicUseCases(repo);
  expect(await uc.getPublishedBySlug('slug','en')).toMatchObject({displayName:'Published',description:'Published description'});expect(await uc.getPublishedBySlug('slug','ar')).toMatchObject({displayName:'Source',description:'Original'});
 });
});

describe('B11 native revision contracts',()=>{
 it('preserves the test owner zero revision contract without inventing a checkpoint',()=>{const current={...owner(),revision:0};expect(()=>prepareOwnerDescription('INTERNATIONAL_TEST',current,input)).not.toThrow();expect(()=>prepareOwnerDescription('COURSE',current,input)).toThrow('OWNER_REVISION_REQUIRED');});
 it('invalidates translated descriptions when other original source content changes',()=>{const current:any=owner();current.optionalFields=prepareOwnerDescription('COURSE',current,input);current.optionalFields.courseContent='Changed original course content';expect(()=>assertOwnerDescriptionsCurrent('COURSE',current)).toThrow('SOURCE_CHANGED_REVIEW_REQUIRED');});
});

describe('B11 native description commands retain owner transaction boundaries',()=>{
 it('uses scholarship revision locking and audited owner update, and refuses a published owner',async()=>{
  let row:any={...owner(),publicationStatus:'DRAFT'};
  const repo:any={findById:async()=>structuredClone(row),assertCurrentRevision:vi.fn(async(_id,revision)=>{if(revision!==row.revision)throw new Error('STALE_REVISION');}),update:vi.fn(async(_id,data)=>structuredClone(row={...row,...data,revision:row.revision+1}))};repo.withTransaction=vi.fn(()=>repo);
  const atomic:any={execute:vi.fn(async(_definition,run)=>run({boundaryId:'source-only'}))};const uc=new AdminScholarshipUseCases(repo,atomic);
  const saved=await uc.saveLocalizedDescription('owner',input,{actorId:'maker',reason:'Reviewed source',expectedRevision:1});
  expect(repo.assertCurrentRevision).toHaveBeenCalledWith('owner',1);expect(saved.optionalFields?.ownerLocalizedDescriptions).toHaveProperty('en.displayName','Reviewed title');expect(atomic.execute.mock.calls[0][0]).toMatchObject({domain:'SCHOLARSHIPS',action:'SCHOLARSHIP_DESCRIPTION_TRANSLATED'});
  row.publicationStatus='PUBLISHED';await expect(uc.saveLocalizedDescription('owner',input,{actorId:'maker',reason:'Edit',expectedRevision:2})).rejects.toThrow('NON_EDITABLE_STATUS');expect(repo.update).toHaveBeenCalledOnce();
 });
 it('keeps the prior test publication while translation edits invalidate the native approval and advance the locked revision',async()=>{
  let row:any={...owner(),status:'PUBLISHED',revision:0,currentPublishedVersionId:'published-version'};
  const repo:any={findById:async()=>structuredClone(row),getRevision:async()=>row.revision,acquireSourceReviewLock:vi.fn(),advanceRevision:vi.fn(async()=>{row.revision++;}),update:vi.fn(async(_id,data)=>structuredClone(row={...row,...data}))};repo.withTransaction=()=>repo;
  const atomic:any={execute:vi.fn(async(_definition,run)=>run({boundaryId:'source-only'}))};const uc=new InternationalTestAdminUseCases(repo,undefined,undefined,undefined,undefined,undefined,atomic);
  const result=await uc.saveLocalizedDescription('owner',input,{actorId:'maker',reason:'Reviewed source',expectedRevision:0});
  expect(repo.acquireSourceReviewLock).toHaveBeenCalledWith('owner');expect(repo.advanceRevision).toHaveBeenCalledWith('owner',0,false);expect(row).toMatchObject({status:'NEEDS_REVIEW',currentPublishedVersionId:'published-version',revision:1});expect(result.revision).toBe(1);expect(atomic.execute.mock.calls[0][0].action).toBe('INTERNATIONAL_TEST_DESCRIPTION_TRANSLATED');
 });
});

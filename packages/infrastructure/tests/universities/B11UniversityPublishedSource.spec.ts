import { describe, expect, it, vi } from 'vitest';
import { PrismaUniversityRepository } from '../../src/universities/PrismaUniversityRepository';
import { universityTranslationSourceDigest, universityTranslationValueDigest } from '../../src/universities/UniversityTranslationSourceEvidence';
import { ApplicationLocaleProjectionService } from '../../../application/src/localization/ApplicationLocaleProjectionService';

function fixture() {
  const owner: any = {id:'uni',publicId:'uni-exact',slug:'example',status:'PUBLISHED',
    displayName:'Source name',canonicalName:'Source name',optionalFields:{description:'Source description'},
    sourceRecords:[{id:'source',sourceLocale:'en',sourceHash:'hash'}],updatedAt:new Date('2026-10-15')};
  const translation: any = {id:'translation',locale:'ar',displayName:'اسم معتمد',description:'وصف معتمد',reviewStatus:'PUBLISHED'};
  translation.metadata = {publishedTranslationApprovalId:'persisted-approval',publishedTranslationEvidence:{
    ownerSourceDigest:universityTranslationSourceDigest(owner),valueDigest:universityTranslationValueDigest(translation),
  }};
  owner.translations = [translation];
  const db: any = {university:{findUnique:vi.fn(async()=>owner),findUniqueOrThrow:vi.fn(async()=>owner)}};
  const repo = new PrismaUniversityRepository(db);
  async function read(locale: 'ar' | 'en' = 'ar') {
    const dto = await repo.findById('uni');
    return new ApplicationLocaleProjectionService().projectUniversity(dto!,locale);
  }
  return {owner,translation,db,repo,read};
}
describe('B11 University owner evidence reaches the public reader',()=>{
  it('publishes the approved name and description together and drops private proof',async()=>{
    const f=fixture(); const result=await f.read();
    expect(result).toMatchObject({displayName:'اسم معتمد',description:'وصف معتمد'});
    expect(JSON.stringify(result)).not.toMatch(/persisted-approval|ownerSourceDigest|publicationSourceStatus|valueDigest/);
    expect((await f.read('en')).displayName).toBe('Source name');
  });
  it.each(['canonical','description','sourceHash','oneTranslatedField','locale','missingProof','draft'])('falls back as a pair for %s',async(change)=>{
    const f=fixture();
    if(change==='canonical') f.owner.displayName='Changed source';
    if(change==='description') f.owner.optionalFields.description='Changed source description';
    if(change==='sourceHash') f.owner.sourceRecords[0].sourceHash='changed';
    if(change==='oneTranslatedField') f.translation.description='Unreviewed edit';
    if(change==='locale') f.translation.locale='en';
    if(change==='missingProof') delete f.translation.metadata.publishedTranslationEvidence;
    if(change==='draft') f.translation.reviewStatus='NEEDS_REVIEW';
    const result=await f.read();
    expect(result.displayName).toBe(f.owner.displayName);
    expect(result.description).toBe(f.owner.optionalFields.description);
    expect(JSON.stringify(result)).not.toMatch(/اسم معتمد|وصف معتمد|Unreviewed edit/);
  });
  it('normalizes source query order without including unrelated ORM fields',()=>{
    const f=fixture(); const source=f.owner.sourceRecords[0];
    expect(universityTranslationSourceDigest({...f.owner,sourceRecords:[{sourceLocale:source.sourceLocale,sourceHash:source.sourceHash,id:source.id}]})).toBe(universityTranslationSourceDigest(f.owner));
  });
  it('reports stale source evidence to the owner review reader without rewriting history',async()=>{
    const f=fixture(); f.owner.displayName='Changed source';
    f.db.universityTranslation={findMany:vi.fn(async()=>[f.translation])};
    expect(await f.repo.listTranslations('uni')).toMatchObject([{reviewStatus:'PUBLISHED',publicationSourceStatus:'STALE'}]);
  });
  it('does not let ordinary authoring retain publication or supply forged proof',async()=>{
    const f=fixture(); f.db.universityTranslation={upsert:vi.fn(async({update}:any)=>({...f.translation,...update}))};
    const result=await f.repo.upsertTranslation('uni',{locale:'ar',description:'Draft',metadata:f.translation.metadata});
    expect(result.reviewStatus).toBe('NEEDS_REVIEW');
    expect(result.metadata).toEqual({});
    await expect(f.repo.upsertTranslation('uni',{locale:'ar',reviewStatus:'PUBLISHED'})).rejects.toThrow('OWNER_REVIEW_WORKFLOW_REQUIRED');
  });
  it.each([false,true])('applies the same freshness rule to university names in public program graphs (source changed: %s)',async(changed)=>{
    const f=fixture(); if(changed) f.owner.optionalFields.description='Changed source';
    f.db.universityAcademicProgram={findMany:vi.fn(async()=>[{id:'program',sourceProgramName:'Program',status:'ACTIVE',majorMappingState:'CANONICALLY_MAPPED',majorId:'major',degreeLevelId:'degree',major:{status:'PUBLISHED',levelProfiles:[{degreeLevelId:'degree',status:'PUBLISHED',currentPublishedVersionId:'v'}]},university:f.owner}])};
    const result=await f.repo.findPublishedAcademicProgramsByIds(['program']);
    expect(result).toHaveLength(1);
    expect(result[0].universityLocalizedNames).toEqual(changed ? {} : {ar:'اسم معتمد'});
  });
});

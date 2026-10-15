import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
type Client = PrismaClient | Prisma.TransactionClient;
export function majorTranslationDigest(value: unknown): string {
  const stable=(item:unknown):unknown=>Array.isArray(item)?item.map(stable):item&&typeof item==='object'?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b)).map(([key,child])=>[key,stable(child)])):item??null;
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
export async function majorTranslationSource(client: Client, majorId: string, profileId: string, versionId: string, locale: string, sectionKey?: string) {
  const [major, profile, version, sections] = await Promise.all([
    client.major.findUnique({where:{id:majorId},select:{id:true,canonicalName:true,displayName:true,academicFieldId:true,disciplineId:true,optionalFields:true}}),
    client.majorLevelProfile.findUnique({where:{id:profileId},select:{id:true,majorId:true,degreeLevelId:true,academicFieldId:true,disciplineId:true,level:true,code:true,displayName:true}}),
    client.majorVersion.findUnique({where:{id:versionId},select:{id:true,majorId:true,profileId:true,sourceHash:true,sourceUri:true}}),
    sectionKey ? client.majorContentSection.findMany({where:{profileId,versionId,sectionKey,locale:{not:locale}},orderBy:{id:'asc'},select:{id:true,content:true,title:true,locale:true}}) : Promise.resolve([]),
  ]);
  if(!major || profile?.majorId!==majorId || version?.majorId!==majorId || version.profileId!==profileId) throw new Error('TRANSLATION_SECTION_PROFILE_VERSION_MISMATCH');
  const optional=major.optionalFields && typeof major.optionalFields==='object' && !Array.isArray(major.optionalFields) ? major.optionalFields : {};
  const root={id:major.id,canonicalName:major.canonicalName,displayName:major.displayName,academicFieldId:major.academicFieldId,disciplineId:major.disciplineId,optionalFields:Object.fromEntries(Object.entries(optional).filter(([key])=>!['translationNameCandidates','translationDescriptionCandidates','localizedNames'].includes(key)))};
  return majorTranslationDigest({root,profile:Object.fromEntries(['id','majorId','degreeLevelId','academicFieldId','disciplineId','level','code','displayName'].map(key=>[key,(profile as unknown as Record<string,unknown>)[key]])),version:{id:version.id,majorId:version.majorId,profileId:version.profileId,sourceHash:version.sourceHash,sourceUri:version.sourceUri},sectionKey:sectionKey??null,sections:sections.map(section=>({id:section.id,content:section.content,title:section.title,locale:section.locale}))});
}
export async function assertMajorTranslationWorkingVersion(client: Client, majorId: string, profileId: string, versionId: string) {
  const version=await client.majorVersion.findUnique({where:{id:versionId},include:{profile:true}});
  if(!version || version.majorId!==majorId || version.profileId!==profileId || version.profile?.majorId!==majorId) throw new Error('TRANSLATION_SECTION_PROFILE_VERSION_MISMATCH');
  if(version.publishedAt || ['PUBLISHED','SUPERSEDED','ARCHIVED'].includes(version.status) || ['PUBLISHED','ARCHIVED','REJECTED'].includes(version.profile.status)) throw new Error('TRANSLATION_OWNER_WORKING_VERSION_REQUIRED');
  const latest=await client.majorVersion.findFirst({where:{majorId,profileId},orderBy:{versionNumber:'desc'},select:{id:true}});
  if(latest?.id!==versionId) throw new Error('TRANSLATION_OWNER_WORKING_VERSION_REQUIRED');
  return version;
}
export function translationRecord(value: unknown): Record<string, any> {
  return value && typeof value==='object' && !Array.isArray(value) ? value as Record<string, any> : {};
}
/** Runs inside the existing owner review/publication transaction, never mutates a snapshot. */
export async function validateMajorVersionTranslations(client: Client, majorId: string, profileId: string, versionId: string, metadata: unknown, sections: readonly {id:string;sectionKey:string;locale:string|null;content:string;metadata:unknown}[]) {
  const names=translationRecord(translationRecord(metadata).translationNames);
  const result: {localizedNameAr?:string;localizedNameEn?:string}={};
  for(const [locale,raw] of Object.entries(names)) {
    const name=translationRecord(raw);
    if(!['ar','en'].includes(locale) || typeof name.value!=='string' || !name.value.trim() || !name.publicationApprovalId || name.valueDigest!==majorTranslationDigest([locale,name.value]) || name.ownerSourceDigest!==await majorTranslationSource(client,majorId,profileId,versionId,locale)) throw new Error('TRANSLATION_SOURCE_CHANGED_REVIEW_REQUIRED');
    result[locale==='ar'?'localizedNameAr':'localizedNameEn']=name.value;
  }
  for(const section of sections) {
    const proof=translationRecord(translationRecord(section.metadata).ownerTranslation);
    if(!Object.keys(proof).length) continue; // Native sections use the existing owner review coverage.
    if(!section.locale || proof.valueDigest!==majorTranslationDigest([section.locale,section.content]) || !proof.publicationApprovalId || proof.ownerSourceDigest!==await majorTranslationSource(client,majorId,profileId,versionId,section.locale,section.sectionKey)) throw new Error('TRANSLATION_SOURCE_CHANGED_REVIEW_REQUIRED');
  }
  return result;
}

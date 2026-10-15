import {createHash} from 'node:crypto';
import {assertTranslationContentAuthoringEnabled} from '@manaratak/shared';
export type DescriptionOwner = 'INTERNATIONAL_TEST' | 'SCHOLARSHIP' | 'COURSE';
export interface OwnerDescriptionEvidence {ownerId:string;sourceRevision:string;sourceDigest:string;valueDigest:string;locale:'ar'|'en';displayName:string;description:string}
export interface OwnerDescriptionInput {locale:'ar'|'en'; displayName?:string; description?:string; remove?:boolean}
type RecordValue = Record<string, any>;
const record=(value:unknown):RecordValue=>value && typeof value==='object' && !Array.isArray(value) ? value as RecordValue : {};
const stable=(value:unknown):unknown=>value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.map(stable) : value && typeof value==='object' ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])) : value??null;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
export function ownerDescriptionSource(kind:DescriptionOwner,owner:RecordValue) {
  const optional=record(owner.optionalFields);
  const description=kind==='SCHOLARSHIP' ? owner.description ?? optional.description ?? owner.coverageDetails ?? '' : optional.description ?? optional.overview ?? optional.courseContent ?? '';
  const fields=kind==='INTERNATIONAL_TEST' ? ['testCategory','providerId','providerName','registrationRequirements','identificationRequirements','retakePolicy','cancellationReschedulingNotes','accessibilityNotes'] : kind==='SCHOLARSHIP' ? ['providerName','academicYear','cycleName','coverageDetails','fundingCoverage','eligibilityCriteria','applicationDeadline','applicationMethod','applicationUrl','countryReferenceId','studyLanguageReferenceId'] : ['originType','providerName','platformName','directCourseUrl','learningLanguageReferenceId','shortCourseTopicsRaw'];
  return {kind,ownerId:owner.id,publicId:owner.publicId,canonicalName:owner.canonicalName,displayName:owner.displayName,description,
    sourceUrl:owner.sourceUrl??null,officialSourceUrl:owner.officialSourceUrl??null,sourceImportRecordId:owner.sourceImportRecordId??null,
    fields:Object.fromEntries(fields.map(key=>[key,owner[key]??optional[key]??null])),
    optionalSource:Object.fromEntries(Object.entries(optional).filter(([key])=>!['ownerLocalizedDescriptions','localizedNames','titleEn','metadata'].includes(key)))};
}
export function prepareOwnerDescription(kind:DescriptionOwner,owner:RecordValue,input:OwnerDescriptionInput):RecordValue {
  assertTranslationContentAuthoringEnabled(kind);
  if(!['ar','en'].includes(input.locale)) throw new Error('TRANSLATION_LOCALE_UNSUPPORTED');
  const optional={...record(owner.optionalFields)};
  const pairs={...record(optional.ownerLocalizedDescriptions)};
  if(input.remove) delete pairs[input.locale];
  else {
    if(typeof input.displayName!=='string' || !input.displayName.trim() || typeof input.description!=='string' || !input.description.trim()) throw new Error('TRANSLATION_OWNER_REQUIRED_FIELDS_MISSING');
    const revision=owner.revision??owner.version;
    if(typeof owner.id!=='string'||!owner.id||!Number.isSafeInteger(revision)||revision<(kind==='INTERNATIONAL_TEST'?0:1)) throw new Error('TRANSLATION_OWNER_REVISION_REQUIRED');
    const source=ownerDescriptionSource(kind,owner);
    pairs[input.locale]={ownerId:owner.id,sourceRevision:String(revision),
      sourceDigest:hash(source),locale:input.locale,displayName:input.displayName.trim(),description:input.description.trim(),valueDigest:hash([input.locale,input.displayName.trim(),input.description.trim()])};
  }
  return {...optional,ownerLocalizedDescriptions:pairs};
}
export function assertNoForgedOwnerDescriptions(optional:unknown):void {
  if(record(optional).ownerLocalizedDescriptions!==undefined) throw new Error('TRANSLATION_OWNER_DESCRIPTION_COMMAND_REQUIRED');
}
/** Data has no independent publication status: the owner's review and published version are authoritative. */
export function approvedOwnerDescriptions(kind:DescriptionOwner,owner:RecordValue):Partial<Record<'ar'|'en',{displayName:string;description:string}>> {
  const result:Partial<Record<'ar'|'en',{displayName:string;description:string}>>={};
  const sourceDigest=hash(ownerDescriptionSource(kind,owner));
  for(const [locale,raw] of Object.entries(record(record(owner.optionalFields).ownerLocalizedDescriptions))) {
    const pair=record(raw);
    if((locale==='ar'||locale==='en') && pair.locale===locale && pair.ownerId===owner.id && typeof pair.sourceRevision==='string' && pair.sourceRevision && pair.sourceDigest===sourceDigest && pair.valueDigest===hash([locale,pair.displayName,pair.description]) && typeof pair.displayName==='string' && pair.displayName.trim() && typeof pair.description==='string' && pair.description.trim()) result[locale]={displayName:pair.displayName,description:pair.description};
  }
  return result;
}
export function assertOwnerDescriptionsCurrent(kind:DescriptionOwner,owner:RecordValue):void {
  const raw=record(record(owner.optionalFields).ownerLocalizedDescriptions);
  if(Object.keys(raw).length!==Object.keys(approvedOwnerDescriptions(kind,owner)).length) throw new Error('TRANSLATION_SOURCE_CHANGED_REVIEW_REQUIRED');
}

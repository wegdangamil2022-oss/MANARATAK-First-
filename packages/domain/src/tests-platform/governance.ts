import { InternationalTestDto } from './contracts';
import { InternationalTestStatus } from './enums';

export function assertInternationalTestTransition(from: InternationalTestStatus, to: InternationalTestStatus): void {
  const transitions: Record<InternationalTestStatus, InternationalTestStatus[]> = {
    IMPORTED: [InternationalTestStatus.NEEDS_REVIEW, InternationalTestStatus.READY_TO_REVIEW, InternationalTestStatus.ARCHIVED],
    READY_TO_REVIEW: [InternationalTestStatus.NEEDS_REVIEW, InternationalTestStatus.READY_TO_PUBLISH, InternationalTestStatus.REJECTED, InternationalTestStatus.ARCHIVED],
    NEEDS_REVIEW: [InternationalTestStatus.READY_TO_REVIEW, InternationalTestStatus.READY_TO_PUBLISH, InternationalTestStatus.REJECTED, InternationalTestStatus.ARCHIVED],
    READY_TO_PUBLISH: [InternationalTestStatus.PUBLISHED, InternationalTestStatus.NEEDS_REVIEW, InternationalTestStatus.REJECTED, InternationalTestStatus.ARCHIVED],
    PUBLISHED: [InternationalTestStatus.NEEDS_REVIEW, InternationalTestStatus.READY_TO_PUBLISH, InternationalTestStatus.ARCHIVED],
    REJECTED: [InternationalTestStatus.NEEDS_REVIEW, InternationalTestStatus.ARCHIVED], ARCHIVED: [],
  };
  if (!transitions[from]?.includes(to)) throw new Error('INTERNATIONAL_TEST_INVALID_TRANSITION');
}

/** Recursive explicit projection: newly added administrative columns stay private. */
export function publicInternationalTest(test: InternationalTestDto): InternationalTestDto {
  const pick = (source: object, keys: string[]) => Object.fromEntries(keys.filter(k => (source as Record<string, unknown>)[k] !== undefined).map(k => [k, (source as Record<string, unknown>)[k]]));
  const result = pick(test, ['id','publicId','slug','canonicalName','displayName','localizedNameAr','localizedNameEn','abbreviation','testCode','testCategory','providerName','providerId','status','currentPublishedVersionId','registrationRequirements','identificationRequirements','retakePolicy','cancellationReschedulingNotes','accessibilityNotes']) as unknown as InternationalTestDto;
  result.isPubliclyVisible = true; result.isSourceVerified = true;
  const arrays: Record<string,string[]> = {
    variants: ['id','variantName','deliveryMode','isActive','specificOfficialUrl'], sections: ['id','sectionName','sectionType','durationMinutes','order','questionTypes','scoreMinimum','scoreMaximum'],
    fees: ['id','feeType','amount','currencyCode','currencyReferenceId','hasRegionalVariation','validityWindowNotes'], officialLinks: ['id','linkType','url','description'],
    preparationMaterials: ['id','materialType','url','title','description'], countryRelationships: ['id','canonicalReferenceId','referenceCode','relationshipType'], languageRelationships: ['id','canonicalReferenceId','referenceCode','relationshipType'],
    academicTaxonomyRelationships: ['id','taxonomyNodeId','relationshipType'], degreeRelationships: ['degreeLevelId','canonicalCode','relationshipType'],
    sessions: ['id','title','registrationOpensAt','registrationClosesAt','startsAt','endsAt','timezone','status'], centers: ['id','displayName','countryIso2Code','cityName','address','officialUrl','status'],
    requirements: ['id','requirementType','title','description','isMandatory'], policies: ['id','policyType','title','description','sourceUrl','effectiveFrom','effectiveTo'],
    equivalencyMappings: ['id','sourceScale','sourceValue','targetScale','targetValue','confidence'],
  };
  for (const [key,keys] of Object.entries(arrays)) if (Array.isArray(test[key])) result[key] = (test[key] as object[]).map(item => pick(item,keys));
  const locations=test.locations as {countries?:object[];cities?:object[]}|undefined;
  if(locations)result.locations={countries:locations.countries?.map(item=>pick(item,['id','name','nameAr','iso2Code'])),cities:locations.cities?.map(item=>pick(item,['id','name','nameAr','countryIso2Code']))};
  if (test.scoreScale) result.scoreScale = pick(test.scoreScale,['id','overallMinimum','overallMaximum','scoreIncrement','bandsOrLevels','passFailRules','cefrEquivalency','crossTestEquivalency','resultValidityDurationMonths','resultDeliveryTimeDays','scoreReportingUrl']) as unknown as NonNullable<InternationalTestDto['scoreScale']>;
  if (test.availability) result.availability = pick(test.availability,['id','availableCountryIds','availableCityIds','onlineAvailabilityRegions','testingWindowsNotes']) as unknown as NonNullable<InternationalTestDto['availability']>;
  return result;
}
export function assertOfficialTestUrl(value: string, providerWebsite: string | undefined): void {
  try {
    const url = new URL(value); const official = new URL(providerWebsite ?? '');
    if (url.protocol !== 'https:' || official.protocol !== 'https:' || url.username || url.password || url.origin !== official.origin) throw new Error();
  } catch { throw new Error('INTERNATIONAL_TEST_UNTRUSTED_OFFICIAL_URL'); }
}

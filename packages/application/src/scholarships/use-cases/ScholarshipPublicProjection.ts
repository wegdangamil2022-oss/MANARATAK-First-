import { isPublicScholarshipUniversityLink } from '@manaratak/domain';
import type { PublicScholarshipDto, ScholarshipDto } from '@manaratak/domain';

/** Public scholarship shape: explicit allowlist, never a spread of the mutable owner record. */
export function projectPublishedScholarship(source: ScholarshipDto, displayName: string): PublicScholarshipDto {
  const resolved = (s: unknown) => String(s ?? '').toUpperCase() === 'RESOLVED';
  const httpsUrl = (s: unknown) => (typeof s === 'string' && /^https:\/\//i.test(s) ? s : null);
  const majorPublished = (value: unknown) => {
    const major = (value as { major?: { status?: string } })?.major;
    return major?.status === 'PUBLISHED';
  };
  const institutionPublished = (value: unknown) => isPublicScholarshipUniversityLink(value as Parameters<typeof isPublicScholarshipUniversityLink>[0]);
  const testPublished = (value: unknown) => {
    const test = (value as { internationalTest?: { id?: string; status?: string; isPubliclyVisible?: boolean; currentPublishedVersionId?: string; currentPublishedVersion?: {id: string; testId: string; status: string} } })?.internationalTest;
    const version = test?.currentPublishedVersion;
    return test?.status === 'PUBLISHED' && test.isPubliclyVisible === true && Boolean(version) &&
      version?.status === 'PUBLISHED' && version.id === test.currentPublishedVersionId && version.testId === test.id;
  };
  const country = (value:unknown) => (value as {country?:{id:string;name:string;nameAr?:string|null;isActive:boolean;lifecycleState:string}}).country;
  return {
    publicId: source.publicId, slug: source.slug, canonicalName: source.canonicalName,
    displayName, providerName: source.providerName,
    fundedProgramPairs: (source.fundedProgramPairs ?? []).map(pair => ({
      linkKey: pair.linkKey, universityId: pair.universityId, academicProgramId: pair.academicProgramId,
      degreeLevelId: pair.degreeLevelId, majorId: pair.majorId, programName: pair.programName,
      degreeLabel: pair.degreeLabel, majorLabel: pair.majorLabel,
      studyLanguages:(pair.studyLanguages??[]).map(language=>({id:language.id,name:language.name})),
    })),
    academicYear: source.academicYear, cycleName: source.cycleName,
    countryReferenceId: source.countryReferenceId, countrySourceLabel: source.countrySourceLabel,studyCountryLabel:source.studyCountryLabel,
    countryScope: source.countryScope, studyLanguageReferenceId: source.studyLanguageReferenceId,
    studyLanguageSourceLabel: source.studyLanguageSourceLabel, studyCountry: source.studyCountry,
    studyLanguage: source.studyLanguage, degreeLevel: source.degreeLevel,
    applicationDeadline: source.applicationDeadline, deadlineType: source.deadlineType,
    applicationMethod: source.applicationMethod, applicationUrl: httpsUrl(source.applicationUrl),
    officialSourceUrl: httpsUrl(source.officialSourceUrl), fundingTypeCode: source.fundingTypeCode,
    isFullyFunded: source.isFullyFunded, amountMinorUnits: source.amountMinorUnits,
    amountCurrencyCode: source.amountCurrencyCode, fundingCoverage: source.fundingCoverage,
    coverageDetails: source.coverageDetails, duration: source.duration, currency: source.currency,
    benefits: (source.benefits ?? []).map((b) => ({
      benefitKey:b.benefitKey,benefitTypeCode:b.benefitTypeCode,coverageTypeCode:b.coverageTypeCode,
      amount:b.amount,currencyReferenceId:b.currencyReferenceId,valueText:b.valueText,
      durationText:b.durationText,frequencyCode:b.frequencyCode,isCovered:b.isCovered,isOptional:b.isOptional,
      displayOrder:b.displayOrder,
    })),
    degreeTargets: (source.degreeTargets ?? []).filter((d) => d.degreeLevelId && resolved(d.resolutionStatus))
      .map((d) => ({targetKey:d.targetKey,degreeLevelId:d.degreeLevelId,sourceLabel:d.sourceLabel,resolutionStatus:'RESOLVED'})),
    majorTargets: (source.majorTargets ?? []).filter((m) => m.majorId && resolved(m.resolutionStatus) && majorPublished(m))
      .map((m) => ({targetKey:m.targetKey,majorId:m.majorId,sourceLabel:m.sourceLabel,resolutionStatus:'RESOLVED'})),
    eligibilityItems: (source.eligibilityItems ?? []).filter(
        (e) =>
      (resolved(e.resolutionStatus) || ![e.countryReferenceId,e.degreeLevelId,e.majorId,e.internationalTestId].some(Boolean)) &&
      (!e.majorId || majorPublished(e)) &&
          (!e.internationalTestId || testPublished(e)),
      )
      .map((e) => ({itemKey:e.itemKey,itemTypeCode:e.itemTypeCode,operatorCode:e.operatorCode,
        countryLabel:country(e)?.isActive && country(e)?.lifecycleState==='ACTIVE' ? country(e)?.nameAr || country(e)?.name : undefined,
        valueText:e.valueText,minimumValue:e.minimumValue,maximumValue:e.maximumValue,
        countryReferenceId:e.countryReferenceId,degreeLevelId:e.degreeLevelId,
        majorId:e.majorId,internationalTestId:e.internationalTestId,
        isRequired:e.isRequired,priorityOrder:e.priorityOrder})),
    requiredDocumentItems: (source.requiredDocumentItems ?? []).filter((d) => !d.internationalTestId || (resolved(d.resolutionStatus) && testPublished(d)))
      .map((d) => ({documentKey:d.documentKey,documentTypeCode:d.documentTypeCode,
        displayName:d.displayName,description:d.description,internationalTestId:d.internationalTestId,
        isRequired:d.isRequired,displayOrder:d.displayOrder})),
    universityLinks: (source.universityLinks ?? []).filter(
        (u) => resolved(u.resolutionStatus) &&
          (u.universityId || u.academicProgramId) && institutionPublished(u))
      .map((u) => ({linkKey:u.linkKey,universityId:u.universityId ??
          (u as unknown as { academicProgram?: { universityId?: string } }).academicProgram
            ?.universityId,academicProgramId:u.academicProgramId,
        relationshipTypeCode:u.relationshipTypeCode,resolutionStatus:'RESOLVED'})),
  } as PublicScholarshipDto;
}

import type { PublicScholarshipDto, ScholarshipDto } from '@manaratak/domain';

/** Public scholarship shape: explicit allowlist, never a spread of the mutable owner record. */
export function projectPublishedScholarship(source: ScholarshipDto, displayName: string, localizedNames: Record<string, string>): PublicScholarshipDto {
  const resolved = (s: unknown) => String(s ?? '').toUpperCase() === 'RESOLVED';
  const httpsUrl = (s: unknown) => typeof s === 'string' && /^https:\/\//i.test(s) ? s : null;
  return {
    publicId: source.publicId, slug: source.slug, canonicalName: source.canonicalName,
    displayName, localizedNames, providerName: source.providerName,
    academicYear: source.academicYear, cycleName: source.cycleName,
    countryReferenceId: source.countryReferenceId, countrySourceLabel: source.countrySourceLabel,
    countryScope: source.countryScope, studyLanguageReferenceId: source.studyLanguageReferenceId,
    studyLanguageSourceLabel: source.studyLanguageSourceLabel, studyCountry: source.studyCountry,
    studyLanguage: source.studyLanguage, degreeLevel: source.degreeLevel,
    applicationDeadline: source.applicationDeadline, deadlineType: source.deadlineType,
    applicationMethod: source.applicationMethod, applicationUrl: httpsUrl(source.applicationUrl),
    officialSourceUrl: httpsUrl(source.officialSourceUrl), fundingTypeCode: source.fundingTypeCode,
    isFullyFunded: source.isFullyFunded, amountMinorUnits: source.amountMinorUnits,
    amountCurrencyCode: source.amountCurrencyCode, fundingCoverage: source.fundingCoverage,
    coverageDetails: source.coverageDetails, duration: source.duration, currency: source.currency,
    benefits: (source.benefits ?? []).map(b => ({
      benefitKey:b.benefitKey,benefitTypeCode:b.benefitTypeCode,coverageTypeCode:b.coverageTypeCode,
      amount:b.amount,currencyReferenceId:b.currencyReferenceId,valueText:b.valueText,
      durationText:b.durationText,frequencyCode:b.frequencyCode,isCovered:b.isCovered,isOptional:b.isOptional,
      displayOrder:b.displayOrder,
    })),
    degreeTargets: (source.degreeTargets ?? []).filter(d => d.degreeLevelId && resolved(d.resolutionStatus))
      .map(d => ({targetKey:d.targetKey,degreeLevelId:d.degreeLevelId,sourceLabel:d.sourceLabel,resolutionStatus:'RESOLVED'})),
    majorTargets: (source.majorTargets ?? []).filter(m => m.majorId && resolved(m.resolutionStatus))
      .map(m => ({targetKey:m.targetKey,majorId:m.majorId,sourceLabel:m.sourceLabel,resolutionStatus:'RESOLVED'})),
    eligibilityItems: (source.eligibilityItems ?? []).filter(e =>
      resolved(e.resolutionStatus) || ![e.countryReferenceId,e.degreeLevelId,e.majorId,e.internationalTestId].some(Boolean))
      .map(e => ({itemKey:e.itemKey,itemTypeCode:e.itemTypeCode,operatorCode:e.operatorCode,
        valueText:e.valueText,minimumValue:e.minimumValue,maximumValue:e.maximumValue,
        countryReferenceId:e.countryReferenceId,degreeLevelId:e.degreeLevelId,
        majorId:e.majorId,internationalTestId:e.internationalTestId,
        isRequired:e.isRequired,priorityOrder:e.priorityOrder})),
    requiredDocumentItems: (source.requiredDocumentItems ?? []).filter(d => !d.internationalTestId || resolved(d.resolutionStatus))
      .map(d => ({documentKey:d.documentKey,documentTypeCode:d.documentTypeCode,
        displayName:d.displayName,description:d.description,internationalTestId:d.internationalTestId,
        isRequired:d.isRequired,displayOrder:d.displayOrder})),
    universityLinks: (source.universityLinks ?? []).filter(u => resolved(u.resolutionStatus) && u.universityId)
      .map(u => ({linkKey:u.linkKey,universityId:u.universityId,academicProgramId:u.academicProgramId,
        relationshipTypeCode:u.relationshipTypeCode,resolutionStatus:'RESOLVED'})),
  } as PublicScholarshipDto;
}

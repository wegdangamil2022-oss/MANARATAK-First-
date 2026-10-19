import { isPublicAdmissionRequirement, isPublicUniversityProgram } from '@absheer/domain';
import type { PublicUniversityDto, UniversityDto } from '@absheer/domain';

type PublicRow = Record<string, unknown>;
const record = (value: unknown): PublicRow =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as PublicRow) : {};

/**
 * Public Phase-11 projection. This is a strict allowlist, not a redaction of
 * Prisma/owner DTOs; new private fields never become public by default.
 */
function fields(source: unknown, allowed: readonly string[]): PublicRow {
  const row = record(source);
  return Object.fromEntries(allowed.filter((key) => key in row).map((key) => [key, row[key]]));
}

function activeRows(value: unknown, keys: readonly string[]): PublicRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => record(row).status === undefined || record(row).status === 'ACTIVE')
    .map((row) => fields(row, keys));
}

const webUrl=(value:unknown)=>{if(typeof value!=='string')return undefined;try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.toString():undefined;}catch{return undefined;}};
const campusKeys = ['id', 'name', 'campusType', 'address', 'countryReferenceId', 'regionReferenceId',
  'cityReferenceId', 'latitude', 'longitude'] as const;
const unitKeys = ['id', 'campusId', 'parentOrganizationUnitId', 'unitType', 'name'] as const;
const tuitionKeys = ['id', 'profileType', 'organizationUnitName', 'amount', 'currencyCode',
  'effectiveFrom', 'effectiveTo', 'officialSourceUrl'] as const;
const accommodationKeys = ['id', 'accommodationAvailable', 'internationalEligible', 'typicalCost',
  'currencyCode', 'averageMonthlyLivingCost', 'livingCostCurrencyCode', 'costVariationNote'] as const;
const rankingKeys = ['id', 'provider', 'rankingYear', 'rank', 'scope', 'scopeLabel', 'note',
  'officialSourceUrl', 'verifiedAt'] as const;
const requirementKeys = ['internationalTestId', 'minimumScore', 'sectionScores',
  'validityMetadata', 'restrictionMetadata'] as const;

export function projectPublicUniversity(university: UniversityDto): PublicUniversityDto {
  const optional = record(university.optionalFields);
  const vettedOptional = fields(optional, [
    'generalRequiredDocuments', 'additionalGraduateRequirements', 'officialRequiredDocumentsUrl',
    'internationalAdmissions', 'availableDegrees', 'studyModes', 'tuitionReferences',
  ]);
  for(const key of ['generalRequiredDocuments','additionalGraduateRequirements','availableDegrees','studyModes','tuitionReferences'])
    if(Array.isArray(vettedOptional[key]))vettedOptional[key]=(vettedOptional[key] as unknown[]).filter(value=>typeof value==='string').slice(0,100);
  if(vettedOptional.internationalAdmissions){const allowed=fields(vettedOptional.internationalAdmissions,
    ['acceptsInternationalStudents','hasLanguageRequirements','minimumGpa','minimumAge','maximumAge','applicationDeadline','applicationOpen','requiredDocuments','applicationMethod']);
    vettedOptional.internationalAdmissions=Object.fromEntries(Object.entries(allowed).flatMap(([key,value])=>
      ['string','number','boolean'].includes(typeof value)?[[key,value]]:Array.isArray(value)?[[key,value.filter(item=>typeof item==='string').slice(0,100)]]:[]));}
  vettedOptional.officialRequiredDocumentsUrl=webUrl(vettedOptional.officialRequiredDocumentsUrl);
  const safeTranslations = (university.translations ?? [])
    .filter((item) => item.reviewStatus === 'PUBLISHED' && item.displayName)
    .map((item) => [item.locale, item.displayName as string] as const);
  const programs = (university.academicPrograms ?? [])
    .filter(isPublicUniversityProgram)
    .map((program) => ({
      id: program.id,
      sourceProgramName: program.sourceProgramName,
      organizationUnitId: program.organizationUnitId,
      degreeLevelId: program.degreeLevelId,
      degreeLevel: fields(program.degreeLevel, ['canonicalCode', 'nameAr', 'nameEn']),
      majorId: program.majorId,
      majorMappingState: program.majorMappingState,
      campusIds: [...(program.campusIds ?? [])],
      admissionRequirements: (program.admissionRequirements ?? [])
        .filter(isPublicAdmissionRequirement)
        .map((req) => ({
          ...fields(req, requirementKeys),
          internationalTest: fields(req.internationalTest, ['slug', 'displayName', 'canonicalName']),
        })),
    }));
  // No lifecycle/reviewer/source/hash IDs, draft translations, metadata, JSON raw blocks,
  // import evidence, or future unforeseen owner fields can cross this boundary.
  return {
    ...vettedOptional,
    ...fields(university, [
      'publicId', 'slug', 'canonicalName', 'displayName', 'country', 'city', 'institutionType',
      'officialWebsite', 'officialSourceUrl', 'logoAssetId', 'foundedYear', 'countryReferenceId',
      'regionReferenceId', 'cityReferenceId', 'institutionalOwnership', 'description',
      'contactEmail', 'contactPhone', 'socialLinks', 'languagesOfInstruction',
    ]),
    officialWebsite:webUrl(university.officialWebsite),officialSourceUrl:webUrl(university.officialSourceUrl),
    socialLinks:Object.fromEntries(Object.entries(record(university.socialLinks)).flatMap(([key,value])=>{const url=webUrl(value);return url?[[key,url]]:[];})),
    localizedNames: Object.fromEntries(safeTranslations),
    campuses: activeRows(university.campuses, campusKeys),
    organizationUnits: activeRows(university.organizationUnits, unitKeys),
    academicPrograms: programs,
    tuitionProfiles: activeRows(university.tuitionProfiles, tuitionKeys),
    accommodationProfiles: activeRows(university.accommodationProfiles, accommodationKeys),
    rankings: activeRows(university.rankings, rankingKeys),
    // Legacy unjoined rows have no owner publication proof and remain internal.
    admissionRequirements: [],
    accreditations: (university.accreditations ?? [])
      .filter((item) => record(item).reviewStatus === 'APPROVED')
      .map((item) => fields(item, ['name', 'organization', 'officialUrl', 'note', 'validFrom', 'validUntil'])),
  } as unknown as PublicUniversityDto;
}

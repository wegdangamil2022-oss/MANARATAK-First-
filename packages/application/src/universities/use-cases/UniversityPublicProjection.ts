import type { PublicUniversityDto, UniversityDto } from '@manaratak/domain';

type PublicRow = Record<string, unknown>;
const record = (value: unknown): PublicRow =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as PublicRow : {};

/**
 * Public Phase-11 projection. This is a strict allowlist, not a redaction of
 * Prisma/owner DTOs; new private fields never become public by default.
 */
function fields(source: unknown, allowed: readonly string[]): PublicRow {
  const row = record(source);
  return Object.fromEntries(allowed.filter(key => key in row).map(key => [key, row[key]]));
}

function activeRows(value: unknown, keys: readonly string[]): PublicRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(row => record(row).status === undefined || record(row).status === 'ACTIVE')
    .map(row => fields(row, keys));
}

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
  const safeTranslations = (university.translations ?? [])
    .filter(item => item.reviewStatus === 'PUBLISHED' && item.displayName)
    .map(item => [item.locale, item.displayName as string] as const);
  const programs = (university.academicPrograms ?? [])
    .filter(program => program.status === 'ACTIVE' &&
      program.majorMappingState === 'CANONICALLY_MAPPED' && Boolean(program.majorId) &&
      record(program).major !== undefined &&
      record(record(program).major).status === 'PUBLISHED' &&
      (Array.isArray(record(record(program).major).levelProfiles) &&
        (record(record(program).major).levelProfiles as Array<{ degreeLevelId?: string; status?: string; currentPublishedVersionId?: string | null }>)
          .some(profile => profile.degreeLevelId === program.degreeLevelId &&
            profile.status === 'PUBLISHED' && Boolean(profile.currentPublishedVersionId))))
    .map(program => ({
      id: program.id,
      sourceProgramName: program.sourceProgramName,
      organizationUnitId: program.organizationUnitId,
      degreeLevelId: program.degreeLevelId,
      degreeLevel: fields(program.degreeLevel, ['canonicalCode', 'nameAr', 'nameEn']),
      majorId: program.majorId,
      majorMappingState: program.majorMappingState,
      campusIds: [...(program.campusIds ?? [])],
      admissionRequirements: (program.admissionRequirements ?? [])
        .filter(req => req.status === 'ACTIVE' && req.internationalTest?.status === 'PUBLISHED')
        .map(req => ({
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
    localizedNames: Object.fromEntries(safeTranslations),
    campuses: activeRows(university.campuses, campusKeys),
    organizationUnits: activeRows(university.organizationUnits, unitKeys),
    academicPrograms: programs,
    tuitionProfiles: activeRows(university.tuitionProfiles, tuitionKeys),
    accommodationProfiles: activeRows(university.accommodationProfiles, accommodationKeys),
    rankings: activeRows(university.rankings, rankingKeys),
    admissionRequirements: activeRows(university.admissionRequirements, requirementKeys),
    accreditations: (university.accreditations ?? [])
      .filter(item => record(item).reviewStatus === 'APPROVED')
      .map(item => fields(item, ['name', 'organization', 'officialUrl', 'note', 'validFrom', 'validUntil'])),
  } as unknown as PublicUniversityDto;
}

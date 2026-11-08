import assert from 'node:assert/strict';

export const stage2RootFields = {
  displayName: 'Official English Name',
  canonicalName: 'Official English Name',
  institutionType: 'Verified Institution Type',
  institutionalOwnership: 'Verified Ownership',
  officialWebsite: 'Official Website URL',
  officialSourceUrl: 'Primary Source URL',
  foundedYear: 'Founded Year',
};
export const stage2OptionalFields = {
  officialLocalName: 'Official Local Name',
  officialAbbreviation: 'Official Abbreviation',
  description: 'Short Description',
  mainCampusAddress: 'Main Campus Address',
  mapUrl: 'Map URL',
  contactPhone: 'Official Phone',
  officialSocialMediaUrl: 'Main Official Social Media URL',
  officialWebsiteStatus: 'Official Website Status',
  officialWebsiteSource: 'Official Website Source',
  governmentRegistryUrl: 'Government Registry URL',
  governmentAuthorityName: 'Government Authority Name',
  universitySystemUrl: 'University System URL',
  centralAdmissionsPortalUrl: 'Central Admissions Portal URL',
  trustedInternationalDirectoryUrl: 'Trusted International Directory URL',
  externalInstitutionId: 'External Institution ID',
  'internationalAdmissions.applicationPortalUrl': 'Official Application Portal URL',
};
export const sourceText = (value) => String(value ?? '').trim();
const blank = (value) =>
  !sourceText(value) ||
  /^(?:n\/?a|unknown|not available|not found|not verified|none|-)$/i.test(sourceText(value));
const http = (value) => {
  try {
    const url = new URL(sourceText(value));
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
};
export function planUniversityStage2Projection(
  raw,
  before,
  stage1,
  currentYear = new Date().getUTCFullYear(),
) {
  assert.equal(raw['University Reference ID'], before.publicId);
  const issues = [],
    rootKeys = [],
    optionalKeys = [];
  const ready = /^(?:ready for import|verified)$/i.test(sourceText(raw['Review Status']));
  const immutable = ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(before.status);
  if (!ready) issues.push('SOURCE_REVIEW_NOT_APPROVED');
  if (immutable) issues.push('OWNER_LIFECYCLE_PRESERVED');
  const sameCountry = raw['Country ISO3'] === stage1.raw.ISO3;
  if (!sameCountry) issues.push('SOURCE_COUNTRY_DIFFERS_FROM_STAGE1');
  const original = {
    displayName: sourceText(stage1.raw['Official English Name']),
    canonicalName: sourceText(stage1.raw['Official English Name']),
    institutionType: stage1.raw['Institution Type'] || null,
    institutionalOwnership: stage1.raw.Ownership || null,
    officialWebsite: stage1.officialWebsite,
    officialSourceUrl: stage1.officialSourceUrl,
    foundedYear: null,
  };
  for (const [key, column] of Object.entries(stage2RootFields)) {
    const value = sourceText(raw[column]);
    if (blank(value)) continue;
    if (
      key === 'foundedYear' &&
      (!/^\d{3,4}$/.test(value) || Number(value) < 800 || Number(value) > currentYear)
    ) {
      issues.push('SOURCE_FOUNDED_YEAR_NOT_VALID');
      continue;
    }
    if (['officialWebsite', 'officialSourceUrl'].includes(key) && !http(value)) {
      issues.push('SOURCE_URL_NOT_SAFE:' + column);
      continue;
    }
    const owned = !stage1.existingId && (before[key] ?? null) === (original[key] ?? null);
    const empty = before[key] === null || before[key] === '' || before[key] === undefined;
    if (!empty && !owned && before[key] !== (key === 'foundedYear' ? Number(value) : value))
      issues.push('MANUAL_VALUE_PRESERVED:' + key);
    if (
      ready &&
      sameCountry &&
      !immutable &&
      (empty || owned) &&
      before[key] !== (key === 'foundedYear' ? Number(value) : value)
    )
      rootKeys.push(key);
  }
  for (const [key, column] of Object.entries(stage2OptionalFields)) {
    const value = sourceText(raw[column]);
    if (blank(value)) continue;
    if (/URL|Source$/.test(column) && !http(value)) {
      issues.push('SOURCE_URL_NOT_SAFE:' + column);
      continue;
    }
    if (
      key.includes('.') &&
      before.optionalFields?.internationalAdmissions !== undefined &&
      (before.optionalFields.internationalAdmissions === null ||
        typeof before.optionalFields.internationalAdmissions !== 'object' ||
        Array.isArray(before.optionalFields.internationalAdmissions))
    ) {
      issues.push('MANUAL_VALUE_PRESERVED:internationalAdmissions');
      continue;
    }
    const previous = key.includes('.')
      ? before.optionalFields?.internationalAdmissions?.applicationPortalUrl
      : before.optionalFields?.[key];
    if (
      ready &&
      sameCountry &&
      !immutable &&
      (previous === undefined || previous === null || previous === '')
    )
      optionalKeys.push(key);
    else if (previous !== undefined && previous !== null && previous !== '' && previous !== value)
      issues.push('MANUAL_VALUE_PRESERVED:' + key);
  }
  return { rootKeys, optionalKeys, issues, sourceReady: ready, ownerImmutable: immutable };
}

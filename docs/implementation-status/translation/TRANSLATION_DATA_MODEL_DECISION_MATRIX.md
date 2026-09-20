# MANARATAK Translation Data Model Decision Matrix

**Status:** APPROVED FOR WP06 SOURCE PREPARATION

| Phase | Domain | Field / Area | Classification | Storage Strategy | WP06 Action |
|---|---|---|---|---|---|
| 7 | ReferenceCountry | id/iso2Code/iso3Code | IDENTITY_FIELD | KEEP_EXISTING | NONE |
| 7 | ReferenceCountry | name | SOURCE_NATIVE_FIELD | KEEP_EXISTING | PRESERVE_AS_CANONICAL_SOURCE_LABEL |
| 7 | ReferenceCountry | Arabic display name | LOCALIZED_FIELD | EXPLICIT_LOCALIZED_FIELDS | ADD nameAr String? |
| 7 | ReferenceCountry | officialName | SOURCE_NATIVE_FIELD | SOURCE_NATIVE_ONLY | NO_TRANSLATION_SCHEMA_IN_INITIAL_ROUND |
| 7 | AdministrativeRegion | name/nameAr/localName | LOCALIZED_FIELD | KEEP_EXISTING | NO_NEW_TRANSLATION_MODEL |
| 7 | ReferenceCity | name | SOURCE_NATIVE_FIELD | KEEP_EXISTING | PRESERVE |
| 7 | ReferenceCity | Arabic display name | LOCALIZED_FIELD | EXPLICIT_LOCALIZED_FIELDS | ADD nameAr String? |
| 7 | ReferenceLanguage | isoCode/direction | NON_TRANSLATABLE_STRUCTURED_VALUE | STRUCTURED_VALUE | NONE |
| 7 | ReferenceLanguage | name/nativeName | SOURCE_NATIVE_FIELD | KEEP_EXISTING | PRESERVE |
| 7 | ReferenceLanguage | Arabic display name | LOCALIZED_FIELD | EXPLICIT_LOCALIZED_FIELDS | ADD nameAr String? |
| 7 | ReferenceCurrency | isoCode/numericCode/symbol/minorUnit | NON_TRANSLATABLE_STRUCTURED_VALUE | STRUCTURED_VALUE | NONE |
| 7 | ReferenceCurrency | name | SOURCE_NATIVE_FIELD | KEEP_EXISTING | PRESERVE |
| 7 | ReferenceCurrency | Arabic display name | LOCALIZED_FIELD | EXPLICIT_LOCALIZED_FIELDS | ADD nameAr String? |
| 8 | DegreeLevel | canonicalCode/id | IDENTITY_FIELD | KEEP_EXISTING | NONE |
| 8 | DegreeLevel | nameAr/nameEn | LOCALIZED_FIELD | KEEP_EXISTING | NONE |
| 8 | AcademicTaxonomyNode | id/deterministicKey/canonicalCode | IDENTITY_FIELD | KEEP_EXISTING | NONE |
| 8 | AcademicTaxonomyNode | canonicalName | SOURCE_NATIVE_FIELD | KEEP_EXISTING | PRESERVE |
| 8 | AcademicTaxonomyNode | localizedNames | LOCALIZED_FIELD | EXISTING_LOCALIZED_JSON | KEEP_JSON_WITH_VALIDATED_LOCALE_KEYS |
| 8 | AcademicTaxonomyNode | description | SOURCE_NATIVE_FIELD | KEEP_EXISTING | PRESERVE_SOURCE |
| 8 | AcademicTaxonomyNode | localizedDescriptions | LOCALIZED_FIELD | EXISTING_LOCALIZED_JSON | ADD localizedDescriptions Json? IF PUBLIC DESCRIPTION IS EXPOSED |
| 8 | AcademicTaxonomyAlias | locale/alias | LOCALE_CHILD_RECORD | KEEP_EXISTING | NONE |
| 9 | InternationalTest | publicId/slug/canonicalDedupKey | IDENTITY_FIELD | KEEP_EXISTING | NONE |
| 9 | InternationalTest | canonicalName/displayName | SOURCE_NATIVE_FIELD | KEEP_EXISTING | PRESERVE_AS_SOURCE_FALLBACK |
| 9 | InternationalTest | localizedNameAr/localizedNameEn | LOCALIZED_FIELD | KEEP_EXISTING | NONE |
| 9 | InternationalTestFamily/Provider | localizedNameAr/localizedNameEn | LOCALIZED_FIELD | KEEP_EXISTING | NONE |
| 9 | InternationalTestContentBlock | locale/title/content | LOCALE_CHILD_RECORD | KEEP_EXISTING | USE_FOR_LOCALIZED_DESCRIPTIVE_CONTENT |
| 9 | InternationalTest | registrationRequirements/identificationRequirements/retakePolicy/cancellationReschedulingNotes/accessibilityNotes | SOURCE_NATIVE_FIELD | EXISTING_LOCALE_CHILD_RECORD | PRESERVE_SCALARS; DEFINE STABLE CONTENT_BLOCK KEYS FOR LOCALIZED PROJECTION; NO DESTRUCTIVE DROP |
| 9 | InternationalTest structured values | scores/fees/dates/codes/URLs/country-language-degree links | NON_TRANSLATABLE_STRUCTURED_VALUE | STRUCTURED_VALUE | NONE |
| 9 | InternationalTestVersion | source locale | PROVENANCE_ONLY | EXPLICIT_LOCALIZED_FIELDS | ADD sourceLocale String? |
| 10 | Major | publicId MJR/MAS/DOC and canonical identity | IDENTITY_FIELD | KEEP_EXISTING | NONE |
| 10 | Major | canonicalName/displayName | SOURCE_NATIVE_FIELD | KEEP_EXISTING | PRESERVE_AS_SOURCE_FALLBACK |
| 10 | Major | localizedNameAr/localizedNameEn | LOCALIZED_FIELD | EXPLICIT_LOCALIZED_FIELDS | ADD localizedNameAr String?; ADD localizedNameEn String? |
| 10 | MajorLevelProfile | localizedNameAr/localizedNameEn | LOCALIZED_FIELD | KEEP_EXISTING | NONE |
| 10 | MajorContentSection | locale/title/content | LOCALE_CHILD_RECORD | KEEP_EXISTING | NONE |
| 10 | MajorAlias | locale/alias | LOCALE_CHILD_RECORD | KEEP_EXISTING | NONE |
| 10 | FellowshipDefinition | publicId FEL/canonical identity | IDENTITY_FIELD | KEEP_EXISTING | NONE |
| 10 | FellowshipDefinition | localizedNameAr/localizedNameEn | LOCALIZED_FIELD | EXPLICIT_LOCALIZED_FIELDS | ADD localizedNameAr String?; ADD localizedNameEn String? |
| 10 | MajorSource | source locale | PROVENANCE_ONLY | EXPLICIT_LOCALIZED_FIELDS | ADD sourceLocale String? |
| 10 | Major relations/classifications | ids/codes/confidence/relationship types | NON_TRANSLATABLE_STRUCTURED_VALUE | STRUCTURED_VALUE | NONE |
| 11 | University | id/publicId INS/slug/canonicalDedupKey | IDENTITY_FIELD | KEEP_EXISTING | NONE |
| 11 | University | canonicalName/displayName | SOURCE_NATIVE_FIELD | KEEP_EXISTING | PRESERVE; DO NOT OVERWRITE WITH TRANSLATION |
| 11 | University | localized top-level displayName/description | LOCALE_CHILD_RECORD | NEW_NORMALIZED_TRANSLATION_MODEL | ADD UniversityTranslation UNIQUE(universityId, locale) |
| 11 | University child content | Campus name/address; OrganizationUnit name; AcademicProgram localized display; Tuition/Accommodation notes; Ranking scopeLabel/note | LOCALE_CHILD_RECORD | NEW_BOUNDED_LOCALIZED_TEXT_MODEL | ADD UniversityLocalizedText WITH universityId,targetType,targetId,fieldKey,locale,value,reviewStatus,sourceRecordId; UNIQUE target+field+locale |
| 11 | UniversityDto | localizedNames | LOCALIZED_FIELD | NEW_NORMALIZED_TRANSLATION_MODEL | LATER PROJECT FROM UniversityTranslation; DO NOT STORE IN optionalFields |
| 11 | UniversitySourceRecord | source locale | PROVENANCE_ONLY | EXPLICIT_LOCALIZED_FIELDS | ADD sourceLocale String? |
| 11 | University structured values | country/region/city FKs, degreeLevelId, majorId, test ids, money/currency, dates, ranks, URLs | NON_TRANSLATABLE_STRUCTURED_VALUE | STRUCTURED_VALUE | NONE |
| future | Scholarship | localized content | LOCALE_CHILD_RECORD | DEFERRED_FUTURE_PHASE | DO NOT IMPLEMENT IN PHASE7_11 TRANSLATION MIGRATION |
| future | Courses | localized content | LOCALE_CHILD_RECORD | DEFERRED_FUTURE_PHASE | DO NOT IMPLEMENT IN PHASE7_11 TRANSLATION MIGRATION |
| future | CMS | localized content | LOCALE_CHILD_RECORD | KEEP_EXISTING | PRESERVE EXISTING CMS LOCALIZATION CONTRACT |

## Approval result

```text
TRANSLATION_DATA_MODEL_DECISION = APPROVED
WP06 MAY PREPARE ADDITIVE PRISMA CHANGES = YES
CLOUD SQL MIGRATION APPLY = NO
```

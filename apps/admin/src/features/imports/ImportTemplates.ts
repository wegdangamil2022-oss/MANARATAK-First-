/** CSV headers use the owner's accepted field names; typed optional fields belong in JSON or a mapping profile. */
export const IMPORT_FIELD_TEMPLATES = {
  UNIVERSITIES: 'universityName,country,city,institutionType,officialWebsite,officialSourceUrl',
  COURSES:
    'courseName,accessType,directCourseUrl,providerName,learningLanguage,studyDuration,officialSourceUrl',
  TESTS:
    'testCode,canonicalName,localizedNameAr,testCategory,providerName,officialSourceUrl,description',
} as const;

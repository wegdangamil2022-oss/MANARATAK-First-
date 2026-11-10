/** Read-only discovery options. These scopes never authorize editing reference data. */
export const ADMIN_CATALOG_FACETS = {
  universities: [
    "continent",
    "countryReferenceId",
    "regionReferenceId",
    "cityReferenceId",
    "institutionType",
  ],
  majors: ["academicFieldId", "disciplineId", "taxonomyNodeId"],
  "international-tests": [
    "testCategory",
    "countryIso2Code",
    "languageReferenceId",
    "degreeLevelId",
    "taxonomyNodeId",
    "providerName",
  ],
  scholarships: [
    "countryReferenceId",
    "studyLanguageReferenceId",
    "currencyReferenceId",
    "degreeLevelId",
    "majorId",
    "universityId",
    "internationalTestId",
  ],
  courses: [
    "taxonomyNodeId",
    "majorId",
    "externalProviderId",
    "learningLanguage",
    "difficultyLevel",
  ],
} as const;
export type AdminCatalogName = keyof typeof ADMIN_CATALOG_FACETS;
export const ADMIN_CATALOG_CONTEXT_KEYS: Record<
  AdminCatalogName,
  readonly string[]
> = {
  universities: [
    "search",
    "status",
    "completenessStatus",
    "continent",
    "countryReferenceId",
    "regionReferenceId",
    "cityReferenceId",
    "institutionType",
  ],
  majors: [
    "search",
    "status",
    "completenessStatus",
    "degreeLevel",
    "academicFieldId",
    "disciplineId",
    "taxonomyNodeId",
    "collegeOrFaculty",
  ],
  "international-tests": [
    "searchQuery",
    "status",
    "completenessStatus",
    "testCategory",
    "countryIso2Code",
    "languageReferenceId",
    "degreeLevelId",
    "taxonomyNodeId",
    "providerName",
    "staleOnly",
    "isPubliclyVisible",
  ],
  scholarships: [
    "query",
    "status",
    "completenessStatus",
    "countryReferenceId",
    "studyLanguageReferenceId",
    "currencyReferenceId",
    "degreeLevelId",
    "majorId",
    "universityId",
    "academicProgramId",
    "internationalTestId",
    "fundingCoverage",
    "sponsorName",
    "verificationStatus",
    "translationState",
    "translationLocale",
    "deadlineFrom",
    "deadlineTo",
    "sourceType",
    "countryLabel",
    "languageLabel",
    "majorLabel",
    "degreeLabel",
    "fundingType",
    "deadlineStatus",
  ],
  courses: [
    "search",
    "status",
    "completenessStatus",
    "originType",
    "studyAccess",
    "certificateState",
    "taxonomyNodeId",
    "majorId",
    "externalProviderId",
    "platformName",
    "relationshipState",
    "category",
    "learningLanguage",
    "difficultyLevel",
    "linkHealth",
    "instructor",
    "hasEnrollments",
    "cohortFrom",
    "cohortTo",
  ],
};
export interface AdminCatalogFilterOption {
  id: string;
  labelAr: string;
  labelEn: string;
  code?: string;
  metadata?: Record<string, string | null>;
}
export interface AdminCatalogFilterPage {
  options: AdminCatalogFilterOption[];
  nextPage: number | null;
}
export interface AdminCatalogFilterRequest {
  catalog: AdminCatalogName;
  facet: string;
  context: Record<string, string>;
  search?: string;
  page?: number;
}
export interface IAdminCatalogFilterReadPort {
  options(request: AdminCatalogFilterRequest): Promise<AdminCatalogFilterPage>;
}

/** A facet excludes itself and its children, retaining the other active constraints. */
export function adminCatalogFacetContext(
  catalog: AdminCatalogName,
  facet: string,
  context: Record<string, string>,
): Record<string, string> {
  const result = { ...context };
  delete result[facet];
  const clear = (keys: string[]) => keys.forEach((key) => delete result[key]);
  if (catalog === "universities") {
    if (facet === "continent")
      clear(["countryReferenceId", "regionReferenceId", "cityReferenceId"]);
    if (facet === "countryReferenceId")
      clear(["regionReferenceId", "cityReferenceId"]);
    if (facet === "regionReferenceId") clear(["cityReferenceId"]);
  }
  if (catalog === "majors") {
    if (facet === "academicFieldId") clear(["disciplineId", "taxonomyNodeId"]);
    if (facet === "disciplineId") clear(["taxonomyNodeId"]);
  }
  if (catalog === "international-tests" && facet === "testCategory")
    clear([
      "countryIso2Code",
      "languageReferenceId",
      "degreeLevelId",
      "taxonomyNodeId",
      "providerName",
    ]);
  if (catalog === "scholarships") {
    if (facet === "degreeLevelId")
      clear(["majorId", "academicProgramId", "degreeLabel"]);
    if (facet === "universityId") clear(["academicProgramId"]);
    if (facet === "countryReferenceId") clear(["countryLabel"]);
    if (facet === "studyLanguageReferenceId") clear(["languageLabel"]);
    if (facet === "majorId") clear(["majorLabel"]);
  }
  if (catalog === "courses" && facet === "taxonomyNodeId") clear(["majorId"]);
  return result;
}

const TEST_CATEGORY_GROUPS: Record<string, readonly string[]> = {
  ENGLISH_LANGUAGE: ["ENGLISH_LANGUAGE", "LANGUAGE_PROFICIENCY"],
  GENERAL_UNDERGRADUATE_ADMISSION: [
    "GENERAL_UNDERGRADUATE_ADMISSION",
    "UNDERGRAD_ADMISSION",
    "STANDARDIZED_ADMISSION",
  ],
  GRADUATE_ADMISSION: ["GRADUATE_ADMISSION", "GRAD_ADMISSION"],
  PROFESSIONAL_LICENSING_CERTIFICATION: [
    "PROFESSIONAL_LICENSING_CERTIFICATION",
    "PROFESSIONAL_LICENSING",
  ],
};
export function canonicalTestCategory(value: string): string {
  return (
    Object.keys(TEST_CATEGORY_GROUPS).find((key) =>
      TEST_CATEGORY_GROUPS[key].includes(value),
    ) ?? value
  );
}
export function testCategoryFilterValues(value: string): readonly string[] {
  return TEST_CATEGORY_GROUPS[canonicalTestCategory(value)] ?? [value];
}

/** Display Latin geography without scholarly combining marks; canonical names remain intact. */
export function readableGeographyName(value: string): string {
  const latin: Record<string, string> = {
    Ł: "L",
    ł: "l",
    Ø: "O",
    ø: "o",
    Đ: "D",
    đ: "d",
    Ð: "D",
    ð: "d",
    Æ: "Ae",
    æ: "ae",
    Œ: "Oe",
    œ: "oe",
    ß: "ss",
    Þ: "Th",
    þ: "th",
    ı: "i",
  };
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[ŁłØøĐđÐðÆæŒœßÞþı]/gu, (char) => latin[char])
    .replace(/[‘’ʻʼʿʾ`]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/^'+|'+$/gu, "");
}

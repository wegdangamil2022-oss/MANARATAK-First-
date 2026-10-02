const text = (value: unknown): string | undefined => String(value ?? '').trim() || undefined;
const list = (value: unknown): string[] => (text(value) ?? '').split('|').map(item => item.trim()).filter(Boolean);
const bool = (value: unknown): boolean | undefined => {
  const key = (text(value) ?? '').toLowerCase();
  return ['yes', 'نعم'].includes(key) ? true : ['no', 'لا'].includes(key) ? false : undefined;
};
const number = (value: unknown): number | undefined => {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : undefined;
};
const pairs = (value: unknown, first: string, second: string): Array<Record<string, string>> => list(value).map(item => {
  const [a, b] = item.split('::').map(part => part.trim());
  return { [first]: a ?? '', [second]: b ?? '' };
});

/** Projection only: retain source semantics, including invalid source values for QC. */
export function universityStage3Payload(row: Record<string, unknown>) {
  return {
    sourceReferenceId: text(row['University Reference ID']), availableDegrees: list(row['Available Degrees']), faculties: list(row.Faculties), languagesOfInstruction: list(row['Languages of Instruction']), studyModes: list(row['Study Modes']), officialProgramCatalogUrl: text(row['Official Program Catalog URL']), keyMajors: list(row['Key Majors']), acceptsInternationalStudents: bool(row['Accepts International Students?']), undergraduateAdmissionUrl: text(row['Undergraduate Admission URL']), graduateAdmissionUrl: text(row['Graduate Admission URL']), internationalStudentAdmissionUrl: text(row['International Student Admission URL']), officialApplicationPortalUrl: text(row['Official Application Portal URL']), hasLanguageRequirements: bool(row['Are There Language Requirements?']), requiredLanguages: list(row['Required Languages']), acceptedLanguageTests: list(row['Accepted Language Tests']), officialLanguageRequirementsUrl: text(row['Official Language Requirements URL']), hasInternationalScholarships: bool(row['Are Scholarships Available for International Students?']), internationalScholarships: pairs(row['Key International Scholarships'], 'name', 'officialUrl'),
  };
}
export function universityStage4Payload(row: Record<string, unknown>) {
  return {
    sourceReferenceId: text(row['University Reference ID']), annualTuitionFee: number(row['Annual Tuition Fee']), undergraduateMedicineFee: number(row['Undergraduate Medicine Fee, if applicable']), engineeringUndergraduateFees: pairs(row['Engineering Undergraduate Fees by Faculty'], 'faculty', 'amount').map(item => ({ faculty: item.faculty, amount: Number(item.amount) })), graduateTuitionFee: number(row['Graduate Tuition Fee']), tuitionCurrency: text(row.Currency), officialTuitionFeeUrl: text(row['Official Tuition Fee URL']), accommodationAvailable: bool(row['Is University Accommodation Available?']), internationalStudentsEligibleForAccommodation: bool(row['Are International Students Eligible for Accommodation?']), typicalAccommodationCost: number(row['Typical Accommodation Cost']), accommodationCurrency: text(row['Accommodation Cost Currency']), averageMonthlyLivingCost: number(row['Average Monthly Living Cost']), livingCostCurrency: text(row['Living Cost Currency']), costVariationNote: text(row['Cost Variation Note']), generalRequiredDocuments: list(row['General Required Documents']), additionalGraduateRequirements: list(row['Additional Graduate Requirements']), officialRequiredDocumentsUrl: text(row['Official Required Documents URL']),
  };
}

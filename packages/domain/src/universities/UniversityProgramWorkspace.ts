export interface ProgramStudy {
  languageReferenceIds: string[];
  studyMode: 'UNKNOWN' | 'FULL_TIME' | 'PART_TIME';
  teachingDelivery: 'UNKNOWN' | 'ON_CAMPUS' | 'ONLINE' | 'HYBRID';
  durationValue?: number;
  durationUnit?: 'MONTHS' | 'YEARS';
  entryEligibility?: string;
  verificationStatus: 'UNKNOWN' | 'VERIFIED';
  officialSourceUrl?: string;
}
export interface ProgramIntake {
  id: string;
  intakeStart: string;
  applicationOpen: string;
  applicationClose: string;
  applicantSegment: string;
  timezone: string;
  officialSourceUrl: string;
  verificationStatus: 'UNKNOWN' | 'VERIFIED';
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}
export function validateProgramStudy(value: ProgramStudy): void {
  if (
    !Array.isArray(value.languageReferenceIds) ||
    value.languageReferenceIds.length > 20 ||
    new Set(value.languageReferenceIds).size !== value.languageReferenceIds.length ||
    value.languageReferenceIds.some(
      (id) => typeof id !== 'string' || !id.trim() || id.length > 240,
    ) ||
    !['UNKNOWN', 'FULL_TIME', 'PART_TIME'].includes(value.studyMode) ||
    !['UNKNOWN', 'ON_CAMPUS', 'ONLINE', 'HYBRID'].includes(value.teachingDelivery) ||
    !['UNKNOWN', 'VERIFIED'].includes(value.verificationStatus) ||
    (value.entryEligibility?.length ?? 0) > 4000 ||
    (value.durationValue === undefined) !== (value.durationUnit === undefined) ||
    (value.durationValue !== undefined &&
      (!Number.isFinite(value.durationValue) ||
        value.durationValue <= 0 ||
        value.durationValue > 1000)) ||
    (value.durationUnit !== undefined && !['MONTHS', 'YEARS'].includes(value.durationUnit))
  )
    throw new Error('UNIVERSITY_PROGRAM_STUDY_INVALID');
  if (value.officialSourceUrl) assertProgramEvidenceUrl(value.officialSourceUrl);
  if (value.verificationStatus === 'VERIFIED' && !value.officialSourceUrl)
    throw new Error('UNIVERSITY_PROGRAM_EVIDENCE_REQUIRED');
}
export function assertProgramEvidenceUrl(value: string): void {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
  } catch {
    throw new Error('UNIVERSITY_PROGRAM_EVIDENCE_URL_INVALID');
  }
}
export function validateProgramIntake(value: ProgramIntake): void {
  const dates = [value.intakeStart, value.applicationOpen, value.applicationClose].map(Date.parse);
  if (
    dates.some((date) => !Number.isFinite(date)) ||
    dates[2] <= dates[1] ||
    !value.applicantSegment?.trim() ||
    value.applicantSegment.length > 100 ||
    !['UNKNOWN', 'VERIFIED'].includes(value.verificationStatus) ||
    !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(value.status)
  )
    throw new Error('UNIVERSITY_PROGRAM_INTAKE_INVALID');
  try {
    new Intl.DateTimeFormat('en', { timeZone: value.timezone }).format();
  } catch {
    throw new Error('UNIVERSITY_PROGRAM_TIMEZONE_INVALID');
  }
  assertProgramEvidenceUrl(value.officialSourceUrl);
  if (value.status === 'ACTIVE' && value.verificationStatus !== 'VERIFIED')
    throw new Error('UNIVERSITY_PROGRAM_EVIDENCE_REQUIRED');
}
export function intakeWindow(
  value: Pick<
    ProgramIntake,
    'applicationOpen' | 'applicationClose' | 'status' | 'verificationStatus'
  >,
  now = new Date(),
): 'UNKNOWN' | 'UPCOMING' | 'OPEN' | 'CLOSED' {
  if (value.status !== 'ACTIVE' || value.verificationStatus !== 'VERIFIED') return 'UNKNOWN';
  if (now.getTime() < Date.parse(value.applicationOpen)) return 'UPCOMING';
  return now.getTime() >= Date.parse(value.applicationClose) ? 'CLOSED' : 'OPEN';
}

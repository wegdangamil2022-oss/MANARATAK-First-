import type { CareerEmployerDto, CareerJobPostingDto } from '@manaratak/domain';
export const careerRecord = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
export const careerGovernance = (value: { metadata?: Record<string, unknown> | null }) => careerRecord(value.metadata?._career);
export function publishedCareerJob(job: CareerJobPostingDto): CareerJobPostingDto {
  const snapshot = careerGovernance(job).publishedSnapshot;
  return snapshot && typeof snapshot === 'object' ? { ...job, ...snapshot, employer: job.employer } : job;
}
export function safeCareerUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('CAREER_URL_INVALID'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443' ||
      !host.includes('.') || host === 'localhost' || /(?:\.local|\.localhost|\.internal)$/.test(host) ||
      /^[\d.]+$/.test(host) || host.includes(':')) throw new Error('CAREER_URL_INVALID');
  return url.toString();
}
export function careerEmployerVerified(employer?: CareerEmployerDto | null): boolean {
  const proof = employer && careerRecord(careerGovernance(employer).verification);
  return !!employer && employer.verificationStatus === 'VERIFIED' && !!proof?.reviewerActorId &&
    !!careerGovernance(employer).makerActorId && proof.reviewerActorId !== careerGovernance(employer).makerActorId && proof.subjectEmployerId === employer.id && !!proof.sourceUrl &&
    Number.isFinite(Date.parse(proof.expiresAt)) && Date.parse(proof.expiresAt) > Date.now();
}
export function assertCareerReady(job: CareerJobPostingDto): void {
  if (![job.title, job.description, job.jobCategory, job.countryReferenceId].every(value => typeof value === 'string' && value.trim()))
    throw new Error('CAREER_READINESS_BLOCKED');
  if (!careerEmployerVerified(job.employer)) throw new Error('CAREER_EMPLOYER_NOT_VERIFIED');
  if (!job.applicationDeadline || !Number.isFinite(new Date(job.applicationDeadline).getTime()) || new Date(job.applicationDeadline).getTime() <= Date.now())
    throw new Error('CAREER_DEADLINE_INVALID');
  if (!job.metadata?.sourceUrl) throw new Error('CAREER_SOURCE_REQUIRED');
  safeCareerUrl(String(job.metadata.sourceUrl));
  if (job.metadata?.applicationChannel !== 'INTERNAL') {
    if (!job.externalPostingUrl) throw new Error('CAREER_APPLICATION_CHANNEL_REQUIRED');
    safeCareerUrl(job.externalPostingUrl);
  }
}
export function careerJobOpen(raw: CareerJobPostingDto | null): boolean {
  if (!raw) return false;
  const job = publishedCareerJob(raw);
  return job.status === 'PUBLISHED' && careerEmployerVerified(raw.employer) &&
    !!job.applicationDeadline && Number.isFinite(new Date(job.applicationDeadline).getTime()) &&
    new Date(job.applicationDeadline).getTime() > Date.now() &&
    !!careerRecord(careerGovernance(job).review).reviewerActorId &&
    careerRecord(careerGovernance(job).review).reviewerActorId !== careerGovernance(job).makerActorId;
}
export function careerPublicMetadata(metadata?: Record<string, unknown> | null): Record<string, unknown> {
  const source = metadata ?? {}, result: Record<string, unknown> = {};
  for (const key of ['applicationChannel','sourceUrl','recruitmentCycle','experienceLevel','summary','durationLabel'])
    if (typeof source[key] === 'string') result[key] = source[key];
  for (const key of ['responsibilities','benefits','applicationSteps'])
    if (Array.isArray(source[key])) result[key] = source[key].filter(value => typeof value === 'string');
  const localized = careerRecord(source.localizedContent), languages: Record<string, unknown> = {};
  for (const locale of ['ar','en']) {
    const content = careerRecord(localized[locale]);
    if (typeof content.title === 'string' && typeof content.description === 'string')
      languages[locale] = { title: content.title, description: content.description };
  }
  if (Object.keys(languages).length) result.localizedContent = languages;
  return result;
}

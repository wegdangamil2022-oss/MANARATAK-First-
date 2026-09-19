import { ApiClient, type PublicScholarshipDto } from '../../api/client';
import type { DegreeLevel, Scholarship } from './types';

export type PublicTemplateDataMode = 'prototype' | 'api';
export type PublicScholarshipDataStatus = 'prototype' | 'loading' | 'ready' | 'empty' | 'unavailable';

const DEGREE_LEVELS: Array<Exclude<DegreeLevel, 'all'>> = [
  'بكالوريوس', 'ماجستير', 'دكتوراه', 'دورات تدريبية', 'زمالة أبحاث',
];

/** Live/API is the safe default. Prototype mode must be explicitly requested. */
export function resolvePublicTemplateDataMode(value: unknown): PublicTemplateDataMode {
  return value === 'prototype' ? 'prototype' : 'api';
}

function toTextList(value: string | string[] | undefined | null): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (!value) return [];
  return value.split(/[,،;\n]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeDegreeLevels(value: string): Array<Exclude<DegreeLevel, 'all'>> {
  const normalized = value.toLowerCase();
  return DEGREE_LEVELS.filter((level) => {
    if (normalized.includes(level.toLowerCase())) return true;
    if (level === 'بكالوريوس') return /bachelor|undergraduate/.test(normalized);
    if (level === 'ماجستير') return /master|postgraduate/.test(normalized);
    if (level === 'دكتوراه') return /doctor|phd/.test(normalized);
    if (level === 'زمالة أبحاث') return /fellowship|research/.test(normalized);
    return /course|training/.test(normalized);
  });
}

function daysUntil(deadline: string | null | undefined, now: Date): number {
  if (!deadline) return 0;
  const value = new Date(deadline);
  if (Number.isNaN(value.getTime())) return 0;
  return Math.max(0, Math.ceil((value.getTime() - now.getTime()) / 86_400_000));
}

/**
 * Maps only owner-published P12 data. Canonical relationship IDs are retained;
 * no synthetic university/program/test identities are generated from labels.
 */
export function mapPublicScholarshipDto(dto: PublicScholarshipDto, now = new Date()): Scholarship {
  const legacyUniversities = toTextList(dto.targetUniversities);
  const legacyFields = toTextList(dto.eligibleMajorsOrFields);
  const canonicalUniversityLinks = (dto.universityLinks ?? []).filter((link) => Boolean(link.universityId));
  const canonicalMajorTargets = (dto.majorTargets ?? []).filter((target) => Boolean(target.majorId));
  const canonicalDegrees = (dto.degreeTargets ?? []).flatMap((target) => normalizeDegreeLevels(target.sourceLabel ?? target.degreeLevelId ?? ''));
  const legacyDegrees = normalizeDegreeLevels(dto.degreeLevel ?? '');
  const deadline = dto.applicationDeadline ?? '';
  const deadlineDate = deadline ? new Date(deadline) : null;
  const isClosed = deadlineDate !== null && !Number.isNaN(deadlineDate.getTime()) && deadlineDate < now;
  const requirements = (dto.requiredDocumentItems ?? []).map((item) => item.displayName).filter(Boolean);
  const eligibility = (dto.eligibilityItems ?? []).map((item) => item.valueText).filter((item): item is string => Boolean(item));
  const requiredTests = (dto.eligibilityItems ?? []).filter((item) => Boolean(item.internationalTestId));
  const benefitLabels = (dto.benefits ?? []).map((item) => item.valueText ?? item.benefitTypeCode).filter(Boolean);
  const participatingUniversities = canonicalUniversityLinks.map((link) => ({
    id: link.universityId as string,
    name: link.sourceLabel ?? 'جامعة مرتبطة',
    nameEn: link.sourceLabel ?? 'Linked university',
  }));
  const universityLabel = participatingUniversities[0]?.name ?? legacyUniversities[0] ?? dto.sponsorName ?? '';
  const fields = canonicalMajorTargets.map((target) => target.sourceLabel ?? target.majorId ?? '').filter(Boolean);

  return {
    id: dto.slug,
    publicId: dto.publicId,
    slug: dto.slug,
    countryReferenceId: dto.countryReferenceId,
    title: dto.displayName,
    titleEn: dto.canonicalName,
    country: dto.studyCountry ?? dto.countrySourceLabel ?? '',
    countryEn: dto.studyCountry ?? dto.countrySourceLabel ?? '',
    countryFlag: '',
    university: universityLabel,
    universityEn: universityLabel,
    degreeLevel: [...new Set([...canonicalDegrees, ...legacyDegrees])],
    fundingType: dto.fundingCoverage ?? dto.fundingTypeCode ?? 'تمويل',
    financialCoverage: benefitLabels.length ? benefitLabels : toTextList(dto.coverageDetails),
    deadline,
    daysLeft: daysUntil(deadline, now),
    featured: false,
    tag: 'منحة منشورة',
    imageUrl: '',
    field: (fields.length ? fields : legacyFields).join('، '),
    requirements: requirements.length ? [...requirements, ...eligibility] : (eligibility.length ? eligibility : toTextList(dto.eligibilityCriteria)),
    description: dto.coverageDetails || dto.eligibilityCriteria || '',
    applicationUrl: dto.applicationLink ?? dto.applicationUrl ?? dto.officialSourceUrl ?? '',
    withoutIelts: null,
    status: isClosed ? 'مغلقة' : 'مفتوحة الآن',
    participatingUniversities,
    requiredExams: requiredTests.map((item) => ({
      id: item.internationalTestId as string,
      name: item.valueText ?? 'اختبار مطلوب',
      nameEn: item.valueText ?? 'Required test',
    })),
  };
}

/** Reads the published Phase 12 projection without any prototype-data fallback. */
export async function loadPublishedScholarships(): Promise<Scholarship[]> {
  const items: PublicScholarshipDto[] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 10000; guard += 1) {
    const page = await ApiClient.getScholarships({ cursor, limit: 100 });
    items.push(...page.data);
    if (!page.hasMore || !page.nextCursor) break;
    if (page.nextCursor === cursor) throw new Error('PUBLIC_SCHOLARSHIP_CURSOR_DID_NOT_ADVANCE');
    cursor = page.nextCursor;
  }
  return items.map((item) => mapPublicScholarshipDto(item));
}

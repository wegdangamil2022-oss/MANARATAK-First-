import type {
  MajorDto,
  ScholarshipDto,
  UniversityDto,
  InternationalTestDto,
  ServiceCatalogItemDto,
  CareerJobPostingDto,
  ReferenceCountryDto,
} from '@manaratak/domain';
import { publishedCareerJob, careerRecord } from '../career-alumni/CareerPolicy';
import { reviewedGraphLabel } from './GraphReadPolicy';
export function graphPublishedLabel(
  source: string | undefined,
  values: Record<string, unknown> | null | undefined,
  locale = 'ar',
) {
  const translated = values?.[locale];
  return typeof translated === 'string' && translated.trim()
    ? { displayName: translated.trim(), labelLocale: locale, localeFallback: false }
    : { displayName: source ?? '', labelLocale: 'OWNER_DEFAULT', localeFallback: true };
}
export const graphUniversityLabel = (owner: UniversityDto, locale = 'ar') =>
  reviewedGraphLabel(owner, locale);
export function graphMajorLabel(owner: MajorDto, locale = 'ar') {
  const candidates = owner.optionalFields?.translationNameCandidates as
    Record<string, { value?: string; reviewStatus?: string }> | undefined;
  const candidate = candidates?.[locale];
  if (candidate?.reviewStatus === 'PUBLISHED' && candidate.value?.trim())
    return graphPublishedLabel(owner.displayName, { [locale]: candidate.value }, locale);
  // Published snapshot identity owns these names; a raw draft/legacy label has no such evidence.
  if (owner.status === 'PUBLISHED' && owner.currentPublishedVersionId)
    return graphPublishedLabel(
      owner.displayName,
      { ar: owner.localizedNameAr, en: owner.localizedNameEn },
      locale,
    );
  return reviewedGraphLabel(owner, locale);
}
export const graphScholarshipLabel = (owner: ScholarshipDto, locale = 'ar') =>
  graphPublishedLabel(owner.displayName, owner.localizedNames, locale);
export function graphTestLabel(owner: InternationalTestDto, locale = 'ar') {
  const name = typeof owner.displayName === 'string' ? owner.displayName : owner.canonicalName;
  return owner.currentPublishedVersionId
    ? graphPublishedLabel(name, { ar: owner.localizedNameAr, en: owner.localizedNameEn }, locale)
    : graphPublishedLabel(name, null, locale);
}
export function graphServiceLabel(owner: ServiceCatalogItemDto, locale = 'ar') {
  const published = { ...owner, ...owner.publishedSnapshot };
  return graphPublishedLabel(
    published.displayName,
    { [locale]: published.localizedContent?.[locale]?.displayName },
    locale,
  );
}
export function graphCareerLabel(owner: CareerJobPostingDto, locale = 'ar') {
  const published = publishedCareerJob(owner),
    content = careerRecord(careerRecord(published.metadata?.localizedContent)[locale]);
  return graphPublishedLabel(published.title, { [locale]: content.title }, locale);
}
export const graphCountryLabel = (owner: ReferenceCountryDto, locale = 'ar') =>
  graphPublishedLabel(owner.name, { en: owner.name, ar: owner.nameAr }, locale);

export function graphProgramLabel(
  owner: UniversityDto,
  program: { id: string; sourceProgramName: string },
  locale = 'ar',
) {
  const values = Object.fromEntries(
    (owner.localizedTexts ?? [])
      .filter(
        (row) =>
          row.targetType === 'ACADEMIC_PROGRAM' &&
          row.targetId === program.id &&
          row.fieldKey === 'sourceProgramName' &&
          row.reviewStatus === 'PUBLISHED',
      )
      .map((row) => [row.locale, row.value]),
  );
  return graphPublishedLabel(program.sourceProgramName, values, locale);
}

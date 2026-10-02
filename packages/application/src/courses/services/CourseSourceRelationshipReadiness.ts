import type { CourseAcademicTaxonomyLinkDto, CourseTaxonomyResolutionDto } from '@manaratak/domain';

export const normalizeCourseSourceTerm = (value: string): string => value.normalize('NFKC').trim().toLowerCase().replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, ' ');
export function courseSourceRelationshipReviewRequired(rawTopics: string | null | undefined, links: readonly CourseAcademicTaxonomyLinkDto[], resolutions: readonly CourseTaxonomyResolutionDto[]): boolean {
  const terms = [...new Set((rawTopics ?? '').split(/\s*(?:•|\||;|\n)\s*/g).map(normalizeCourseSourceTerm).filter(Boolean))];
  return terms.some(term => {
    const decisions = resolutions.filter(row => normalizeCourseSourceTerm(row.normalizedTerm) === term);
    if (decisions.some(row => ['UNRESOLVED', 'AMBIGUOUS', 'PROPOSED', 'REVIEW_REQUIRED'].includes(row.status))) return true;
    if (decisions.some(row => row.status === 'REJECTED')) return false; // Explicit reviewed exclusion is not an unresolved relation.
    return !links.some(link => link.reviewState === 'APPROVED' && normalizeCourseSourceTerm(link.sourceTerm) === term);
  });
}

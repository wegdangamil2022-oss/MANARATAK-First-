import type { StudyDestinationProfileInput } from '@manaratak/domain';
import { assertTranslationContentAuthoringEnabled } from '@manaratak/shared';
export const studyDestinationEnglishFields = ['overviewEn', 'studySystemSummaryEn', 'admissionHighlightsEn',
  'visaSummaryEn', 'visaRequirementsEn', 'costHighlightsEn', 'studentLifeHighlightsEn'] as const;

/** Existing English content remains readable and round-trips unchanged. An Arabic
 * card save must neither author nor erase protected translations. */
export function assertStudyDestinationTranslationUnchanged(
  previous: StudyDestinationProfileInput | null,
  input: StudyDestinationProfileInput,
): void {
  const normalized = (value: unknown): unknown => (Array.isArray(value) ? value : (value ?? ''));
  const changed = studyDestinationEnglishFields.some(
    (key) =>
      key in input &&
      JSON.stringify(normalized(input[key])) !==
        JSON.stringify(normalized(previous?.[key] ?? (Array.isArray(input[key]) ? [] : ''))),
  );
  const labels = (profile: StudyDestinationProfileInput | null) =>
    (profile?.officialLinks ?? [])
      .map((link) => ({ label: link.labelEn ?? '', note: link.noteEn ?? '' }))
      .filter((link) => link.label || link.note);
  if (
    changed ||
    ('officialLinks' in input && JSON.stringify(labels(input)) !== JSON.stringify(labels(previous)))
  ) {
    assertTranslationContentAuthoringEnabled();
  }
}

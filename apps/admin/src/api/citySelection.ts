import { canonicalOptionIsSelectable, type CanonicalPickerOption } from './canonicalPickers';

const normalized = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en');

/** Review hints only. A source label never becomes a foreign key, even for one candidate. */
export function reviewCityLabel(rawLabel: string, options: CanonicalPickerOption[]) {
  const label = normalized(rawLabel);
  const candidates = label ? options.filter((item) => canonicalOptionIsSelectable(item) &&
    [item.label, item.metadata?.name, item.metadata?.nameAr].some((name) => name && normalized(name) === label)) : [];
  return {
    state: candidates.length > 1 ? 'AMBIGUOUS_REVIEW_REQUIRED' : candidates.length === 1 ? 'EXPLICIT_SELECTION_REQUIRED' : 'UNMATCHED_REVIEW_REQUIRED',
    candidateIds: candidates.map((item) => item.id),
    rawLabel,
  } as const;
}

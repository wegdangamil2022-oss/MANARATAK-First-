import type { ReviewItem } from './ReviewContracts';

/** Search only the permitted, retained window. Free text stays out of shared URLs. */
export function matchesReviewSearch(item: ReviewItem, query: string): boolean {
  const needle = query.trim().normalize('NFKC').toLocaleLowerCase();
  if (!needle) return true;
  return [
    item.title,
    item.id,
    item.domain,
    item.locale,
    item.sourceKind,
    item.verificationState,
    item.status,
    item.completenessStatus,
    ...item.signals.flatMap((signal) => [signal.reason, signal.ownerCode]),
  ].some((value) => value?.normalize('NFKC').toLocaleLowerCase().includes(needle));
}

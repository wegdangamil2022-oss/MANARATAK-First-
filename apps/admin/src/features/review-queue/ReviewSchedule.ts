import type { ReviewFilters } from './ReviewContracts';
import type { ReviewSource } from './ReviewSources';

/** Start with bounded workflow samples. A domain/reason selection reads its full source scope. */
export function reviewReadScope(sources: ReviewSource[], filters: ReviewFilters): ReviewSource[] {
  const reason = filters.reason !== 'all' ? filters.reason
    : filters.view === 'ready' ? 'ready_to_publish'
      : filters.view === 'translation' ? 'needs_translation' : null;
  if (filters.domain !== 'all' || reason) {
    return sources.filter(source => (filters.domain === 'all' || source.domain === filters.domain) && (!reason || source.reason === reason));
  }
  const firstByDomain = [...new Map([...sources].reverse().filter(source => source.reason === 'workflow_review').map(source => [source.domain, source])).values()].reverse();
  const missingDestinations = sources.find(source => source.domain === 'study-destinations' && source.params.status === 'NO_PROFILE');
  return missingDestinations ? [...firstByDomain, missingDestinations] : firstByDomain;
}

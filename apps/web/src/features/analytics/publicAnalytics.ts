import {
  ANALYTICS_POLICY_VERSION,
  PUBLIC_PAGE_KEYS,
  type PublicPageKey,
  type PublicAnalyticsEvent,
} from '@manaratak/shared';
const base = import.meta.env.VITE_API_URL || '/api/v1';
const storageKey = 'manaratak.public-analytics.v1';
export type AnalyticsChoice = {
  decision: 'accepted' | 'declined' | 'withdraw_pending';
  token?: string;
  expiresAt?: string;
  policyVersion: string;
};
export function readAnalyticsChoice(): AnalyticsChoice | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
    return value &&
      ['accepted', 'declined', 'withdraw_pending'].includes(value.decision) &&
      typeof value.policyVersion === 'string'
      ? value
      : null;
  } catch {
    return null;
  }
}
export function saveAnalyticsChoice(value: AnalyticsChoice) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* No persistent choice means no persistent analytics consent. */
  }
}
export function publicPageKey(path: string): PublicPageKey | null {
  const clean = path.replace(/^\/(ar|en)(?=\/|$)/, '').split(/[?#]/)[0],
    first = clean.split('/').filter(Boolean)[0] || 'home';
  if (first === 'international-tests') return 'tests';
  return (PUBLIC_PAGE_KEYS as readonly string[]).includes(first) ? (first as PublicPageKey) : null;
}
export function privacySignal() {
  return (
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}
export async function analyticsRequest(path: string, body?: unknown) {
  const response = await fetch(base + '/public/analytics/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('PUBLIC_ANALYTICS_UNAVAILABLE');
  return response.status === 204 ? null : response.json();
}
const pending = new Map<string, { at: number; eventId: string }>();
export async function recordPublicEvent(
  kind: PublicAnalyticsEvent['kind'],
  pageKey: PublicPageKey,
  opportunityId?: string,
  navigationKey: string = pageKey,
) {
  const choice = readAnalyticsChoice();
  if (
    privacySignal() ||
    choice?.decision !== 'accepted' ||
    choice.policyVersion !== ANALYTICS_POLICY_VERSION ||
    !choice.token ||
    !choice.expiresAt ||
    Date.parse(choice.expiresAt) <= Date.now()
  )
    return;
  const key = `${kind}:${navigationKey}:${opportunityId ?? ''}`;
  const recent = pending.get(key);
  if (recent && Date.now() - recent.at < 1500) return;
  const entry = { at: Date.now(), eventId: crypto.randomUUID() };
  pending.set(key, entry);
  if (pending.size > 100) pending.delete(pending.keys().next().value!);
  // Only the allowlisted page class is transmitted; navigationKey, URL/query and titles never leave the browser.
  await analyticsRequest('events', {
    token: choice.token,
    eventId: entry.eventId,
    kind,
    pageKey,
    ...(opportunityId ? { opportunityId } : {}),
  }).catch(() => {});
}

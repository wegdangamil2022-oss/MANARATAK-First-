export function publicRelationshipRouteKey(identity: { slug?: string | null }): string | null {
  const slug = identity.slug?.trim();
  return slug && slug.length <= 240 && !/[\\/\u0000-\u001f?#]/.test(slug) ? slug : null;
}
export function shouldRefreshPublicGraph(
  lastCapturedAt: number,
  now: number,
  hasSelection: boolean,
): boolean {
  return hasSelection && now - lastCapturedAt >= 30000;
}
export const COUNTRY_COURSE_SCOPE = 'PROVIDER_HEADQUARTERS_NOT_STUDY_DESTINATION';

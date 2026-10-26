/** Closed IAM resource scope. An absent course context never grants content access. */
export function parseCourseScope(configuration: string): string[] {
  const value: unknown = JSON.parse(configuration);
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => key !== 'courseIds')
  )
    throw Error('COURSE_SCOPE_CONFIGURATION_INVALID');
  const ids = (value as { courseIds?: unknown }).courseIds;
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 100 ||
    ids.some(
      (id) =>
        typeof id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
    ) ||
    new Set(ids).size !== ids.length
  )
    throw Error('COURSE_SCOPE_CONFIGURATION_INVALID');
  return ids as string[];
}

export type CourseDraft = Record<string, unknown>;
export interface CourseFieldConflict {
  path: string[];
  base: unknown;
  local: unknown;
  server: unknown;
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const object = (v: unknown): v is CourseDraft => !!v && typeof v === 'object' && !Array.isArray(v);
export function rebaseCourseDraft(base: CourseDraft, local: CourseDraft, server: CourseDraft) {
  const conflicts: CourseFieldConflict[] = [];
  function merge(a: unknown, b: unknown, c: unknown, path: string[]): unknown {
    if (equal(b, a)) return c;
    if (equal(c, a) || equal(b, c)) return b;
    if (object(a) && object(b) && object(c)) {
      return Object.fromEntries(
        [...new Set([...Object.keys(a), ...Object.keys(b), ...Object.keys(c)])].map((key) => [
          key,
          merge(a[key], b[key], c[key], [...path, key]),
        ]),
      );
    }
    conflicts.push({ path, base: a, local: b, server: c });
    return b;
  }
  return { draft: merge(base, local, server, []) as CourseDraft, conflicts };
}
export function chooseCourseConflict(draft: CourseDraft, path: string[], value: unknown) {
  const result = structuredClone(draft);
  let target = result;
  for (const key of path.slice(0, -1)) {
    if (!object(target[key])) target[key] = {};
    target = target[key] as CourseDraft;
  }
  target[path[path.length - 1]] = value;
  return result;
}
export function editableCourseFields(course: CourseDraft) {
  const optional = object(course.optionalFields) ? course.optionalFields : {};
  const fields: CourseDraft = {
    optionalFields: optional,
    displayName: course.displayName,
    accessType: course.accessType,
    thumbnailAssetId: course.thumbnailAssetId,
    directCourseUrl: course.directCourseUrl,
    certificateAvailable: course.certificateAvailable ?? false,
  };
  for (const key of [
    'platformName',
    'providerName',
    'learningLanguage',
    'studyDuration',
    'category',
    'difficultyLevel',
  ])
    fields[key] = course[key] ?? '';
  for (const key of ['courseContent', 'description', 'instructor'])
    fields[key] = course[key] ?? optional[key] ?? '';
  for (const key of ['learningOutcomes', 'acquiredSkills', 'prerequisites', 'targetAudience'])
    fields[key] = course[key] ?? optional[key] ?? [];
  return fields;
}

/** Match the explicit owner HTTP contract, never submit opaque original metadata as editable fields. */
export function courseEditorPatchPayload(
  draft: CourseDraft,
  external: boolean,
  base?: CourseDraft,
) {
  const { optionalFields, directCourseUrl, ...allFields } = draft;
  const fields = base
    ? Object.fromEntries(
        Object.entries(allFields).filter(([key, value]) => !equal(value, base[key])),
      )
    : allFields;
  const optional = object(optionalFields) ? optionalFields : {};
  const oldOptional = object(base?.optionalFields) ? base.optionalFields : {};
  return {
    ...fields,
    ...(!external && (!base || !equal(directCourseUrl, base.directCourseUrl))
      ? { directCourseUrl }
      : {}),
    ...(!external &&
    (!base || !equal(optional.withdrawalAccessPolicy, oldOptional.withdrawalAccessPolicy))
      ? { withdrawalAccessPolicy: optional.withdrawalAccessPolicy || null }
      : {}),
  };
}

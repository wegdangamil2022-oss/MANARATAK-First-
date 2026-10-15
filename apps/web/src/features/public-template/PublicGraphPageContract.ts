export type GraphPageRow = {
  ownerId?: string;
  contentId?: string;
  slug?: string;
  displayName?: string;
  sourceProgramName?: string;
  title?: string;
  labelLocale?: string;
  localeFallback?: boolean;
  contentType?: string;
  universityDisplayName?: string;
  universityLocaleFallback?: boolean;
  universitySlug?: string;
};
export type GraphCollectionScope = {
  state: 'AVAILABLE' | 'UNAVAILABLE' | 'NOT_INTEGRATED';
  total?: number | null;
  hasMore?: boolean;
  nextCursor?: string | null;
};
export type PublicRelationshipGraphPage = {
  subject: { ownerId: string; displayName: string };
  relationships: Record<string, GraphPageRow[] | { data: GraphPageRow[] }>;
  readScope: { collections: Record<string, GraphCollectionScope> };
};
export const graphCursorKeys: Record<string, string> = {
  universities: 'universityCursor',
  scholarships: 'scholarshipCursor',
  courses: 'courseCursor',
  preparationCourses: 'courseCursor',
  providerHeadquartersCourses: 'courseCursor',
  academicPrograms: 'programCursor',
  majors: 'majorCursor',
  editorialContent: 'editorialCursor',
  internationalTests: 'testCursor',
  careerJobs: 'careerCursor',
  services: 'serviceCursor',
  studentTools: 'toolCursor',
};
export function parsePublicRelationshipGraphPage(raw: unknown): PublicRelationshipGraphPage {
  const page = raw as PublicRelationshipGraphPage;
  if (
    !page ||
    typeof page.subject?.ownerId !== 'string' ||
    !page.subject.ownerId ||
    typeof page.subject.displayName !== 'string' ||
    !page.relationships ||
    !page.readScope?.collections
  )
    throw new Error('PUBLIC_GRAPH_RESPONSE_INVALID');
  for (const [key, value] of Object.entries(page.relationships)) {
    const rows = Array.isArray(value) ? value : value?.data,
      scope = page.readScope.collections[key];
    if (
      !graphCursorKeys[key] ||
      !Array.isArray(rows) ||
      rows.length > 50 ||
      rows.some(
        (row) =>
          !row ||
          typeof (row.ownerId ?? row.contentId ?? (row as { publicId?: string }).publicId) !==
            'string',
      ) ||
      !scope ||
      !['AVAILABLE', 'UNAVAILABLE', 'NOT_INTEGRATED'].includes(scope.state)
    )
      throw new Error('PUBLIC_GRAPH_RESPONSE_INVALID');
    if (
      scope.total !== null &&
      scope.total !== undefined &&
      (!Number.isSafeInteger(scope.total) || scope.total < 0)
    )
      throw new Error('PUBLIC_GRAPH_RESPONSE_INVALID');
    if (
      scope.hasMore &&
      (typeof scope.nextCursor !== 'string' || !scope.nextCursor || scope.nextCursor.length > 2048)
    )
      throw new Error('PUBLIC_GRAPH_RESPONSE_INVALID');
    if (scope.hasMore === false && scope.nextCursor != null)
      throw new Error('PUBLIC_GRAPH_RESPONSE_INVALID');
  }
  return page;
}
export function graphRowHref(edge: string, row: GraphPageRow, locale: 'ar' | 'en') {
  const slug = row.slug?.trim();
  if (!slug || slug.length > 240 || /[\\/\u0000-\u001f?#]/.test(slug)) return null;
  const route: Record<string, string> = {
    universities: 'universities',
    scholarships: 'scholarships',
    majors: 'majors',
    courses: 'courses',
    preparationCourses: 'courses',
    providerHeadquartersCourses: 'courses',
    internationalTests: 'international-tests',
    services: 'services',
    careerJobs: 'careers',
    studentTools: 'tools',
  };
  const cms: Record<string, string> = {
    NEWS: 'news',
    STUDY_GUIDE: 'study-guides',
    CHECKLIST: 'checklists',
    FAQ: 'faqs',
    STATIC_PAGE: 'pages',
    LANDING_PAGE: 'landing',
    ARTICLE: 'articles',
  };
  const prefix = edge === 'editorialContent' ? cms[row.contentType ?? ''] : route[edge];
  return prefix ? `/${locale}/${prefix}/${encodeURIComponent(slug)}` : null;
}

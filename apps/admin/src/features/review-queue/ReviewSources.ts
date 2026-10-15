export type ReviewDomain =
  'scholarships' | 'universities' | 'majors' | 'courses' | 'tests' | 'services' | 'cms' | 'careers' | 'study-destinations';
export type ReviewReason =
  | 'workflow_review'
  | 'incomplete'
  | 'ready_to_publish'
  | 'imported_unreviewed'
  | 'needs_translation'
  | 'source_verification'
  | 'broken_link'
  | 'import_review';
export type ReviewSource = {
  key: string;
  domain: ReviewDomain;
  reason: ReviewReason;
  endpoint: string;
  permissions: string[];
  params: Record<string, string>;
  path: string;
  targetType?: string;
  detail: boolean;
  imported?: boolean;
  maxPage?: number;
};
const owners = [
  [
    'scholarships',
    '/admin/scholarships',
    '/scholarships',
    'admin:scholarships:manage',
    'SCHOLARSHIP',
  ],
  [
    'universities',
    '/admin/universities',
    '/universities',
    'admin:universities:manage',
    'UNIVERSITY',
  ],
  ['majors', '/admin/majors', '/majors', 'admin:majors:manage', 'MAJOR'],
  ['courses', '/admin/courses', '/courses', 'admin:courses:manage', 'COURSE'],
  [
    'tests',
    '/admin/international-tests',
    '/international-tests',
    'admin:international-tests:manage',
    'INTERNATIONAL_TEST',
  ],
  ['services', '/admin/services', '/services', 'admin:services:manage', 'SERVICE'],
  ['cms', '/admin/cms/content', '/cms', 'admin:cms:view', 'CMS_CONTENT'],
] as const;
export const reviewSources: ReviewSource[] = owners.flatMap(
  ([domain, endpoint, path, permission, targetType]) => {
    const queries: Array<[ReviewReason, Record<string, string>]> = [
      ['workflow_review', { status: domain === 'cms' ? 'IN_REVIEW' : 'READY_TO_REVIEW' }],
      ['ready_to_publish', { status: 'READY_TO_PUBLISH' }],
    ];
    if (domain !== 'cms')
      queries.push(
        ['incomplete', { completenessStatus: 'INCOMPLETE' }],
        ['incomplete', { completenessStatus: 'NEEDS_REVIEW' }],
      );
    if (!['cms', 'services'].includes(domain))
      queries.push(['imported_unreviewed', { status: 'IMPORTED' }]);
    if (domain === 'tests') queries.push(['workflow_review', { status: 'NEEDS_REVIEW' }]);
    if (domain === 'scholarships')
      queries.push(
        ['needs_translation', { translationState: 'NEEDS_TRANSLATION' }],
        ['source_verification', { verificationStatus: 'PENDING' }],
        ['source_verification', { verificationStatus: 'FAILED' }],
      );
    return queries.map(([reason, params], index) => ({
      key: `${domain}:${reason}:${index}`,
      domain,
      endpoint,
      path,
      reason,
      targetType: domain === 'services' ? undefined : domain === 'cms' ? 'CmsContent' : targetType,
      permissions: [permission],
      params: domain === 'majors' ? { catalog: 'false', ...params } : params,
      detail: !['services', 'cms'].includes(domain),
      maxPage: domain === 'cms' ? 500 : domain === 'majors' ? 1000 : 10000,
    }));
  },
);
reviewSources.push({
  key: 'scholarships:import',
  domain: 'scholarships',
  reason: 'import_review',
  endpoint: '/admin/scholarships/import-center/review-page',
  permissions: ['admin:scholarships:manage', 'admin:imports:manage'],
  params: {},
  path: '/imports/scholarships',
  detail: false,
  imported: true,
  targetType: 'SCHOLARSHIP_IMPORT_RECORD',
});
reviewSources.push({
  key: 'courses:verification',
  domain: 'courses',
  reason: 'source_verification',
  endpoint: '/admin/courses/imported',
  permissions: ['admin:courses:manage'],
  params: {},
  path: '/courses',
  detail: true,
  imported: true,
  targetType: 'COURSE',
});
reviewSources.push({
  key: 'courses:broken',
  domain: 'courses',
  reason: 'broken_link',
  endpoint: '/admin/courses/imported',
  permissions: ['admin:courses:manage'],
  params: { linkHealth: 'BROKEN' },
  path: '/courses',
  detail: true,
  imported: true,
  targetType: 'COURSE',
});
for (const status of ['READY_TO_REVIEW', 'READY_TO_PUBLISH'])
  reviewSources.push({
    key: `careers:${status}`,
    domain: 'careers',
    reason: status === 'READY_TO_REVIEW' ? 'workflow_review' : 'ready_to_publish',
    endpoint: '/admin/careers/review-page',
    permissions: ['admin:careers:manage'],
    params: { status },
    path: '/careers',
    detail: false,
  });

// Destination workflow uses IN_REVIEW and a separate completeness state, not READY_TO_REVIEW.
for (const [reason, params] of [
  ['workflow_review', { status: 'IN_REVIEW' }],
  ['workflow_review', { status: 'DRAFT', completenessStatus: 'READY_FOR_REVIEW' }],
  ['ready_to_publish', { status: 'DRAFT', completenessStatus: 'READY_TO_PUBLISH' }],
  ['ready_to_publish', { status: 'IN_REVIEW', completenessStatus: 'READY_TO_PUBLISH' }],
  ['incomplete', { status: 'DRAFT', completenessStatus: 'INCOMPLETE' }],
  ['incomplete', { status: 'NO_PROFILE' }],
] as Array<[ReviewReason, Record<string, string>]>) {
  reviewSources.push({ key: `study-destinations:${reason}:${JSON.stringify(params)}`,
    domain: 'study-destinations', reason, endpoint: '/admin/study-destinations',
    permissions: ['admin:study-destinations:read'], params,
    path: '/study-destinations', targetType: 'COUNTRY_STUDY_PROFILE', detail: true,
  });
}

// No private application, student, financial, actor or recruiter projection is admitted.
export const unsupportedCoverage = [
  'certificates',
  'student-tools',
  'finance',
  'student-applications',
  'cms-translations',
  'ai-governance',
] as const;
export const domains = [...new Set(reviewSources.map((source) => source.domain))];
export const reasons = [...new Set(reviewSources.map((source) => source.reason))];
export function sourceAllowed(
  source: ReviewSource,
  hasPermission: (permission: string) => boolean,
): boolean {
  return source.permissions.every(hasPermission);
}

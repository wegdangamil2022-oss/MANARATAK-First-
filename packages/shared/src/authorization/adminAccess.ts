export const ADMIN_SECTIONS = [
  ['/dashboard', 'admin:platform:manage'],
  ['/scholarships', 'admin:scholarships:manage'],
  ['/universities', 'admin:universities:manage'],
  ['/majors', 'admin:majors:manage'],
  ['/international-tests', 'admin:international-tests:manage'],
  ['/courses/assigned', 'admin:courses:workspace'],
  ['/courses', 'admin:courses:manage'],
  ['/study-destinations', 'admin:study-destinations:read'],
  ['/translations', 'admin:cms:manage'],
  ['/cms', 'admin:cms:view'],
  ['/imports', 'admin:imports:manage'],
  ['/certificates', 'admin:certificates:view'],
  ['/notifications', 'admin:platform:manage'],
  ['/health-readiness', 'admin:platform:manage'],
  ['/review-queue', 'admin:platform:manage'],
  ['/services', 'admin:services:manage'],
  ['/finance', 'admin:finance:manage'],
  ['/careers', 'admin:careers:manage'],
  ['/ai', 'admin:ai:view'],
  ['/student-tools', 'admin:student-tools:manage'],
  ['/academic-taxonomy', 'admin:academic-taxonomy:manage'],
  ['/identities', 'admin:identities:manage'],
  ['/authorization', 'admin:authorization:manage'],
  ['/audit', 'admin:audit:manage'],
  ['/assets', 'admin:assets:manage'],
  ['/students', 'admin:students:support'],
  ['/student-document-reviews', 'admin:students:documents:review'],
  ['/settings/reference-data', 'admin:reference-data:manage'],
  ['/settings', 'admin:settings:manage'],
] as const;

export function grantsAdminPermission(
  permissions: readonly string[] = [],
  required: string,
): boolean {
  return permissions.some(
    (granted) =>
      granted === '*' ||
      granted === 'admin:*' ||
      granted === required ||
      (granted.endsWith(':*') && required.startsWith(granted.slice(0, -1))),
  );
}

export function grantsAdminSection(
  permissions: readonly string[],
  section: string,
  required: string,
): boolean {
  if (section === '/audit')
    return AUDIT_WORKSPACE_PERMISSIONS.some((permission) =>
      grantsAdminPermission(permissions, permission),
    );
  if (section === '/students')
    return SUPPORT_WORKSPACE_PERMISSIONS.some((permission) =>
      grantsAdminPermission(permissions, permission),
    );
  return section === '/services'
    ? [
        'admin:services:manage',
        'admin:services:requests:view',
        'admin:services:operations:manage',
      ].some((permission) => grantsAdminPermission(permissions, permission))
    : grantsAdminPermission(permissions, required);
}

export const AUDIT_WORKSPACE_PERMISSIONS = [
  'admin:audit:manage',
  'admin:audit:cases:view',
  'admin:audit:alerts:manage',
  'admin:audit:retention:manage',
] as const;
export const SUPPORT_WORKSPACE_PERMISSIONS = [
  'admin:students:support',
  'admin:students:support:cases:view',
  'admin:students:support:settings',
  'admin:students:support:metrics',
] as const;

export function firstAllowedAdminPath(permissions: readonly string[] = []): string | null {
  return (
    ADMIN_SECTIONS.find(([section, permission]) =>
      grantsAdminSection(permissions, section, permission),
    )?.[0] ?? null
  );
}

export function isAdministrativePath(path: string): boolean {
  return /^\/(?:ar\/|en\/)?admin(?:[/?#]|$)/i.test(path);
}

export function canAccessAdminPath(path: string, permissions: readonly string[] = []): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes('://'))
    return false;
  if (!isAdministrativePath(path)) return false;
  const rawPathname = path.split(/[?#]/, 1)[0];
  try {
    if (new URL(path, 'https://manaratak.invalid').pathname !== rawPathname) return false;
  } catch {
    return false;
  }
  const pathname = rawPathname.replace(/^\/(?:ar\/|en\/)?admin(?=\/|$)/i, '') || '/';
  if (pathname === '/') return firstAllowedAdminPath(permissions) !== null;
  const match = [...ADMIN_SECTIONS]
    .sort(([a], [b]) => b.length - a.length)
    .find(([section]) => pathname === section || pathname.startsWith(`${section}/`));
  return !!match && grantsAdminSection(permissions, match[0], match[1]);
}

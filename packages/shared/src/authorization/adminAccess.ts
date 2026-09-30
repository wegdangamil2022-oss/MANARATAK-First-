export const ADMIN_SECTIONS = [
  ['/dashboard', 'admin:platform:manage'],
  ['/scholarships', 'admin:scholarships:manage'],
  ['/universities', 'admin:universities:manage'],
  ['/majors', 'admin:majors:manage'],
  ['/international-tests', 'admin:international-tests:manage'],
  ['/courses', 'admin:courses:manage'],
  ['/study-destinations', 'admin:reference-data:manage'],
  ['/translations', 'admin:cms:manage'],
  ['/cms', 'admin:cms:manage'],
  ['/imports', 'admin:imports:manage'],
  ['/certificates', 'admin:certificates:view'],
  ['/notifications', 'admin:platform:manage'],
  ['/health-readiness', 'admin:platform:manage'],
  ['/review-queue', 'admin:platform:manage'],
  ['/services', 'admin:services:manage'],
  ['/finance', 'admin:finance:manage'],
  ['/careers', 'admin:careers:manage'],
  ['/ai', 'admin:ai:manage'],
  ['/student-tools', 'admin:student-tools:manage'],
  ['/academic-taxonomy', 'admin:academic-taxonomy:manage'],
  ['/authorization', 'admin:authorization:manage'],
  ['/audit', 'admin:audit:manage'],
  ['/assets', 'admin:assets:manage'],
  ['/students', 'admin:students:support'],
  ['/settings/reference-data', 'admin:reference-data:manage'],
  ['/settings', 'admin:settings:manage'],
] as const;

export function grantsAdminPermission(permissions: readonly string[] = [], required: string): boolean {
  return permissions.some(granted => granted === '*' || granted === 'admin:*' || granted === required ||
    (granted.endsWith(':*') && required.startsWith(granted.slice(0, -1))));
}

export function firstAllowedAdminPath(permissions: readonly string[] = []): string | null {
  return ADMIN_SECTIONS.find(([, permission]) => grantsAdminPermission(permissions, permission))?.[0] ?? null;
}

export function isAdministrativePath(path: string): boolean {
  return /^\/(?:ar\/|en\/)?admin(?:[/?#]|$)/i.test(path);
}

export function canAccessAdminPath(path: string, permissions: readonly string[] = []): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes('://')) return false;
  if (!isAdministrativePath(path)) return false;
  const rawPathname = path.split(/[?#]/, 1)[0];
  try {
    if (new URL(path, 'https://manaratak.invalid').pathname !== rawPathname) return false;
  } catch { return false; }
  const pathname = rawPathname.replace(/^\/(?:ar\/|en\/)?admin(?=\/|$)/i, '') || '/';
  if (pathname === '/') return firstAllowedAdminPath(permissions) !== null;
  const match = [...ADMIN_SECTIONS]
    .sort(([a], [b]) => b.length - a.length)
    .find(([section]) => pathname === section || pathname.startsWith(`${section}/`));
  return !!match && grantsAdminPermission(permissions, match[1]);
}

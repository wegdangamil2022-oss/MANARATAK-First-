import { ADMIN_SECTIONS } from '@absheer/shared';

type Section = typeof ADMIN_SECTIONS[number][0];
type Permission = typeof ADMIN_SECTIONS[number][1];
export const adminPaths = {
  referenceData: '/settings/reference-data',
  universities: '/universities',
  scholarships: '/scholarships',
  universityImport: '/imports/universities',
  scholarshipImport: '/imports/scholarships',
  destinations: '/study-destinations',
  reviewQueue: '/review-queue',
} as const;

const orderedSections = [...ADMIN_SECTIONS].sort(([a], [b]) => b.length - a.length);

/** Paths are relative to BrowserRouter's basename; API endpoints never pass through here. */
export function adminPathPermission(path: string): Permission | null {
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u001f]/.test(path)) return null;
  const pathname = path.split(/[?#]/, 1)[0];
  if (new URL(path, 'https://admin.invalid').pathname !== pathname) return null;
  return orderedSections.find(([section]) => pathname === section || pathname.startsWith(`${section}/`))?.[1] ?? null;
}

type Target = { path: Section; permission: Permission; idKind: 'OWNER_ID' | 'COUNTRY_ISO2' | 'COUNTRY_REFERENCE_ID' | 'LIST' | 'SEARCH_ID'; detailPath?: `${Section}/${string}`; query?: string };
export const adminTargets = {
  UNIVERSITY: { path: '/universities', permission: 'admin:universities:manage', idKind: 'OWNER_ID' },
  SCHOLARSHIP: { path: '/scholarships', permission: 'admin:scholarships:manage', idKind: 'OWNER_ID' },
  MAJOR: { path: '/majors', permission: 'admin:majors:manage', idKind: 'OWNER_ID' },
  INTERNATIONAL_TEST: { path: '/international-tests', permission: 'admin:international-tests:manage', idKind: 'OWNER_ID' },
  COURSE: { path: '/courses', permission: 'admin:courses:manage', idKind: 'OWNER_ID' },
  CERTIFICATE: { path: '/certificates', permission: 'admin:certificates:view', idKind: 'OWNER_ID' },
  STUDY_DESTINATION: { path: '/study-destinations', permission: 'admin:study-destinations:read', idKind: 'COUNTRY_ISO2' },
  COUNTRY_STUDY_PROFILE: { path: '/study-destinations', permission: 'admin:study-destinations:read', idKind: 'COUNTRY_REFERENCE_ID' },
  INVOICE: { path: '/finance', detailPath: '/finance/invoices', permission: 'admin:finance:manage', idKind: 'OWNER_ID' },
  IDENTITY: { path: '/identities', permission: 'admin:identities:manage', idKind: 'SEARCH_ID' },
  CmsContent: { path: '/cms', permission: 'admin:cms:view', idKind: 'LIST' },
  SERVICE: { path: '/services', permission: 'admin:services:manage', idKind: 'LIST' },
  CMS_CONTENT: { path: '/cms', permission: 'admin:cms:view', idKind: 'LIST' },
  CAREER_EMPLOYER: { path: '/careers', permission: 'admin:careers:manage', idKind: 'LIST', query: 'tab=employers' },
  EMPLOYER: { path: '/careers', permission: 'admin:careers:manage', idKind: 'LIST', query: 'tab=employers' },
  CAREER_JOB_POSTING: { path: '/careers', permission: 'admin:careers:manage', idKind: 'LIST', query: 'tab=jobs' },
  JOB_POSTING: { path: '/careers', permission: 'admin:careers:manage', idKind: 'LIST', query: 'tab=jobs' },
  ASSET: { path: '/assets', permission: 'admin:assets:manage', idKind: 'LIST' },
  ACADEMIC_PROGRAM: { path: '/universities', permission: 'admin:universities:manage', idKind: 'LIST' },
} as const satisfies Record<string, Target>;

export function adminTargetLink(type: string, id: string, can: (permission: string) => boolean): string | null {
  if (!id.trim() || id.length > 240 || /[\\/\u0000-\u001f?#]/.test(id)) return null;
  const target: Target | undefined = Object.hasOwn(adminTargets, type) ? adminTargets[type as keyof typeof adminTargets] : undefined;
  if (!target || !can(target.permission)) return null;
  if (target.idKind === 'OWNER_ID') return `${target.detailPath ?? target.path}/${encodeURIComponent(id)}`;
  if (target.idKind === 'SEARCH_ID') return `${target.path}?search=${encodeURIComponent(id)}`;
  if (target.idKind === 'COUNTRY_ISO2' && /^[A-Z]{2}$/.test(id)) return `${target.path}/${id}`;
  // Neither a country reference ID nor a profile UUID can address the ISO route. Use the owner's existing list.
  return target.path + (target.query ? `?${target.query}` : '');
}

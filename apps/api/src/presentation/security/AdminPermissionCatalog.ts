export const KNOWN_ADMIN_PERMISSIONS = [
  'admin:credentials:manage',
  'admin:identities:manage', 'admin:authorization:manage', 'admin:audit:manage', 'admin:assets:manage',
  'admin:imports:manage', 'admin:reference-data:manage', 'admin:academic-taxonomy:manage',
  'admin:international-tests:manage', 'admin:universities:manage', 'admin:majors:manage',
  'admin:scholarships:manage', 'admin:courses:manage', 'admin:certificates:view',
  'admin:certificates:templates:author', 'admin:certificates:templates:approve',
  'admin:certificates:lifecycle:manage', 'admin:certificates:issuers:manage',
  'admin:students:support', 'admin:students:support:mutate', 'admin:student-tools:manage',
  'admin:cms:manage', 'admin:services:manage', 'admin:finance:manage', 'admin:careers:manage',
  'admin:ai:manage', 'admin:settings:manage', 'admin:platform:manage',
] as const;

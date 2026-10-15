/** Opt-in read consumers use owner APIs, never a shared mutable catalog mirror. */
export const catalogLifecycleConsumers = [
  {
    consumer: 'PUBLIC_GRAPH',
    owners: [
      'UNIVERSITIES',
      'MAJORS',
      'TESTS',
      'SCHOLARSHIPS',
      'CMS',
      'COURSES',
      'SERVICES',
      'CAREERS',
      'REFERENCE',
    ],
    mode: 'LIVE_READ_AND_VISIBLE_REFRESH',
    refreshMs: 30000,
    automaticAliasTransfer: false,
  },
  {
    consumer: 'STUDENT_SAVED_ITEMS',
    owners: [
      'UNIVERSITIES',
      'MAJORS',
      'TESTS',
      'SCHOLARSHIPS',
      'CMS',
      'COURSES',
      'SERVICES',
      'CERTIFICATES',
      'STUDENT_TOOLS',
    ],
    mode: 'LIVE_OWNER_HYDRATION_AND_VISIBLE_REFRESH',
    refreshMs: 30000,
    automaticAliasTransfer: false,
  },
  {
    consumer: 'STUDENT_APPLICATIONS',
    owners: ['SCHOLARSHIPS'],
    mode: 'EXACT_CYCLE_READ_AND_BOUNDED_PULL',
    batchSize: 50,
    automaticAliasTransfer: false,
  },
  {
    consumer: 'APPLICATION_REMINDERS',
    owners: ['SCHOLARSHIPS'],
    mode: 'EXACT_CYCLE_RECHECK_BEFORE_DELIVERY',
    automaticAliasTransfer: false,
  },
  {
    consumer: 'CMS_NAVIGATION',
    owners: ['UNIVERSITIES', 'MAJORS', 'TESTS', 'SCHOLARSHIPS', 'COURSES', 'REFERENCE'],
    mode: 'OWNER_RECHECK_BEFORE_PUBLIC_PATH',
    automaticAliasTransfer: false,
  },
] as const;
export type CatalogReferenceReadStamp = {
  protocolVersion: 1;
  ownerId: string;
  publicId: string | null;
  version: string | null;
  effectiveAt: string | null;
  capturedAt: string;
  changeType: 'CURRENT' | 'UNAVAILABLE' | 'MERGED' | 'TOMBSTONE' | 'RESTORED';
  subject: string;
  consistency: 'LIVE_OWNER_READ';
  automaticAliasTransfer: false;
};
export function catalogReferenceReadStamp(
  input: Omit<
    CatalogReferenceReadStamp,
    'protocolVersion' | 'capturedAt' | 'consistency' | 'automaticAliasTransfer'
  >,
): CatalogReferenceReadStamp {
  return {
    ...input,
    protocolVersion: 1,
    capturedAt: new Date().toISOString(),
    consistency: 'LIVE_OWNER_READ',
    automaticAliasTransfer: false,
  };
}

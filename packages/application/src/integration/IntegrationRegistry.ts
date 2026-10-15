export type IntegrationReadStatus = 'SUPPORTED' | 'PARTIAL' | 'NOT_INTEGRATED' | 'RUNTIME_PENDING';
export const crossModuleIntegrationRegistry = [
  {
    section: 1,
    ownerDomain: 'IAM',
    canonicalKey: 'identityId',
    writeOwner: 'IAM',
    readStatus: 'SUPPORTED',
  },
  {
    section: 2,
    ownerDomain: 'AUDIT',
    canonicalKey: 'auditId',
    writeOwner: 'AUDIT',
    readStatus: 'SUPPORTED',
  },
  {
    section: 3,
    ownerDomain: 'ASSETS',
    canonicalKey: 'assetId+ownerId',
    writeOwner: 'ASSETS',
    readStatus: 'SUPPORTED',
  },
  {
    section: 4,
    ownerDomain: 'SETTINGS',
    canonicalKey: 'settingKey',
    writeOwner: 'SETTINGS',
    readStatus: 'RUNTIME_PENDING',
  },
  {
    section: 5,
    ownerDomain: 'IMPORT',
    canonicalKey: 'recordId+sourceIdentity',
    writeOwner: 'IMPORT',
    readStatus: 'SUPPORTED',
  },
  {
    section: 6,
    ownerDomain: 'REFERENCE',
    canonicalKey: 'ownerId+iso2Code',
    writeOwner: 'REFERENCE',
    readStatus: 'SUPPORTED',
  },
  {
    section: 7,
    ownerDomain: 'TAXONOMY',
    canonicalKey: 'taxonomyNodeId',
    writeOwner: 'TAXONOMY',
    readStatus: 'SUPPORTED',
  },
  {
    section: 8,
    ownerDomain: 'TESTS',
    canonicalKey: 'testId+versionId+variantId',
    writeOwner: 'TESTS',
    readStatus: 'SUPPORTED',
  },
  {
    section: 9,
    ownerDomain: 'MAJORS',
    canonicalKey: 'majorId+profileId',
    writeOwner: 'MAJORS',
    readStatus: 'SUPPORTED',
  },
  {
    section: 10,
    ownerDomain: 'UNIVERSITIES',
    canonicalKey: 'universityId+programId',
    writeOwner: 'UNIVERSITIES',
    readStatus: 'SUPPORTED',
  },
  {
    section: 11,
    ownerDomain: 'SCHOLARSHIPS',
    canonicalKey: 'scholarshipId+revision',
    writeOwner: 'SCHOLARSHIPS',
    readStatus: 'SUPPORTED',
  },
  {
    section: 12,
    ownerDomain: 'COUNTRY_GRAPH',
    canonicalKey: 'countryReferenceId',
    writeOwner: 'REFERENCE',
    readStatus: 'PARTIAL',
  },
  {
    section: 13,
    ownerDomain: 'COURSES',
    canonicalKey: 'courseId+version',
    writeOwner: 'COURSES',
    readStatus: 'SUPPORTED',
  },
  {
    section: 14,
    ownerDomain: 'CERTIFICATES',
    canonicalKey: 'certificateId+immutableEvidence',
    writeOwner: 'CERTIFICATES',
    readStatus: 'SUPPORTED',
  },
  {
    section: 15,
    ownerDomain: 'STUDENTS',
    canonicalKey: 'studentReferenceId+ownerId',
    writeOwner: 'STUDENTS',
    readStatus: 'PARTIAL',
  },
  {
    section: 16,
    ownerDomain: 'CMS',
    canonicalKey: 'contentId+locale+version',
    writeOwner: 'CMS',
    readStatus: 'SUPPORTED',
  },
  {
    section: 17,
    ownerDomain: 'LOCALIZATION',
    canonicalKey: 'ownerId+locale+publishedVersion',
    writeOwner: 'LOCALIZATION',
    readStatus: 'PARTIAL',
  },
  {
    section: 18,
    ownerDomain: 'AI',
    canonicalKey: 'operatorId+policyVersion',
    writeOwner: 'AI',
    readStatus: 'RUNTIME_PENDING',
  },
  {
    section: 19,
    ownerDomain: 'STUDENT_TOOLS',
    canonicalKey: 'toolId+studentReferenceId',
    writeOwner: 'STUDENT_TOOLS',
    readStatus: 'NOT_INTEGRATED',
  },
  {
    section: 20,
    ownerDomain: 'FINANCE',
    canonicalKey: 'financialRecordId+idempotencyKey',
    writeOwner: 'FINANCE',
    readStatus: 'RUNTIME_PENDING',
  },
  {
    section: 21,
    ownerDomain: 'SERVICES',
    canonicalKey: 'serviceId+requestId',
    writeOwner: 'SERVICES',
    readStatus: 'PARTIAL',
  },
  {
    section: 22,
    ownerDomain: 'CAREERS',
    canonicalKey: 'jobId+version',
    writeOwner: 'CAREERS',
    readStatus: 'SUPPORTED',
  },
  {
    section: 23,
    ownerDomain: 'NOTIFICATIONS',
    canonicalKey: 'intentId+ownerVersion',
    writeOwner: 'NOTIFICATIONS',
    readStatus: 'RUNTIME_PENDING',
  },
  {
    section: 24,
    ownerDomain: 'REVIEW_QUEUE',
    canonicalKey: 'domain+kind+ownerId+signal',
    writeOwner: 'SOURCE_OWNER_ONLY',
    readStatus: 'PARTIAL',
  },
  {
    section: 25,
    ownerDomain: 'HEALTH',
    canonicalKey: 'releaseRevision+probeVersion',
    writeOwner: 'SOURCE_OWNER_ONLY',
    readStatus: 'RUNTIME_PENDING',
  },
  {
    section: 26,
    ownerDomain: 'DASHBOARD',
    canonicalKey: 'ownerQuery+capturedAt',
    writeOwner: 'SOURCE_OWNER_ONLY',
    readStatus: 'PARTIAL',
  },
] as const;
export const integrationEdges = [
  {
    from: 'UNIVERSITIES',
    to: 'MAJORS',
    canonicalKey: 'programId+majorId+degreeLevelId',
    publicPolicy: 'ACTIVE_MAPPED_PUBLISHED_PROFILE',
    consumerRoutes: [
      '/public/graph/universities/:slug',
      '/public/graph/majors/:slug',
      '/public/graph/countries/:iso2Code',
    ],
    test: 'section27:program-parity',
  },
  {
    from: 'SCHOLARSHIPS',
    to: 'UNIVERSITIES',
    canonicalKey: 'universityId+academicProgramId',
    publicPolicy: 'VERIFIED_OWNER_AND_CANONICAL_PARENT',
    consumerRoutes: ['/public/graph/scholarships/:slug', '/public/graph/universities/:slug'],
    test: 'section27:program-parent',
  },
  {
    from: 'STUDENTS',
    to: 'SCHOLARSHIPS',
    canonicalKey: 'studentReferenceId+scholarshipId+cycleReferenceId',
    publicPolicy: 'PUBLIC_CANONICAL_CYCLE_NEW_WRITE_LEGACY_HISTORY_ONLY',
    consumerRoutes: ['/student'],
    test: 'section27:student-owner',
  },
  {
    from: 'TESTS',
    to: 'STUDENT_TOOLS',
    canonicalKey: 'testId',
    publicPolicy: 'NOT_INTEGRATED',
    consumerRoutes: [],
    test: 'section27:unsupported',
  },
  {
    from: 'TESTS',
    to: 'SERVICES',
    canonicalKey: 'testId',
    publicPolicy: 'NOT_INTEGRATED',
    consumerRoutes: [],
    test: 'section27:unsupported',
  },
] as const;
export function validateIntegrationRegistry(): void {
  if (
    crossModuleIntegrationRegistry.length !== 26 ||
    new Set(crossModuleIntegrationRegistry.map((row) => row.section)).size !== 26
  )
    throw new Error('INTEGRATION_OWNER_COVERAGE_INVALID');
  for (const row of crossModuleIntegrationRegistry)
    if (
      !row.canonicalKey ||
      !row.writeOwner ||
      !['SUPPORTED', 'PARTIAL', 'NOT_INTEGRATED', 'RUNTIME_PENDING'].includes(row.readStatus)
    )
      throw new Error('INTEGRATION_CONTRACT_INVALID');
  const names = new Set<string>(crossModuleIntegrationRegistry.map((row) => row.ownerDomain));
  for (const edge of integrationEdges)
    if (!names.has(edge.from) || !names.has(edge.to) || !edge.canonicalKey || !edge.test)
      throw new Error('INTEGRATION_EDGE_OWNER_INVALID');
}

import { describe, expect, it, vi } from 'vitest';
import { studyDestinationFingerprint } from '@manaratak/application';
import { Prisma } from '@prisma/client';
import { CmsDomainTargetType } from '@manaratak/domain';
import { PrismaCmsDomainOwnerReadGateway } from '../../src/cms/PrismaCmsDomainOwnerReadGateway';

const published = (value: unknown) => ({
  findFirst: vi.fn().mockResolvedValue(value),
  findUnique: vi.fn().mockResolvedValue({ slug: 'sample-university' }),
});
const program = () => ({
  id: 'ap',
  status: 'ACTIVE',
  majorMappingState: 'CANONICALLY_MAPPED',
  majorId: 'major',
  degreeLevelId: 'bachelor',
  major: {
    status: 'PUBLISHED',
    levelProfiles: [
      { id: 'profile', degreeLevelId: 'bachelor', status: 'PUBLISHED', currentPublishedVersionId: 'version',
        currentPublishedVersion: { id: 'version', majorId: 'major', profileId: 'profile', status: 'PUBLISHED' } },
    ],
  },
});
const destination = () => {
  const now = new Date();
  const profile = {
    id: 'destination',
    publicId: 'std-CA',
    slug: 'canada',
    countryReferenceId: 'country-id',
    revision: 1,
    status: 'PUBLISHED',
    completenessStatus: 'COMPLETE',
    overviewAr: 'نبذة',
    overviewEn: 'Overview',
    studySystemSummaryAr: 'نظام',
    studySystemSummaryEn: 'System',
    admissionHighlightsAr: ['قبول'],
    admissionHighlightsEn: ['Admission'],
    visaSummaryAr: 'تأشيرة',
    visaSummaryEn: 'Visa',
    visaRequirementsAr: ['جواز'],
    visaRequirementsEn: ['Passport'],
    visaOfficialUrl: 'https://education.gov.ca/visa',
    livingCostTier: 'LOW',
    averageMonthlyLivingCostMin: 100,
    averageMonthlyLivingCostMax: 200,
    livingCostCurrencyReferenceId: 'currency',
    studyLanguageReferenceIds: ['language'],
    cityReferenceIds: [],
    costHighlightsAr: [],
    costHighlightsEn: [],
    studentLifeHighlightsAr: [],
    studentLifeHighlightsEn: [],
    officialLinks: [
      {
        labelAr: 'الجهة',
        labelEn: 'Authority',
        url: 'https://education.gov.ca',
        category: 'GOVERNMENT_STUDY',
      },
    ],
    evidenceSources: [
      { label: 'Authority', url: 'https://education.gov.ca/evidence', sourceType: 'GOVERNMENT' },
    ],
    sourceVerificationStatus: 'VERIFIED',
    sourceAuditDate: now.toISOString(),
    imageAssetId: null,
    isFeatured: false,
    governance: {
      lastEditorId: 'author',
      proof: {
        authorId: 'author',
        reviewerId: 'reviewer',
        reviewedRevision: 1,
        reviewedAt: now.toISOString(),
        reason: 'Independent review',
        fingerprint: '',
        authorities: [
          {
            origin: 'https://education.gov.ca',
            authorityName: 'Authority',
            evidenceUrl: 'https://education.gov.ca/about',
          },
        ],
      },
    },
  };
  profile.governance.proof.fingerprint = studyDestinationFingerprint(profile as any);
  return {
    ...profile,
    sourceAuditDate: now,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    averageMonthlyLivingCostMin: new Prisma.Decimal(100),
    averageMonthlyLivingCostMax: new Prisma.Decimal(200),
    studyLanguages: [{ languageReferenceId: 'language' }],
  };
};
const mockDb = () => ({
  university: published({ id: 'u' }),
  universityAcademicProgram: published(program()),
  major: published({ id: 'm' }),
  scholarship: published({ id: 's' }),
  internationalTest: published({ currentPublishedVersionId: 'v' }),
  internationalTestPublicationSnapshot: published({ id: 'v' }),
  course: published({ id: 'c' }),
  referenceCountry: published({ id: 'rc' }),
});

describe('P16 canonical owner publication gateway', () => {
  it('accepts each supported published owner without a CMS data copy', async () => {
    const db = mockDb();
    const gateway = new PrismaCmsDomainOwnerReadGateway(db);
    for (const type of Object.values(CmsDomainTargetType)) {
      await expect(gateway.assertPublished(type, 'valid-id')).resolves.toBeUndefined();
    }
    expect(db.scholarship.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          publicationStatus: 'PUBLISHED',
          verificationStatus: 'VERIFIED',
          versions: { some: { status: 'PUBLISHED' } },
        }),
      }),
    );
    expect(db.universityAcademicProgram.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          university: { is: { status: 'PUBLISHED' } },
          major: { is: { status: 'PUBLISHED' } },
        }),
      }),
    );
  });

  it('rejects missing, draft, archived or privately scoped targets at the owner boundary', async () => {
    const db = mockDb();
    db.university.findFirst.mockResolvedValue(null);
    db.scholarship.findFirst.mockResolvedValue(null);
    db.referenceCountry.findFirst.mockResolvedValue(null);
    const gateway = new PrismaCmsDomainOwnerReadGateway(db);
    for (const type of [
      CmsDomainTargetType.UNIVERSITY,
      CmsDomainTargetType.SCHOLARSHIP,
      CmsDomainTargetType.REFERENCE_COUNTRY,
    ]) {
      await expect(gateway.assertPublished(type, 'not-public')).rejects.toThrow(
        'CMS_DOMAIN_OWNER_TARGET_NOT_PUBLIC',
      );
    }
  });

  it('requires an existing immutable published snapshot for international tests', async () => {
    const db = mockDb();
    db.internationalTestPublicationSnapshot.findFirst.mockResolvedValue(null);
    const gateway = new PrismaCmsDomainOwnerReadGateway(db);
    await expect(
      gateway.assertPublished(CmsDomainTargetType.INTERNATIONAL_TEST, 'test-1'),
    ).rejects.toThrow('CMS_DOMAIN_OWNER_TARGET_NOT_PUBLIC');
    expect(db.internationalTestPublicationSnapshot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'v', testId: 'test-1' },
      }),
    );
  });

  it('resolves a published canonical owner slug as a locale-prefixed public navigation path', async () => {
    const db = mockDb();
    const gateway = new PrismaCmsDomainOwnerReadGateway(db);
    await expect(
      gateway.resolvePublicPath(CmsDomainTargetType.UNIVERSITY, 'owner-1', 'en'),
    ).resolves.toBe('/en/universities/sample-university');
    expect(db.university.findUnique).toHaveBeenCalledWith({
      where: { id: 'owner-1' },
      select: { slug: true },
    });
  });

  it('uses the published study destination owner for country navigation, not a guessed country slug', async () => {
    const db = {
      ...mockDb(),
      studyDestinationProfile: { findFirst: vi.fn().mockResolvedValue(destination()) },
    };
    const gateway = new PrismaCmsDomainOwnerReadGateway(db);
    await expect(
      gateway.resolvePublicPath(CmsDomainTargetType.REFERENCE_COUNTRY, 'country-id', 'en'),
    ).resolves.toBe('/en/countries/canada');
    expect(db.studyDestinationProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          countryReferenceId: 'country-id',
          status: 'PUBLISHED',
          countryReference: { isActive: true, lifecycleState: 'ACTIVE' },
        },
      }),
    );
    db.studyDestinationProfile.findFirst.mockResolvedValue(null);
    await expect(
      gateway.resolvePublicPath(CmsDomainTargetType.REFERENCE_COUNTRY, 'country-id', 'en'),
    ).rejects.toThrow('CMS_NAVIGATION_TARGET_NOT_PUBLISHED');
  });

  it.each([
    'missing-proof',
    'stale-review',
    'changed-content',
    'self-review',
    'unapproved-authority',
  ])('rejects country navigation with %s even when its status is PUBLISHED', async (kind) => {
    const row: any = destination();
    if (kind === 'missing-proof') row.governance.proof = null;
    if (kind === 'stale-review') row.governance.proof.reviewedAt = '2000-01-01T00:00:00.000Z';
    if (kind === 'changed-content') row.overviewEn = 'Unreviewed change';
    if (kind === 'self-review') row.governance.proof.reviewerId = 'author';
    if (kind === 'unapproved-authority') row.governance.proof.authorities = [];
    const db = {
      ...mockDb(),
      studyDestinationProfile: { findFirst: vi.fn().mockResolvedValue(row) },
    };
    await expect(
      new PrismaCmsDomainOwnerReadGateway(db).resolvePublicPath(
        CmsDomainTargetType.REFERENCE_COUNTRY,
        'country-id',
        'en',
      ),
    ).rejects.toThrow('CMS_NAVIGATION_TARGET_NOT_PUBLISHED');
  });

  it.each(['other-degree', 'no-version', 'unpublished'])(
    'rejects a mapped program whose matching major profile is %s',
    async (kind) => {
      const row = program();
      if (kind === 'other-degree') row.major.levelProfiles[0].degreeLevelId = 'master';
      if (kind === 'no-version') row.major.levelProfiles[0].currentPublishedVersionId = '';
      if (kind === 'unpublished') row.major.levelProfiles[0].status = 'DRAFT';
      const db = mockDb();
      db.universityAcademicProgram.findFirst.mockResolvedValue(row);
      await expect(
        new PrismaCmsDomainOwnerReadGateway(db).assertPublished(
          CmsDomainTargetType.ACADEMIC_PROGRAM,
          'ap',
        ),
      ).rejects.toThrow('CMS_DOMAIN_OWNER_TARGET_NOT_PUBLIC');
    },
  );

  it('rejects owner kinds without a supported public detail route', async () => {
    const gateway = new PrismaCmsDomainOwnerReadGateway(mockDb());
    await expect(
      gateway.resolvePublicPath(CmsDomainTargetType.ACADEMIC_PROGRAM, 'owner-1', 'ar'),
    ).rejects.toThrow('CMS_NAVIGATION_DOMAIN_ROUTE_UNSUPPORTED');
  });

  it('rejects unknown target types instead of accepting arbitrary UUIDs', async () => {
    const gateway = new PrismaCmsDomainOwnerReadGateway(mockDb());
    await expect(gateway.assertPublished('OTHER' as CmsDomainTargetType, 'any')).rejects.toThrow(
      'CMS_DOMAIN_TARGET_TYPE_UNSUPPORTED',
    );
  });
});

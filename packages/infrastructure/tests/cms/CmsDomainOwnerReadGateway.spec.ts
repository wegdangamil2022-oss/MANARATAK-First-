import { describe, expect, it, vi } from 'vitest';
import { CmsDomainTargetType } from '@manaratak/domain';
import { PrismaCmsDomainOwnerReadGateway } from '../../src/cms/PrismaCmsDomainOwnerReadGateway';

const published = (value: unknown) => ({ findFirst: vi.fn().mockResolvedValue(value) });
const mockDb = () => ({
  university: published({ id: 'u' }),
  universityAcademicProgram: published({ id: 'ap' }),
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
    expect(db.scholarship.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        publicationStatus: 'PUBLISHED', verificationStatus: 'VERIFIED',
        versions: { some: { status: 'PUBLISHED' } },
      }),
    }));
    expect(db.universityAcademicProgram.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        university: { is: { status: 'PUBLISHED' } },
        major: { is: { status: 'PUBLISHED' } },
      }),
    }));
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
      await expect(gateway.assertPublished(type, 'not-public')).rejects.toThrow('CMS_DOMAIN_OWNER_TARGET_NOT_PUBLIC');
    }
  });

  it('requires an existing immutable published snapshot for international tests', async () => {
    const db = mockDb();
    db.internationalTestPublicationSnapshot.findFirst.mockResolvedValue(null);
    const gateway = new PrismaCmsDomainOwnerReadGateway(db);
    await expect(gateway.assertPublished(CmsDomainTargetType.INTERNATIONAL_TEST, 'test-1'))
      .rejects.toThrow('CMS_DOMAIN_OWNER_TARGET_NOT_PUBLIC');
    expect(db.internationalTestPublicationSnapshot.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'v', testId: 'test-1' },
    }));
  });

  it('rejects unknown target types instead of accepting arbitrary UUIDs', async () => {
    const gateway = new PrismaCmsDomainOwnerReadGateway(mockDb());
    await expect(gateway.assertPublished('OTHER' as CmsDomainTargetType, 'any'))
      .rejects.toThrow('CMS_DOMAIN_TARGET_TYPE_UNSUPPORTED');
  });
});

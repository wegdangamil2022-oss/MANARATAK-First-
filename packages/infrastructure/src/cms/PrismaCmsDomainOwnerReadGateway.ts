import { CmsDomainTargetType } from '@manaratak/domain';

/**
 * P16 only reads canonical P7/P9/P10/P12/P13 records. No CMS mirror, owner
 * publication writes, or generic UUID-existence shortcut is permitted.
 * The transaction-bound client shares CMS's serializable mutation snapshot.
 */
export class PrismaCmsDomainOwnerReadGateway {
  public constructor(private readonly db: any) {}

  public async assertPublished(targetType: CmsDomainTargetType, targetId: string): Promise<void> {
    let found: unknown;
    switch (targetType) {
      case CmsDomainTargetType.UNIVERSITY:
        found = await this.db.university.findFirst({
          where: { id: targetId, status: 'PUBLISHED' }, select: { id: true },
        });
        break;
      case CmsDomainTargetType.ACADEMIC_PROGRAM:
        found = await this.db.universityAcademicProgram.findFirst({
          where: {
            id: targetId, status: 'ACTIVE',
            majorMappingState: 'CANONICALLY_MAPPED',
            majorId: { not: null }, degreeLevelId: { not: null },
            major: { is: { status: 'PUBLISHED' } },
            university: { is: { status: 'PUBLISHED' } },
          },
          select: { id: true },
        });
        break;
      case CmsDomainTargetType.MAJOR:
        found = await this.db.major.findFirst({
          where: { id: targetId, status: 'PUBLISHED' }, select: { id: true },
        });
        break;
      case CmsDomainTargetType.SCHOLARSHIP:
        found = await this.db.scholarship.findFirst({
          where: {
            id: targetId, status: 'PUBLISHED', publicationStatus: 'PUBLISHED',
            verificationStatus: 'VERIFIED', completenessStatus: 'COMPLETE',
            versions: { some: { status: 'PUBLISHED' } },
          },
          select: { id: true },
        });
        break;
      case CmsDomainTargetType.INTERNATIONAL_TEST: {
        const test = await this.db.internationalTest.findFirst({
          where: { id: targetId, isPubliclyVisible: true, currentPublishedVersionId: { not: null } },
          select: { currentPublishedVersionId: true },
        });
        found = test?.currentPublishedVersionId
          ? await this.db.internationalTestPublicationSnapshot.findFirst({
              where: { id: test.currentPublishedVersionId, testId: targetId },
              select: { id: true },
            })
          : null;
        break;
      }
      case CmsDomainTargetType.COURSE:
        found = await this.db.course.findFirst({
          where: {
            id: targetId, status: 'PUBLISHED', completenessStatus: 'COMPLETE',
            OR: [
              { originType: { not: 'EXTERNAL_LINKED_COURSE' } },
              {
                originType: 'EXTERNAL_LINKED_COURSE',
                accessType: 'FREE_STUDY_AND_CERTIFICATE',
                isStudyFree: true, isFreeCertificate: true,
              },
            ],
          },
          select: { id: true },
        });
        break;
      case CmsDomainTargetType.REFERENCE_COUNTRY:
        found = await this.db.referenceCountry.findFirst({
          where: { id: targetId, isActive: true, lifecycleState: 'ACTIVE' },
          select: { id: true },
        });
        break;
      default:
        throw new Error('CMS_DOMAIN_TARGET_TYPE_UNSUPPORTED');
    }
    if (!found) throw new Error('CMS_DOMAIN_OWNER_TARGET_NOT_PUBLIC');
  }
}

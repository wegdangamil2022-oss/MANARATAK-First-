import { Prisma } from '@prisma/client';
import { CmsDomainTargetType, isPublicUniversityProgram } from '@manaratak/domain';
import { StudyDestinationUseCases } from '@manaratak/application';
import { PrismaStudyDestinationRepository } from '../study-destinations/PrismaStudyDestinationRepository';

/**
 * P16 only reads canonical P7/P9/P10/P12/P13 records. No CMS mirror, owner
 * publication writes, or generic UUID-existence shortcut is permitted.
 * The transaction-bound client shares CMS's serializable mutation snapshot.
 */
type CmsOwnerReadClient = Pick<
  Prisma.TransactionClient,
  | 'university'
  | 'universityAcademicProgram'
  | 'major'
  | 'scholarship'
  | 'internationalTest'
  | 'internationalTestPublicationSnapshot'
  | 'course'
  | 'referenceCountry'
  | 'studyDestinationProfile'
>;

export class PrismaCmsDomainOwnerReadGateway {
  public constructor(private readonly db: CmsOwnerReadClient) {}

  /**
   * Navigation targets use TYPE:<canonical-owner-UUID> and resolve to a real
   * locale-prefixed public path. Academic programs have no dedicated public
   * detail route, so they intentionally cannot become nav destinations yet.
   */
  public async resolvePublicPath(
    targetType: CmsDomainTargetType,
    targetId: string,
    locale: string,
  ): Promise<string> {
    if (locale !== 'ar' && locale !== 'en') throw new Error('CMS_NAVIGATION_LOCALE_UNSUPPORTED');
    const routes: Partial<
      Record<
        CmsDomainTargetType,
        {
          read: (id: string) => PromiseLike<{ slug: string } | null>;
          segment: string;
        }
      >
    > = {
      [CmsDomainTargetType.UNIVERSITY]: {
        read: (id) => this.db.university.findUnique({ where: { id }, select: { slug: true } }),
        segment: 'universities',
      },
      [CmsDomainTargetType.MAJOR]: {
        read: (id) => this.db.major.findUnique({ where: { id }, select: { slug: true } }),
        segment: 'majors',
      },
      [CmsDomainTargetType.SCHOLARSHIP]: {
        read: (id) => this.db.scholarship.findUnique({ where: { id }, select: { slug: true } }),
        segment: 'scholarships',
      },
      [CmsDomainTargetType.INTERNATIONAL_TEST]: {
        read: (id) =>
          this.db.internationalTest.findUnique({ where: { id }, select: { slug: true } }),
        segment: 'international-tests',
      },
      [CmsDomainTargetType.COURSE]: {
        read: (id) => this.db.course.findUnique({ where: { id }, select: { slug: true } }),
        segment: 'courses',
      },
    };
    if (targetType === CmsDomainTargetType.REFERENCE_COUNTRY) {
      await this.assertPublished(targetType, targetId);
      const profile = await this.db.studyDestinationProfile.findFirst({
        where: {
          countryReferenceId: targetId,
          status: 'PUBLISHED',
          countryReference: { isActive: true, lifecycleState: 'ACTIVE' },
        },
        include: { studyLanguages: true },
      });
      if (
        !profile ||
        typeof profile.slug !== 'string' ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.slug)
      ) {
        throw new Error('CMS_NAVIGATION_TARGET_NOT_PUBLISHED');
      }
      // Reuse the destination owner's exact fingerprint, independent-review,
      // freshness and authority rules. A PUBLISHED marker alone is insufficient.
      try {
        StudyDestinationUseCases.assertApprovedProfile(
          PrismaStudyDestinationRepository.toProfile(profile),
        );
      } catch {
        throw new Error('CMS_NAVIGATION_TARGET_NOT_PUBLISHED');
      }
      return `/${locale}/countries/${profile.slug}`;
    }
    const config = routes[targetType];
    if (!config) throw new Error('CMS_NAVIGATION_DOMAIN_ROUTE_UNSUPPORTED');
    await this.assertPublished(targetType, targetId);
    const row = await config.read(targetId);
    const slug = row?.slug;
    if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error('CMS_NAVIGATION_DOMAIN_SLUG_INVALID');
    }
    return `/${locale}/${config.segment}/${slug}`;
  }

  public async assertPublished(targetType: CmsDomainTargetType, targetId: string): Promise<void> {
    let found: unknown;
    switch (targetType) {
      case CmsDomainTargetType.UNIVERSITY:
        found = await this.db.university.findFirst({
          where: { id: targetId, status: 'PUBLISHED' },
          select: { id: true },
        });
        break;
      case CmsDomainTargetType.ACADEMIC_PROGRAM: {
        const program = await this.db.universityAcademicProgram.findFirst({
          where: {
            id: targetId,
            status: 'ACTIVE',
            majorMappingState: 'CANONICALLY_MAPPED',
            majorId: { not: null },
            degreeLevelId: { not: null },
            major: { is: { status: 'PUBLISHED' } },
            university: { is: { status: 'PUBLISHED' } },
          },
          select: {
            id: true,
            status: true,
            majorMappingState: true,
            majorId: true,
            degreeLevelId: true,
            major: {
              select: {
                status: true,
                levelProfiles: {
                  select: {
                    degreeLevelId: true,
                    status: true,
                    currentPublishedVersionId: true,
                  },
                },
              },
            },
          },
        });
        found = program && isPublicUniversityProgram(program) ? program : null;
        break;
      }
      case CmsDomainTargetType.MAJOR:
        found = await this.db.major.findFirst({
          where: { id: targetId, status: 'PUBLISHED' },
          select: { id: true },
        });
        break;
      case CmsDomainTargetType.SCHOLARSHIP:
        found = await this.db.scholarship.findFirst({
          where: {
            id: targetId,
            status: 'PUBLISHED',
            publicationStatus: 'PUBLISHED',
            verificationStatus: 'VERIFIED',
            completenessStatus: 'COMPLETE',
            versions: { some: { status: 'PUBLISHED' } },
          },
          select: { id: true },
        });
        break;
      case CmsDomainTargetType.INTERNATIONAL_TEST: {
        const test = await this.db.internationalTest.findFirst({
          where: {
            id: targetId,
            isPubliclyVisible: true,
            currentPublishedVersionId: { not: null },
          },
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
            id: targetId,
            status: 'PUBLISHED',
            completenessStatus: 'COMPLETE',
            OR: [
              { originType: { not: 'EXTERNAL_LINKED_COURSE' } },
              {
                originType: 'EXTERNAL_LINKED_COURSE',
                accessType: 'FREE_STUDY_AND_CERTIFICATE',
                isStudyFree: true,
                isFreeCertificate: true,
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

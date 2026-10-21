import {
  ICmsRepository,
  ICourseRepository,
  IInternationalTestRepository,
  IMajorRepository,
  IScholarshipRepository,
  IServiceCatalogRepository,
  IStudentSavedItemHydrationGateway,
  IUniversityRepository,
  MajorStatus,
  isPublicScholarshipOwner,
  ServiceStatus,
  CourseStatus,
  StudentSavedItemDto,
  StudentSavedItemType,
  UniversityStatus,
} from '@manaratak/domain';

/** Existing private history may only resolve the same immutable owner identity. Slug resolution is explicit for a new save. */
function matchesSavedIdentity(item:StudentSavedItemDto,owner:{id:string;publicId?:unknown},context?:'CANONICALIZE_NEW_SAVE'){
  return context==='CANONICALIZE_NEW_SAVE'||owner.id===item.entityId||(typeof owner.publicId==='string'&&owner.publicId===item.entityId);
}

export class MajorStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly majors: IMajorRepository) {}
  supports(entityType: StudentSavedItemType): boolean {
    return entityType === StudentSavedItemType.MAJOR;
  }
  async hydrate(item: StudentSavedItemDto,context?:'CANONICALIZE_NEW_SAVE') {
    const path = (item.entitySlug ?? item.entityId).split('/');
    const major =
      (await this.majors.findById(item.entityId)) ??
      (await this.majors.findByPublicId?.(item.entityId)) ?? (await this.majors.findBySlug(path[0]));
    if (!major||!matchesSavedIdentity(item,major,context)) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    const profiles = (await this.majors.listLevelProfiles?.(major.id)) ?? major.profiles ?? [];
    const profile = path[1]
      ? profiles.find((row) => row.level.toLowerCase() === path[1].toLowerCase())
      : undefined;
    const available = path[1]
      ? Boolean(profile?.status === MajorStatus.PUBLISHED && profile.currentPublishedVersionId)
      : major.status === MajorStatus.PUBLISHED;
    return {
      ownerType: item.entityType,
      ownerId: major.id,
      publicId: profile?.code ?? major.publicId,
      slug: profile ? `${major.slug}/${profile.level.toLowerCase()}` : major.slug,
      displayName: profile?.localizedNameAr || profile?.displayName || major.displayName,
      lifecycleStatus: profile?.status ?? major.status,
      available,
    };
  }
}

export class UniversityStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly universities: IUniversityRepository) {}
  supports(entityType: StudentSavedItemType): boolean {
    return entityType === StudentSavedItemType.UNIVERSITY;
  }
  async hydrate(item: StudentSavedItemDto,context?:'CANONICALIZE_NEW_SAVE') {
    const university =
      (await this.universities.findPublishedByIds?.([item.entityId]))?.[0] ??
      (await this.universities.findPublishedByPublicIds?.([item.entityId]))?.[0] ??
      (await this.universities.findPublishedBySlug(item.entitySlug ?? item.entityId));
    if (!university||!matchesSavedIdentity(item,university,context))
      return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    return {
      ownerType: item.entityType,
      ownerId: university.id,
      publicId: university.publicId,
      slug: university.slug,
      displayName: university.displayName,
      lifecycleStatus: university.status,
      available: university.status === UniversityStatus.PUBLISHED,
    };
  }
}

export class ScholarshipStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly scholarships: IScholarshipRepository) {}
  supports(entityType: StudentSavedItemType): boolean {
    return entityType === StudentSavedItemType.SCHOLARSHIP;
  }
  async hydrate(item: StudentSavedItemDto,context?:'CANONICALIZE_NEW_SAVE') {
    const referenceState=await this.scholarships.readReferenceState?.(item.entityId)??undefined;
    const scholarship =
      (await this.scholarships.findById(item.entityId)) ??
      (await this.scholarships.findByPublicId?.(item.entityId)) ??
      (await this.scholarships.findBySlug(item.entitySlug ?? item.entityId));
    if (!scholarship||!matchesSavedIdentity(item,scholarship,context))
      return { ownerType: item.entityType, ownerId: item.entityId, available: false,referenceState };
    return {
      ownerType: item.entityType,
      ownerId: scholarship.id,
      referenceState,
      publicId: scholarship.publicId,
      slug: scholarship.slug,
      displayName: scholarship.displayName,
      lifecycleStatus: scholarship.publicationStatus ?? scholarship.status,
      available:
        isPublicScholarshipOwner(scholarship) &&
        (await this.scholarships.findPublishedBySlug(scholarship.slug))?.id === scholarship.id,
    };
  }
}

export class CmsStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly cms: ICmsRepository) {}
  supports(entityType: StudentSavedItemType): boolean {
    return entityType === StudentSavedItemType.CMS_CONTENT;
  }
  async hydrate(item: StudentSavedItemDto,context?:'CANONICALIZE_NEW_SAVE') {
    const content =
      (await this.cms.findContentById(item.entityId)) ??
      (await this.cms.findContentBySlug(item.entitySlug ?? item.entityId));
    if (!content||!matchesSavedIdentity(item,content,context)) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    const published = await this.cms.getPublishedBySlug(
      content.slug,
      undefined,
      content.siteIdentifier,
    );
    if (!published || published.contentId !== content.id)
      return {
        ownerType: item.entityType,
        ownerId: item.entityId,
        publicId: content.publicId,
        slug: content.slug,
        displayName: content.title,
        lifecycleStatus: String(content.status),
        available: false,
      };
    return {
      ownerType: item.entityType,
      ownerId: content.id,
      publicId: published.publicId,
      slug: published.slug,
      displayName: published.title,
      lifecycleStatus: 'PUBLISHED',
      available: true,
    };
  }
}

export class ServiceStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly services: IServiceCatalogRepository) {}
  supports(entityType: StudentSavedItemType): boolean {
    return entityType === StudentSavedItemType.SERVICE;
  }
  async hydrate(item: StudentSavedItemDto,context?:'CANONICALIZE_NEW_SAVE') {
    const service =
      (await this.services.findById(item.entityId)) ??
      (await this.services.findBySlug(item.entitySlug ?? item.entityId));
    if (!service||!matchesSavedIdentity(item,service,context)) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    return {
      ownerType: item.entityType,
      ownerId: service.id,
      publicId: service.publicId,
      slug: service.slug,
      displayName: service.displayName,
      lifecycleStatus: service.status,
      available: service.status === ServiceStatus.PUBLISHED,
    };
  }
}

export class CourseStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly courses: ICourseRepository) {}
  supports(entityType: StudentSavedItemType): boolean {
    return entityType === StudentSavedItemType.COURSE;
  }
  async hydrate(item: StudentSavedItemDto,context?:'CANONICALIZE_NEW_SAVE') {
    const course =
      (await this.courses.findById(item.entityId)) ??
      (await this.courses.findByPublicId(item.entityId)) ??
      (await this.courses.findBySlug(item.entitySlug ?? item.entityId));
    if (!course||!matchesSavedIdentity(item,course,context)) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    return {
      ownerType: item.entityType,
      ownerId: course.id,
      publicId: course.publicId,
      slug: course.slug,
      displayName: course.displayName,
      lifecycleStatus: course.status,
      available: course.status === CourseStatus.PUBLISHED,
    };
  }
}

export class InternationalTestStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly tests: IInternationalTestRepository) {}
  supports(entityType: StudentSavedItemType): boolean {
    return entityType === StudentSavedItemType.INTERNATIONAL_TEST;
  }
  async hydrate(item: StudentSavedItemDto,context?:'CANONICALIZE_NEW_SAVE') {
    const candidate = await this.tests.findById(item.entityId);
    const slug =
      typeof candidate?.slug === 'string' ? candidate.slug : (item.entitySlug ?? item.entityId);
    const test = await this.tests.findPublishedBySlug(slug);
    if (!test||!matchesSavedIdentity(item,test,context)) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    return {
      ownerType: item.entityType,
      ownerId: test.id,
      publicId: typeof test.publicId === 'string' ? test.publicId : undefined,
      slug,
      displayName: test.localizedNameAr || test.canonicalName,
      lifecycleStatus: test.status,
      available: true,
    };
  }
}

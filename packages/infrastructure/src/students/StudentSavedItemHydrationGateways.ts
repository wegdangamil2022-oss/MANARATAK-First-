import {
  ICmsRepository,
  ICourseRepository,
  IMajorRepository,
  IScholarshipRepository,
  IServiceCatalogRepository,
  IStudentSavedItemHydrationGateway,
  IUniversityRepository,
  MajorStatus,
  ScholarshipPublicationStatus,
  ServiceStatus,
  CourseStatus,
  StudentSavedItemDto,
  StudentSavedItemType,
  UniversityStatus,
} from '@manaratak/domain';

export class MajorStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly majors: IMajorRepository) {}
  supports(entityType: StudentSavedItemType): boolean { return entityType === StudentSavedItemType.MAJOR; }
  async hydrate(item: StudentSavedItemDto) {
    const major = await this.majors.findById(item.entityId);
    if (!major) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    return {
      ownerType: item.entityType,
      ownerId: major.id,
      publicId: major.publicId,
      slug: major.slug,
      displayName: major.displayName,
      lifecycleStatus: major.status,
      available: major.status === MajorStatus.PUBLISHED,
    };
  }
}

export class UniversityStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly universities: IUniversityRepository) {}
  supports(entityType: StudentSavedItemType): boolean { return entityType === StudentSavedItemType.UNIVERSITY; }
  async hydrate(item: StudentSavedItemDto) {
    const university = await this.universities.findById(item.entityId);
    if (!university) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
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
  supports(entityType: StudentSavedItemType): boolean { return entityType === StudentSavedItemType.SCHOLARSHIP; }
  async hydrate(item: StudentSavedItemDto) {
    const scholarship = await this.scholarships.findById(item.entityId);
    if (!scholarship) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    return {
      ownerType: item.entityType,
      ownerId: scholarship.id,
      publicId: scholarship.publicId,
      slug: scholarship.slug,
      displayName: scholarship.displayName,
      lifecycleStatus: scholarship.publicationStatus ?? scholarship.status,
      available: scholarship.publicationStatus === ScholarshipPublicationStatus.PUBLISHED,
    };
  }
}

export class CmsStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly cms: ICmsRepository) {}
  supports(entityType: StudentSavedItemType): boolean { return entityType === StudentSavedItemType.CMS_CONTENT; }
  async hydrate(item: StudentSavedItemDto) {
    const content = await this.cms.findContentById(item.entityId);
    if (!content) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    const published = await this.cms.getPublishedBySlug(item.entitySlug ?? content.slug, undefined, content.siteIdentifier);
    if (!published) return { ownerType: item.entityType, ownerId: item.entityId, publicId: content.publicId, slug: content.slug, displayName: content.title, lifecycleStatus: String(content.status), available: false };
    return { ownerType: item.entityType, ownerId: item.entityId, publicId: published.publicId, slug: published.slug, displayName: published.title, lifecycleStatus: 'PUBLISHED', available: true };
  }
}

export class ServiceStudentSavedItemHydrationGateway implements IStudentSavedItemHydrationGateway {
  constructor(private readonly services: IServiceCatalogRepository) {}
  supports(entityType: StudentSavedItemType): boolean { return entityType === StudentSavedItemType.SERVICE; }
  async hydrate(item: StudentSavedItemDto) {
    const service = await this.services.findById(item.entityId);
    if (!service) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    return {
      ownerType: item.entityType,
      ownerId: item.entityId,
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
  supports(entityType: StudentSavedItemType): boolean { return entityType === StudentSavedItemType.COURSE; }
  async hydrate(item: StudentSavedItemDto) {
    const course = await this.courses.findById(item.entityId);
    if (!course) return { ownerType: item.entityType, ownerId: item.entityId, available: false };
    return { ownerType: item.entityType, ownerId: course.id, publicId: course.publicId, slug: course.slug, displayName: course.displayName, lifecycleStatus: course.status, available: course.status === CourseStatus.PUBLISHED };
  }
}

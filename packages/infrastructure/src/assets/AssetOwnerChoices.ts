import type { PrismaClient } from '@prisma/client';
import type { AuthorizationEvaluatorService } from '@manaratak/domain';
const permissions: Record<string, string> = {
  UNIVERSITY: 'admin:universities:manage',
  SCHOLARSHIP: 'admin:scholarships:manage',
  COURSE: 'admin:courses:manage',
  CMS: 'admin:cms:manage',
  CMS_CONTENT: 'admin:cms:manage',
  STUDY_DESTINATION: 'admin:study-destinations:edit',
  REFERENCE_COUNTRY: 'admin:reference-data:manage',
  STUDENT_TOOL: 'admin:student-tools:manage',
  SERVICE_CATALOG: 'admin:services:manage',
  CAREER_EMPLOYER: 'admin:careers:manage',
  INTERNATIONAL_TEST: 'admin:international-tests:manage',
  CERTIFICATE_ISSUER: 'admin:certificates:issuers:manage',
  CERTIFICATE_TEMPLATE: 'admin:certificates:templates:author',
};
export class AssetOwnerChoices {
  constructor(
    private readonly db: PrismaClient,
    private readonly authorization: AuthorizationEvaluatorService,
  ) {}
  async types(actorId: string) {
    const items: string[] = [];
    for (const [type, permission] of Object.entries(permissions)) {
      if (type === 'CMS') continue;
      if (
        (
          await this.authorization.evaluatePermission(actorId, permission, {
            requestTime: new Date(),
          })
        ).isGranted
      )
        items.push(type);
    }
    return items;
  }
  private async allowed(actorId: string, type: string) {
    const permission = permissions[type.toUpperCase()];
    if (
      !permission ||
      !(
        await this.authorization.evaluatePermission(actorId, permission, {
          requestTime: new Date(),
        })
      ).isGranted
    )
      throw Error('ASSET_OWNER_PERMISSION_REQUIRED');
  }
  async assert(actorId: string, type: string, id: string) {
    await this.allowed(actorId, type);
    if (!(await this.rows(type, '', id)).length) throw Error('ASSET_OWNER_NOT_FOUND');
  }
  async search(actorId: string, type: string, query: string) {
    await this.allowed(actorId, type);
    return this.rows(type, query);
  }
  private async rows(
    type: string,
    q: string,
    id?: string,
  ): Promise<Array<{ id: string; label: string }>> {
    const identity = id ? { id } : {},
      contains = { contains: q, mode: 'insensitive' as const };
    switch (type.toUpperCase()) {
      case 'UNIVERSITY':
        return (
          await this.db.university.findMany({
            where: { ...identity, ...(q ? { displayName: contains } : {}) },
            select: { id: true, displayName: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.displayName }));
      case 'SCHOLARSHIP':
        return (
          await this.db.scholarship.findMany({
            where: { ...identity, ...(q ? { displayName: contains } : {}) },
            select: { id: true, displayName: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.displayName }));
      case 'COURSE':
        return (
          await this.db.course.findMany({
            where: { ...identity, ...(q ? { displayName: contains } : {}) },
            select: { id: true, displayName: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.displayName }));
      case 'CMS':
      case 'CMS_CONTENT':
        return (
          await this.db.cmsContentNode.findMany({
            where: { ...identity, ...(q ? { title: contains } : {}) },
            select: { id: true, title: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.title }));
      case 'REFERENCE_COUNTRY':
        return (
          await this.db.referenceCountry.findMany({
            where: {
              ...identity,
              ...(q ? { OR: [{ name: contains }, { nameAr: contains }] } : {}),
            },
            select: { id: true, name: true, nameAr: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.nameAr || r.name }));
      case 'STUDY_DESTINATION':
        return (
          await this.db.studyDestinationProfile.findMany({
            where: { ...identity, ...(q ? { slug: contains } : {}) },
            select: { id: true, slug: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.slug }));
      case 'STUDENT_TOOL':
        return (
          await this.db.studentToolDefinitionRecord.findMany({
            where: {
              ...identity,
              ...(q ? { OR: [{ nameAr: contains }, { nameEn: contains }] } : {}),
            },
            select: { id: true, nameAr: true, nameEn: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.nameAr || r.nameEn }));
      case 'SERVICE_CATALOG':
        return (
          await this.db.serviceCatalogRecord.findMany({
            where: { ...identity, ...(q ? { displayName: contains } : {}) },
            select: { id: true, displayName: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.displayName }));
      case 'CAREER_EMPLOYER':
        return (
          await this.db.careerEmployerRecord.findMany({
            where: { ...identity, ...(q ? { displayName: contains } : {}) },
            select: { id: true, displayName: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.displayName }));
      case 'INTERNATIONAL_TEST':
        return (
          await this.db.internationalTest.findMany({
            where: { ...identity, ...(q ? { displayName: contains } : {}) },
            select: { id: true, displayName: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.displayName }));
      case 'CERTIFICATE_ISSUER':
        return (
          await this.db.certificateIssuer.findMany({
            where: { ...identity, ...(q ? { name: contains } : {}) },
            select: { id: true, name: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.name }));
      case 'CERTIFICATE_TEMPLATE':
        return (
          await this.db.certificateTemplate.findMany({
            where: { ...identity, ...(q ? { name: contains } : {}) },
            select: { id: true, name: true },
            take: 25,
            orderBy: { id: 'asc' },
          })
        ).map((r) => ({ id: r.id, label: r.name }));
      default:
        throw Error('ASSET_OWNER_PERMISSION_REQUIRED');
    }
  }
}

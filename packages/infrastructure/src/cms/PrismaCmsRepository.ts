/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma CMS delegates are generated after the source-only migration is accepted by runtime. */
import { createHash, randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  CmsCategoryDto,
  CmsAnnouncementDto,
  CmsBlockSchemaDto,
  CmsContentBlockDto,
  CmsContentDetailDto,
  CmsContentDomainLinkDto,
  CmsContentDto,
  CmsContentFilters,
  CmsContentRevisionDto,
  CmsContentStatus,
  CmsNavigationMenuDto,
  CmsLocalizedContentDto,
  CmsPublishingPolicy,
  CmsPublishingReadinessDto,
  CmsRedirectDto,
  CmsScheduleResultDto,
  CmsSlugChangeDto,
  CmsRestoreRevisionDto,
  CmsSeoMetadata,
  CmsTagDto,
  CmsWorkflowCommandDto,
  CreateCmsCategoryDto,
  CreateCmsContentDto,
  CreateCmsTagDto,
  ICmsRepository,
  PaginatedCmsResult,
  PublicCmsContentDto,
  UpdateCmsContentDto,
  UpsertCmsLocalizedContentDto,
  UpsertCmsContentDomainLinkDto,
} from '@manaratak/domain';

const json = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

export class PrismaCmsRepository implements ICmsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  private get db(): any {
    return this.prisma as any;
  }

  public async createContent(data: CreateCmsContentDto): Promise<CmsContentDto> {
    return this.db.$transaction(async (tx: any) => {
      const category = await this.resolveCategory(tx, data.categoryId, data.categorySlug);
      const row = await tx.cmsContentNode.create({
        data: {
          ...data,
          categoryId: category?.id ?? null,
          categorySlug: category?.slug ?? data.categorySlug ?? null,
          seoMetadata: json(data.seoMetadata),
          editorialMetadata: json(data.editorialMetadata),
          metadata: json(data.metadata),
        },
      });
      await this.appendMutation(tx, row, null, 'CONTENT_CREATED', data.authorId, {
        slug: row.slug,
        contentType: row.contentType,
      });
      return this.content(row);
    });
  }

  public async updateContent(
    id: string,
    data: UpdateCmsContentDto,
    actorId: string,
  ): Promise<CmsContentDto> {
    return this.db.$transaction(async (tx: any) => {
      const current = await this.requireContent(tx, id);
      this.assertVersion(current.version, data.expectedVersion);
      if (data.slug && data.slug !== current.slug) {
        const published = await tx.cmsPublishedContent.findFirst({ where: { contentId: id } });
        if (published) throw new Error('CMS_CANONICAL_IDENTITY_IMMUTABLE');
      }
      const category =
        data.categoryId !== undefined || data.categorySlug !== undefined
          ? await this.resolveCategory(tx, data.categoryId, data.categorySlug)
          : undefined;
      const { expectedVersion: _expectedVersion, ...values } = data;
      const row = await tx.cmsContentNode.update({
        where: { id },
        data: {
          ...values,
          ...(category !== undefined
            ? { categoryId: category?.id ?? null, categorySlug: category?.slug ?? null }
            : {}),
          seoMetadata: json(values.seoMetadata),
          editorialMetadata: json(values.editorialMetadata),
          metadata: json(values.metadata),
          version: { increment: 1 },
        },
      });
      await this.appendMutation(tx, row, null, 'CONTENT_UPDATED', actorId, {
        version: row.version,
      });
      return this.content(row);
    });
  }

  public async findContentById(id: string): Promise<CmsContentDto | null> {
    const row = await this.db.cmsContentNode.findUnique({ where: { id } });
    return row ? this.content(row) : null;
  }

  public async findContentBySlug(slug: string): Promise<CmsContentDto | null> {
    const row = await this.db.cmsContentNode.findFirst({ where: { slug }, orderBy: { updatedAt: 'desc' } });
    return row ? this.content(row) : null;
  }

  public async getContentDetail(id: string): Promise<CmsContentDetailDto | null> {
    const row = await this.db.cmsContentNode.findUnique({
      where: { id },
      include: {
        domainLinks: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        localizedPayloads: {
          include: {
            tags: { include: { tag: true } },
            attachments: { orderBy: { sortOrder: 'asc' } },
            reviews: { orderBy: { requestedAt: 'desc' } },
            revisions: { orderBy: { versionNumber: 'desc' }, take: 30 },
          },
          orderBy: { locale: 'asc' },
        },
      },
    });
    if (!row) return null;
    const tags = new Map<string, CmsTagDto>();
    const attachments: any[] = [];
    const reviews: any[] = [];
    const revisions: CmsContentRevisionDto[] = [];
    const readiness: Record<string, CmsPublishingReadinessDto> = {};
    for (const localized of row.localizedPayloads) {
      for (const link of localized.tags) tags.set(link.tag.id, this.tag(link.tag));
      attachments.push(...localized.attachments);
      reviews.push(...localized.reviews);
      revisions.push(...localized.revisions.map((entry: any) => this.revision(entry)));
      readiness[localized.locale] = await this.readinessFromRows(row, localized);
    }
    return {
      ...this.content(row),
      localizedPayloads: row.localizedPayloads.map((entry: any) => this.localized(entry)),
      tags: [...tags.values()],
      attachments,
      reviews,
      revisions,
      readiness,
      domainLinks: (row.domainLinks ?? []).map((entry: any) => this.domainLink(entry)),
    };
  }

  public async listContent(filters: CmsContentFilters): Promise<PaginatedCmsResult<CmsContentDto>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const q = filters.q?.trim();
    const where: any = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.contentType ? { contentType: filters.contentType } : {}),
      ...(filters.categorySlug ? { categorySlug: filters.categorySlug } : {}),
      ...(filters.siteIdentifier ? { siteIdentifier: filters.siteIdentifier } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { summary: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
              { publicId: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.cmsContentNode.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.cmsContentNode.count({ where }),
    ]);
    return {
      data: rows.map((row: any) => this.content(row)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  public async upsertLocalizedContent(
    data: UpsertCmsLocalizedContentDto,
  ): Promise<CmsLocalizedContentDto> {
    return this.db.$transaction(async (tx: any) => {
      const content = await this.requireContent(tx, data.contentId);
      const existing = await tx.cmsLocalizedContent.findUnique({
        where: { contentId_locale: { contentId: data.contentId, locale: data.locale } },
      });
      if (existing) {
        this.assertVersion(existing.version, data.expectedVersion);
        if (
          [
            CmsContentStatus.IN_REVIEW,
            CmsContentStatus.READY_TO_PUBLISH,
            CmsContentStatus.SCHEDULED,
          ].includes(existing.state)
        ) {
          throw new Error('CMS_CONTENT_LOCKED_FOR_WORKFLOW');
        }
        const published = await tx.cmsPublishedContent.findUnique({
          where: { contentId_locale: { contentId: data.contentId, locale: data.locale } },
        });
        if (published && published.slug !== data.localizedSlug) {
          throw new Error('CMS_CANONICAL_IDENTITY_IMMUTABLE');
        }
        await this.captureRevision(tx, existing, data.actorId, 'BEFORE_EDIT');
      }
      const row = await tx.cmsLocalizedContent.upsert({
        where: { contentId_locale: { contentId: data.contentId, locale: data.locale } },
        create: {
          contentId: data.contentId,
          siteIdentifier: content.siteIdentifier,
          locale: data.locale,
          localizedSlug: data.localizedSlug,
          title: data.title,
          summary: data.summary,
          body: data.body,
          readingTimeMinutes: data.readingTimeMinutes,
          featuredAssetId: data.featuredAssetId,
          seoMetadata: json(data.seoMetadata),
          metadata: json(data.metadata),
          lastModifiedBy: data.actorId,
        },
        update: {
          siteIdentifier: content.siteIdentifier,
          localizedSlug: data.localizedSlug,
          title: data.title,
          summary: data.summary,
          body: data.body,
          readingTimeMinutes: data.readingTimeMinutes,
          featuredAssetId: data.featuredAssetId,
          seoMetadata: json(data.seoMetadata),
          metadata: json(data.metadata),
          lastModifiedBy: data.actorId,
          state: CmsContentStatus.DRAFT,
          scheduledAt: null,
          version: { increment: 1 },
        },
      });
      if (data.tagIds !== undefined) {
        await tx.cmsContentTag.deleteMany({ where: { localizedContentId: row.id } });
        if (data.tagIds.length) {
          await tx.cmsContentTag.createMany({
            data: [...new Set(data.tagIds)].map((tagId) => ({
              localizedContentId: row.id,
              tagId,
            })),
          });
        }
      }
      if (data.attachmentAssetIds !== undefined) {
        await tx.cmsContentAttachment.deleteMany({
          where: { localizedContentId: row.id, role: 'ATTACHMENT' },
        });
        if (data.attachmentAssetIds.length) {
          await tx.cmsContentAttachment.createMany({
            data: [...new Set(data.attachmentAssetIds)].map((assetId, index) => ({
              id: randomUUID(),
              localizedContentId: row.id,
              assetId,
              role: 'ATTACHMENT',
              sortOrder: index,
            })),
          });
        }
      }
      await this.syncRootLifecycle(tx, content.id, {
        ...(data.locale === content.primaryLocale ? { title: data.title, summary: data.summary } : {}),
      });
      await this.appendMutation(tx, content, row.id, 'LOCALIZATION_SAVED', data.actorId, {
        locale: data.locale,
        version: row.version,
      });
      return this.localized(row);
    });
  }

  public async listLocalizedContent(contentId: string): Promise<CmsLocalizedContentDto[]> {
    return (
      await this.db.cmsLocalizedContent.findMany({
        where: { contentId },
        orderBy: { locale: 'asc' },
      })
    ).map((row: any) => this.localized(row));
  }

  public async getReadiness(contentId: string, locale: string): Promise<CmsPublishingReadinessDto> {
    const [content, localized] = await Promise.all([
      this.db.cmsContentNode.findUnique({ where: { id: contentId } }),
      this.db.cmsLocalizedContent.findUnique({
        where: { contentId_locale: { contentId, locale } },
        include: { tags: true },
      }),
    ]);
    if (!content || !localized) throw new Error('CMS_LOCALIZATION_NOT_FOUND');
    return this.readinessFromRows(content, localized);
  }

  public async submitForReview(command: CmsWorkflowCommandDto): Promise<CmsLocalizedContentDto> {
    return this.transition(command, CmsContentStatus.IN_REVIEW, 'REVIEW_REQUESTED');
  }

  public async approveReview(command: CmsWorkflowCommandDto): Promise<CmsLocalizedContentDto> {
    return this.db.$transaction(async (tx: any) => {
      const { content, localized } = await this.loadWorkflow(tx, command);
      CmsPublishingPolicy.assertTransition(localized.state, CmsContentStatus.READY_TO_PUBLISH);
      const review = await tx.cmsWorkflowReview.findFirst({
        where: { localizedContentId: localized.id, status: 'PENDING' },
        orderBy: { requestedAt: 'desc' },
      });
      if (!review) throw new Error('CMS_PENDING_REVIEW_NOT_FOUND');
      CmsPublishingPolicy.assertMakerChecker(review.requestedBy, command.actorId);
      await tx.cmsWorkflowReview.update({
        where: { id: review.id },
        data: {
          status: 'APPROVED',
          reviewedBy: command.actorId,
          reviewedAt: new Date(),
          comments: command.comments,
        },
      });
      const row = await tx.cmsLocalizedContent.update({
        where: { id: localized.id },
        data: { state: CmsContentStatus.READY_TO_PUBLISH, version: { increment: 1 } },
      });
      await this.syncRootLifecycle(tx, content.id);
      await this.appendMutation(tx, content, localized.id, 'REVIEW_APPROVED', command.actorId, {
        locale: command.locale,
        reviewId: review.id,
      });
      return this.localized(row);
    });
  }

  public async rejectReview(command: CmsWorkflowCommandDto): Promise<CmsLocalizedContentDto> {
    return this.db.$transaction(async (tx: any) => {
      const { content, localized } = await this.loadWorkflow(tx, command);
      CmsPublishingPolicy.assertTransition(localized.state, CmsContentStatus.DRAFT);
      const review = await tx.cmsWorkflowReview.findFirst({
        where: { localizedContentId: localized.id, status: 'PENDING' },
        orderBy: { requestedAt: 'desc' },
      });
      if (!review) throw new Error('CMS_PENDING_REVIEW_NOT_FOUND');
      CmsPublishingPolicy.assertMakerChecker(review.requestedBy, command.actorId);
      await tx.cmsWorkflowReview.update({
        where: { id: review.id },
        data: {
          status: 'REJECTED',
          reviewedBy: command.actorId,
          reviewedAt: new Date(),
          comments: command.comments,
        },
      });
      const row = await tx.cmsLocalizedContent.update({
        where: { id: localized.id },
        data: { state: CmsContentStatus.DRAFT, version: { increment: 1 } },
      });
      await this.syncRootLifecycle(tx, content.id);
      await this.appendMutation(tx, content, localized.id, 'REVIEW_REJECTED', command.actorId, {
        locale: command.locale,
        reason: command.comments,
      });
      return this.localized(row);
    });
  }

  public async schedule(command: CmsWorkflowCommandDto): Promise<CmsLocalizedContentDto> {
    if (!command.scheduledAt) throw new Error('CMS_SCHEDULE_REQUIRED');
    return this.transition(command, CmsContentStatus.SCHEDULED, 'CONTENT_SCHEDULED', {
      scheduledAt: command.scheduledAt,
    });
  }

  public async cancelSchedule(command: CmsWorkflowCommandDto): Promise<CmsLocalizedContentDto> {
    return this.db.$transaction(async (tx: any) => {
      const { content, localized } = await this.loadWorkflow(tx, command);
      CmsPublishingPolicy.assertTransition(localized.state, CmsContentStatus.DRAFT);
      await tx.cmsScheduledJob.updateMany({ where: { localizedContentId: localized.id, status: 'PENDING' }, data: { status: 'CANCELLED', completedAt: new Date() } });
      const row = await tx.cmsLocalizedContent.update({ where: { id: localized.id }, data: { state: CmsContentStatus.DRAFT, scheduledAt: null, version: { increment: 1 } } });
      await this.syncRootLifecycle(tx, content.id);
      await this.appendMutation(tx, content, localized.id, 'SCHEDULE_CANCELLED', command.actorId, { locale: command.locale });
      return this.localized(row);
    });
  }

  public async publish(command: CmsWorkflowCommandDto): Promise<CmsLocalizedContentDto> {
    return this.db.$transaction(async (tx: any) => {
      const { content, localized } = await this.loadWorkflow(tx, command, true);
      if (localized.state === CmsContentStatus.SCHEDULED) {
        if (!localized.scheduledAt || localized.scheduledAt.getTime() > Date.now()) {
          throw new Error('CMS_SCHEDULE_NOT_DUE');
        }
      } else {
        CmsPublishingPolicy.assertTransition(localized.state, CmsContentStatus.PUBLISHED);
      }
      CmsPublishingPolicy.assertMakerChecker(content.authorId, command.actorId);
      const approved = await tx.cmsWorkflowReview.findFirst({
        where: { localizedContentId: localized.id, status: 'APPROVED' },
        orderBy: { reviewedAt: 'desc' },
      });
      if (!approved) throw new Error('CMS_APPROVAL_REQUIRED');
      const full = await tx.cmsLocalizedContent.findUnique({
        where: { id: localized.id },
        include: { tags: { include: { tag: true } }, attachments: true },
      });
      const readiness = await this.readinessFromRows(content, full);
      if (!readiness.ready) throw new Error(`CMS_NOT_READY:${readiness.missing.join(',')}`);
      await this.captureRevision(tx, full, command.actorId, 'PUBLISHED');
      const seo = this.seo(
        full.seoMetadata,
        full.title,
        full.summary,
        full.locale,
        content.contentType,
        full.localizedSlug,
      );
      const now = new Date();
      await tx.cmsPublishedContent.upsert({
        where: { contentId_locale: { contentId: content.id, locale: full.locale } },
        create: {
          id: randomUUID(),
          contentId: content.id,
          publicId: content.publicId,
          siteIdentifier: content.siteIdentifier,
          locale: full.locale,
          slug: full.localizedSlug,
          canonicalUrl: seo.canonicalUrl,
          contentType: content.contentType,
          title: full.title,
          summary: full.summary,
          body: full.body,
          categorySlug: content.categorySlug,
          featuredAssetId: full.featuredAssetId ?? content.featuredAssetId,
          attachmentAssetIds: json(full.attachments.map((entry: any) => entry.assetId)),
          tags: json(
            full.tags.map((entry: any) => ({
              normalizedValue: entry.tag.normalizedValue,
              labelAr: entry.tag.labelAr,
              labelEn: entry.tag.labelEn,
            })),
          ),
          seoMetadata: json(seo),
          versionNumber: full.version,
          publishedAt: now,
        },
        update: {
          title: full.title,
          summary: full.summary,
          body: full.body,
          categorySlug: content.categorySlug,
          featuredAssetId: full.featuredAssetId ?? content.featuredAssetId,
          attachmentAssetIds: json(full.attachments.map((entry: any) => entry.assetId)),
          tags: json(
            full.tags.map((entry: any) => ({
              normalizedValue: entry.tag.normalizedValue,
              labelAr: entry.tag.labelAr,
              labelEn: entry.tag.labelEn,
            })),
          ),
          seoMetadata: json(seo),
          versionNumber: full.version,
          status: CmsContentStatus.PUBLISHED,
          archivedAt: null,
          publishedAt: now,
        },
      });
      const row = await tx.cmsLocalizedContent.update({
        where: { id: full.id },
        data: {
          state: CmsContentStatus.PUBLISHED,
          publishedAt: now,
          scheduledAt: null,
          version: { increment: 1 },
        },
      });
      await this.syncRootLifecycle(tx, content.id);
      await this.appendMutation(tx, content, full.id, 'CONTENT_PUBLISHED', command.actorId, {
        locale: command.locale,
        versionNumber: full.version,
        canonicalUrl: seo.canonicalUrl,
      });
      return this.localized(row);
    });
  }

  public async archive(command: CmsWorkflowCommandDto): Promise<CmsLocalizedContentDto> {
    return this.db.$transaction(async (tx: any) => {
      const { content, localized } = await this.loadWorkflow(tx, command);
      CmsPublishingPolicy.assertTransition(localized.state, CmsContentStatus.ARCHIVED);
      const now = new Date();
      await tx.cmsPublishedContent.updateMany({
        where: { contentId: content.id, locale: command.locale },
        data: { status: CmsContentStatus.ARCHIVED, archivedAt: now },
      });
      const row = await tx.cmsLocalizedContent.update({
        where: { id: localized.id },
        data: { state: CmsContentStatus.ARCHIVED, version: { increment: 1 } },
      });
      await this.syncRootLifecycle(tx, content.id);
      await this.appendMutation(tx, content, localized.id, 'CONTENT_ARCHIVED', command.actorId, {
        locale: command.locale,
      });
      return this.localized(row);
    });
  }

  public async listRevisions(contentId: string, locale: string): Promise<CmsContentRevisionDto[]> {
    const localized = await this.db.cmsLocalizedContent.findUnique({
      where: { contentId_locale: { contentId, locale } },
    });
    if (!localized) throw new Error('CMS_LOCALIZATION_NOT_FOUND');
    return (
      await this.db.cmsContentRevision.findMany({
        where: { localizedContentId: localized.id },
        orderBy: { versionNumber: 'desc' },
      })
    ).map((row: any) => this.revision(row));
  }

  public async restoreRevision(data: CmsRestoreRevisionDto): Promise<CmsLocalizedContentDto> {
    return this.db.$transaction(async (tx: any) => {
      const localized = await tx.cmsLocalizedContent.findUnique({
        where: { contentId_locale: { contentId: data.contentId, locale: data.locale } },
      });
      if (!localized) throw new Error('CMS_LOCALIZATION_NOT_FOUND');
      this.assertVersion(localized.version, data.expectedVersion);
      const revision = await tx.cmsContentRevision.findFirst({
        where: { id: data.revisionId, localizedContentId: localized.id },
      });
      if (!revision) throw new Error('CMS_REVISION_NOT_FOUND');
      const payload = revision.payload as any;
      await this.captureRevision(tx, localized, data.actorId, 'BEFORE_RESTORE');
      const row = await tx.cmsLocalizedContent.update({
        where: { id: localized.id },
        data: {
          title: payload.title,
          summary: payload.summary,
          body: payload.body,
          readingTimeMinutes: payload.readingTimeMinutes,
          featuredAssetId: payload.featuredAssetId,
          seoMetadata: json(payload.seoMetadata),
          metadata: json(payload.metadata),
          state: CmsContentStatus.DRAFT,
          lastModifiedBy: data.actorId,
          scheduledAt: null,
          version: { increment: 1 },
        },
      });
      const content = await this.requireContent(tx, data.contentId);
      await this.syncRootLifecycle(tx, content.id);
      await this.appendMutation(tx, content, localized.id, 'REVISION_RESTORED', data.actorId, {
        locale: data.locale,
        revisionId: revision.id,
      });
      return this.localized(row);
    });
  }

  public async createCategory(
    data: CreateCmsCategoryDto,
    actorId: string,
  ): Promise<CmsCategoryDto> {
    return this.db.$transaction(async (tx: any) => {
      if (data.parentCategoryId) {
        const parent = await tx.cmsCategory.findUnique({ where: { id: data.parentCategoryId } });
        if (!parent) throw new Error('CMS_PARENT_CATEGORY_NOT_FOUND');
      }
      const row = await tx.cmsCategory.create({ data: { ...data, metadata: json(data.metadata) } });
      await this.appendStandaloneMutation(tx, row.id, 'CmsCategory', 'CATEGORY_CREATED', actorId, {
        slug: row.slug,
      });
      return this.category(row);
    });
  }

  public async listCategories(): Promise<CmsCategoryDto[]> {
    return (
      await this.db.cmsCategory.findMany({
        include: { _count: { select: { contents: true } } },
        orderBy: [{ status: 'asc' }, { nameAr: 'asc' }],
      })
    ).map((row: any) => this.category(row));
  }

  public async createTag(data: CreateCmsTagDto, actorId: string): Promise<CmsTagDto> {
    return this.db.$transaction(async (tx: any) => {
      const row = await tx.cmsTag.upsert({
        where: { normalizedValue: data.normalizedValue },
        create: data,
        update: { labelAr: data.labelAr, labelEn: data.labelEn },
      });
      await this.appendStandaloneMutation(tx, row.id, 'CmsTag', 'TAG_UPSERTED', actorId, {
        normalizedValue: row.normalizedValue,
      });
      return this.tag(row);
    });
  }

  public async listTags(): Promise<CmsTagDto[]> {
    return (
      await this.db.cmsTag.findMany({
        include: { _count: { select: { contents: true } } },
        orderBy: { normalizedValue: 'asc' },
      })
    ).map((row: any) => this.tag(row));
  }

  public async listPublished(
    filters: CmsContentFilters,
    locale = 'ar',
  ): Promise<PaginatedCmsResult<PublicCmsContentDto>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const q = filters.q?.trim();
    const tag = filters.tag?.trim().toLocaleLowerCase('en');
    const where: any = {
      locale,
      status: CmsContentStatus.PUBLISHED,
      ...(filters.contentType ? { contentType: filters.contentType } : {}),
      ...(filters.categorySlug ? { categorySlug: filters.categorySlug } : {}),
      ...(filters.siteIdentifier ? { siteIdentifier: filters.siteIdentifier } : {}),
      ...(tag ? { tags: { array_contains: [{ normalizedValue: tag }] } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { summary: { contains: q, mode: 'insensitive' } },
              { body: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.cmsPublishedContent.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.cmsPublishedContent.count({ where }),
    ]);
    const locales = await this.availableLocales(rows.map((row: any) => row.contentId));
    return {
      data: rows.map((row: any) => this.publicContent(row, locales.get(row.contentId) ?? [])),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  public async getPublishedBySlug(
    slug: string,
    locale = 'ar',
    siteIdentifier = 'manaratak',
  ): Promise<PublicCmsContentDto | null> {
    let row = await this.db.cmsPublishedContent.findUnique({
      where: { siteIdentifier_locale_slug: { siteIdentifier, locale, slug } },
    });
    if (!row || row.status !== CmsContentStatus.PUBLISHED) {
      const direct = await this.db.cmsPublishedContent.findFirst({ where: { siteIdentifier, slug, status: CmsContentStatus.PUBLISHED } });
      const node = direct
        ? await this.db.cmsContentNode.findUnique({ where: { id: direct.contentId } })
        : await this.db.cmsContentNode.findFirst({ where: { siteIdentifier, slug } });
      if (!node) return null;
      row = await this.db.cmsPublishedContent.findFirst({
        where: {
          contentId: node.id,
          status: CmsContentStatus.PUBLISHED,
          locale: node.primaryLocale,
        },
      });
    }
    if (!row) return null;
    const locales = await this.availableLocales([row.contentId]);
    return this.publicContent(row, locales.get(row.contentId) ?? []);
  }

  public async replaceDomainLinks(
    contentId: string,
    links: UpsertCmsContentDomainLinkDto[],
    actorId: string,
  ): Promise<CmsContentDomainLinkDto[]> {
    return this.db.$transaction(async (tx: any) => {
      const content = await this.requireContent(tx, contentId);
      await tx.cmsContentDomainLink.deleteMany({ where: { contentId } });
      if (links.length) {
        await tx.cmsContentDomainLink.createMany({
          data: links.map((link, index) => ({
            id: randomUUID(),
            contentId,
            targetType: link.targetType,
            targetId: link.targetId,
            relationType: link.relationType,
            sortOrder: link.sortOrder ?? index,
            metadata: json(link.metadata),
            createdBy: actorId,
          })),
        });
      }
      await this.appendMutation(tx, content, null, 'DOMAIN_LINKS_REPLACED', actorId, { count: links.length });
      const rows = await tx.cmsContentDomainLink.findMany({
        where: { contentId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
      return rows.map((row: any) => this.domainLink(row));
    });
  }

  public async listDomainLinks(contentId: string): Promise<CmsContentDomainLinkDto[]> {
    const rows = await this.db.cmsContentDomainLink.findMany({
      where: { contentId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row: any) => this.domainLink(row));
  }

  public async listPublishedByDomainTarget(
    targetType: string,
    targetId: string,
    locale = 'ar',
    siteIdentifier = 'manaratak',
    limit = 6,
  ): Promise<PublicCmsContentDto[]> {
    const links = await this.db.cmsContentDomainLink.findMany({
      where: { targetType, targetId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: Math.min(24, Math.max(1, limit)),
      select: { contentId: true },
    });
    if (!links.length) return [];
    const contentIds: string[] = [...new Set<string>(links.map((link: any) => String(link.contentId)))];
    const rows = await this.db.cmsPublishedContent.findMany({
      where: {
        contentId: { in: contentIds },
        siteIdentifier,
        locale,
        status: CmsContentStatus.PUBLISHED,
      },
    });
    const byId = new Map(rows.map((row: any) => [row.contentId, row]));
    const ordered = contentIds.map((id: string) => byId.get(id)).filter(Boolean);
    const locales = await this.availableLocales(contentIds);
    return ordered.map((row: any) => this.publicContent(row, locales.get(row.contentId) ?? []));
  }

  public async changeLocalizedSlug(data: CmsSlugChangeDto): Promise<CmsLocalizedContentDto> {
    return this.db.$transaction(async (tx: any) => {
      const content = await this.requireContent(tx, data.contentId);
      const localized = await tx.cmsLocalizedContent.findUnique({ where: { contentId_locale: { contentId: data.contentId, locale: data.locale } } });
      if (!localized) throw new Error('CMS_LOCALIZATION_NOT_FOUND');
      this.assertVersion(localized.version, data.expectedVersion);
      if (localized.localizedSlug === data.newSlug) return this.localized(localized);
      const sourcePath = CmsPublishingPolicy.canonicalPath(data.locale, content.contentType, localized.localizedSlug);
      const destinationPath = CmsPublishingPolicy.canonicalPath(data.locale, content.contentType, data.newSlug);
      CmsPublishingPolicy.assertRedirect(sourcePath, destinationPath);
      await this.assertRedirectGraphSafe(tx, content.siteIdentifier, data.locale, sourcePath, destinationPath);
      await this.captureRevision(tx, localized, data.actorId, 'BEFORE_SLUG_CHANGE');
      const row = await tx.cmsLocalizedContent.update({ where: { id: localized.id }, data: { localizedSlug: data.newSlug, state: CmsContentStatus.DRAFT, lastModifiedBy: data.actorId, version: { increment: 1 } } });
      await this.syncRootLifecycle(tx, content.id);
      await tx.cmsRedirect.upsert({
        where: { siteIdentifier_locale_sourcePath: { siteIdentifier: content.siteIdentifier, locale: data.locale, sourcePath } },
        create: { id: randomUUID(), siteIdentifier: content.siteIdentifier, locale: data.locale, sourcePath, destinationPath, statusCode: 301, reason: data.reason, contentId: content.id, createdBy: data.actorId },
        update: { destinationPath, statusCode: 301, reason: data.reason, active: true },
      });
      await this.appendMutation(tx, content, localized.id, 'SLUG_CHANGED', data.actorId, { locale: data.locale, sourcePath, destinationPath, reason: data.reason });
      return this.localized(row);
    });
  }

  public async listRedirects(siteIdentifier?: string, locale?: string): Promise<CmsRedirectDto[]> {
    return this.db.cmsRedirect.findMany({ where: { ...(siteIdentifier ? { siteIdentifier } : {}), ...(locale ? { locale } : {}) }, orderBy: { updatedAt: 'desc' } });
  }

  public async createRedirect(data: Omit<CmsRedirectDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<CmsRedirectDto> {
    return this.db.$transaction(async (tx: any) => {
      CmsPublishingPolicy.assertRedirect(data.sourcePath, data.destinationPath);
      await this.assertRedirectGraphSafe(tx, data.siteIdentifier, data.locale, data.sourcePath, data.destinationPath);
      const row = await tx.cmsRedirect.create({ data: { id: randomUUID(), ...data } });
      await this.appendStandaloneMutation(tx, row.id, 'CmsRedirect', 'REDIRECT_CREATED', data.createdBy, { siteIdentifier: data.siteIdentifier, locale: data.locale, sourcePath: data.sourcePath, destinationPath: data.destinationPath });
      return row;
    });
  }

  public async listNavigation(siteIdentifier: string, locale: string): Promise<CmsNavigationMenuDto[]> {
    const rows = await this.db.cmsNavigationMenu.findMany({ where: { siteIdentifier, locale }, include: { nodes: { orderBy: { sortOrder: 'asc' } } }, orderBy: { locationKey: 'asc' } });
    return rows.map((row: any) => this.navigation(row));
  }

  public async saveNavigation(
    data: Omit<CmsNavigationMenuDto, 'id' | 'version' | 'status' | 'publishedContentHash' | 'publishedBy' | 'publishedAt' | 'createdAt' | 'updatedAt'> & { id?: string; expectedVersion?: number },
  ): Promise<CmsNavigationMenuDto> {
    return this.db.$transaction(async (tx: any) => {
      const existing = data.id
        ? await tx.cmsNavigationMenu.findUnique({ where: { id: data.id } })
        : await tx.cmsNavigationMenu.findUnique({
            where: {
              siteIdentifier_locale_locationKey: {
                siteIdentifier: data.siteIdentifier,
                locale: data.locale,
                locationKey: data.locationKey,
              },
            },
          });
      if (existing) this.assertVersion(existing.version, data.expectedVersion);
      CmsPublishingPolicy.assertAcyclicNavigation(data.nodes);
      const menu = existing
        ? await tx.cmsNavigationMenu.update({
            where: { id: existing.id },
            data: {
              status: CmsContentStatus.DRAFT,
              updatedBy: data.updatedBy,
              publishedContentHash: null,
              publishedBy: null,
              publishedAt: null,
              version: { increment: 1 },
            },
          })
        : await tx.cmsNavigationMenu.create({
            data: {
              id: randomUUID(),
              siteIdentifier: data.siteIdentifier,
              locale: data.locale,
              locationKey: data.locationKey,
              status: CmsContentStatus.DRAFT,
              updatedBy: data.updatedBy,
            },
          });
      await tx.cmsNavigationNode.deleteMany({ where: { menuId: menu.id } });
      if (data.nodes.length) {
        await tx.cmsNavigationNode.createMany({
          data: data.nodes.map((node, index) => ({
            id: node.id ?? randomUUID(),
            menuId: menu.id,
            parentNodeId: node.parentNodeId,
            displayText: node.displayText,
            targetType: node.targetType,
            targetValue: node.targetValue,
            sortOrder: node.sortOrder ?? index,
            openInNewWindow: node.openInNewWindow,
            metadata: json(node.metadata),
          })),
        });
      }
      await this.appendStandaloneMutation(tx, menu.id, 'CmsNavigationMenu', 'NAVIGATION_UPDATED', data.updatedBy, {
        siteIdentifier: data.siteIdentifier,
        locale: data.locale,
        locationKey: data.locationKey,
        version: menu.version,
      });
      const row = await tx.cmsNavigationMenu.findUnique({ where: { id: menu.id }, include: { nodes: { orderBy: { sortOrder: 'asc' } } } });
      return this.navigation(row);
    });
  }

  public async publishNavigation(id: string, expectedVersion: number, actorId: string): Promise<CmsNavigationMenuDto> {
    return this.db.$transaction(async (tx: any) => {
      const existing = await tx.cmsNavigationMenu.findUnique({ where: { id }, include: { nodes: { orderBy: { sortOrder: 'asc' } } } });
      if (!existing) throw new Error('CMS_NAVIGATION_NOT_FOUND');
      this.assertVersion(existing.version, expectedVersion);
      if (existing.status !== CmsContentStatus.DRAFT) throw new Error('CMS_NAVIGATION_DRAFT_REQUIRED');
      CmsPublishingPolicy.assertMakerChecker(existing.updatedBy, actorId);
      CmsPublishingPolicy.assertAcyclicNavigation(existing.nodes);
      for (const node of existing.nodes) CmsPublishingPolicy.assertSafeNavigationTarget(node.targetType, node.targetValue);
      const contentHash = this.navigationContentHash(existing);
      const now = new Date();
      const row = await tx.cmsNavigationMenu.update({
        where: { id },
        data: {
          status: CmsContentStatus.PUBLISHED,
          publishedContentHash: contentHash,
          publishedBy: actorId,
          publishedAt: now,
          version: { increment: 1 },
        },
        include: { nodes: { orderBy: { sortOrder: 'asc' } } },
      });
      await this.appendStandaloneMutation(tx, row.id, 'CmsNavigationMenu', 'NAVIGATION_PUBLISHED', actorId, {
        siteIdentifier: row.siteIdentifier,
        locale: row.locale,
        locationKey: row.locationKey,
        reviewedVersion: existing.version,
        contentHash,
      });
      return this.navigation(row);
    });
  }

  public async listBlockSchemas(): Promise<CmsBlockSchemaDto[]> {
    return (await this.db.cmsBlockSchema.findMany({ orderBy: [{ key: 'asc' }, { version: 'desc' }] })).map((row: any) => this.blockSchema(row));
  }

  public async createBlockSchema(data: Omit<CmsBlockSchemaDto, 'id' | 'createdAt'>): Promise<CmsBlockSchemaDto> {
    return this.db.$transaction(async (tx: any) => {
      const row = await tx.cmsBlockSchema.create({ data: { ...data, id: randomUUID(), fieldSchema: json(data.fieldSchema), localizedFields: json(data.localizedFields), assetFields: json(data.assetFields) } });
      await this.appendStandaloneMutation(tx, row.id, 'CmsBlockSchema', 'BLOCK_SCHEMA_CREATED', data.createdBy, { key: data.key, version: data.version });
      return this.blockSchema(row);
    });
  }

  public async listBlocks(siteIdentifier: string, locale: string): Promise<CmsContentBlockDto[]> {
    return (await this.db.cmsContentBlock.findMany({ where: { siteIdentifier, locale }, orderBy: { updatedAt: 'desc' } })).map((row: any) => this.block(row));
  }

  public async saveBlock(data: Omit<CmsContentBlockDto, 'id' | 'publicId' | 'version' | 'createdAt' | 'updatedAt'> & { id?: string; expectedVersion?: number }): Promise<CmsContentBlockDto> {
    return this.db.$transaction(async (tx: any) => {
      const schema = await tx.cmsBlockSchema.findUnique({ where: { id: data.schemaId } });
      if (!schema || schema.status !== 'ACTIVE') throw new Error('CMS_BLOCK_SCHEMA_NOT_ACTIVE');
      CmsPublishingPolicy.assertBlockPayload(data.payload, schema.fieldSchema, schema.assetFields);
      const existing = data.id ? await tx.cmsContentBlock.findUnique({ where: { id: data.id } }) : null;
      if (existing) this.assertVersion(existing.version, data.expectedVersion);
      const row = existing
        ? await tx.cmsContentBlock.update({ where: { id: existing.id }, data: { name: data.name, payload: json(data.payload), status: CmsContentStatus.DRAFT, updatedBy: data.updatedBy, version: { increment: 1 } } })
        : await tx.cmsContentBlock.create({ data: { id: randomUUID(), publicId: `cms-block-${randomUUID()}`, siteIdentifier: data.siteIdentifier, locale: data.locale, schemaId: data.schemaId, name: data.name, payload: json(data.payload), status: CmsContentStatus.DRAFT, updatedBy: data.updatedBy } });
      await this.appendStandaloneMutation(tx, row.id, 'CmsContentBlock', 'BLOCK_SAVED', data.updatedBy, { schemaId: data.schemaId, version: row.version });
      return this.block(row);
    });
  }

  public async listAnnouncements(siteIdentifier: string, locale: string, publicOnly = false): Promise<CmsAnnouncementDto[]> {
    const now = new Date();
    return this.db.cmsAnnouncement.findMany({ where: { siteIdentifier, locale, ...(publicOnly ? { status: CmsContentStatus.PUBLISHED, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } : {}) }, orderBy: [{ urgency: 'desc' }, { startsAt: 'desc' }] });
  }

  public async saveAnnouncement(
    data: Omit<CmsAnnouncementDto, 'id' | 'publicId' | 'version' | 'status' | 'approvedBy' | 'publishedContentHash' | 'publishedAt' | 'archivedAt' | 'createdAt' | 'updatedAt'> & { id?: string; expectedVersion?: number },
  ): Promise<CmsAnnouncementDto> {
    return this.db.$transaction(async (tx: any) => {
      const existing = data.id ? await tx.cmsAnnouncement.findUnique({ where: { id: data.id } }) : null;
      if (existing) this.assertVersion(existing.version, data.expectedVersion);
      if (data.expiresAt && data.expiresAt <= data.startsAt) throw new Error('CMS_ANNOUNCEMENT_WINDOW_INVALID');
      const values = {
        siteIdentifier: data.siteIdentifier,
        locale: data.locale,
        title: data.title,
        body: data.body,
        urgency: data.urgency,
        audience: data.audience,
        startsAt: data.startsAt,
        expiresAt: data.expiresAt,
      };
      const row = existing
        ? await tx.cmsAnnouncement.update({
            where: { id: existing.id },
            data: {
              ...values,
              status: CmsContentStatus.DRAFT,
              updatedBy: data.updatedBy ?? data.createdBy,
              approvedBy: null,
              publishedContentHash: null,
              publishedAt: null,
              archivedAt: null,
              version: { increment: 1 },
            },
          })
        : await tx.cmsAnnouncement.create({
            data: {
              id: randomUUID(),
              publicId: `cms-ann-${randomUUID()}`,
              ...values,
              status: CmsContentStatus.DRAFT,
              createdBy: data.createdBy,
              updatedBy: data.updatedBy ?? data.createdBy,
            },
          });
      await this.appendStandaloneMutation(tx, row.id, 'CmsAnnouncement', 'ANNOUNCEMENT_SAVED', data.updatedBy ?? data.createdBy, {
        siteIdentifier: data.siteIdentifier,
        locale: data.locale,
        version: row.version,
      });
      return row;
    });
  }

  public async publishAnnouncement(id: string, expectedVersion: number, actorId: string): Promise<CmsAnnouncementDto> {
    return this.db.$transaction(async (tx: any) => {
      const existing = await tx.cmsAnnouncement.findUnique({ where: { id } });
      if (!existing) throw new Error('CMS_ANNOUNCEMENT_NOT_FOUND');
      this.assertVersion(existing.version, expectedVersion);
      if (existing.status !== CmsContentStatus.DRAFT) throw new Error('CMS_ANNOUNCEMENT_DRAFT_REQUIRED');
      CmsPublishingPolicy.assertMakerChecker(existing.updatedBy ?? existing.createdBy, actorId);
      if (existing.expiresAt && existing.expiresAt <= existing.startsAt) throw new Error('CMS_ANNOUNCEMENT_WINDOW_INVALID');
      const contentHash = this.announcementContentHash(existing);
      const row = await tx.cmsAnnouncement.update({
        where: { id },
        data: {
          status: CmsContentStatus.PUBLISHED,
          approvedBy: actorId,
          publishedContentHash: contentHash,
          publishedAt: new Date(),
          archivedAt: null,
          version: { increment: 1 },
        },
      });
      await this.appendStandaloneMutation(tx, row.id, 'CmsAnnouncement', 'ANNOUNCEMENT_PUBLISHED', actorId, {
        reviewedVersion: existing.version,
        contentHash,
        siteIdentifier: row.siteIdentifier,
        locale: row.locale,
      });
      return row;
    });
  }

  public async archiveAnnouncement(id: string, expectedVersion: number, actorId: string): Promise<CmsAnnouncementDto> {
    return this.db.$transaction(async (tx: any) => {
      const existing = await tx.cmsAnnouncement.findUnique({ where: { id } });
      if (!existing) throw new Error('CMS_ANNOUNCEMENT_NOT_FOUND');
      this.assertVersion(existing.version, expectedVersion);
      if (existing.status !== CmsContentStatus.PUBLISHED) throw new Error('CMS_ANNOUNCEMENT_PUBLISHED_REQUIRED');
      const row = await tx.cmsAnnouncement.update({
        where: { id },
        data: { status: CmsContentStatus.ARCHIVED, archivedAt: new Date(), version: { increment: 1 } },
      });
      await this.appendStandaloneMutation(tx, row.id, 'CmsAnnouncement', 'ANNOUNCEMENT_ARCHIVED', actorId, {
        siteIdentifier: row.siteIdentifier,
        locale: row.locale,
      });
      return row;
    });
  }

  public async processDueSchedules(actorId: string, now: Date, limit = 50): Promise<CmsScheduleResultDto> {
    const boundedLimit = Math.min(100, Math.max(1, limit));
    const leaseOwner = `cms-scheduler:${randomUUID()}`;
    const leaseExpiresAt = new Date(now.getTime() + 60_000);
    const jobs = await this.db.$transaction(async (tx: any) => {
      await tx.cmsScheduledJob.updateMany({
        where: { status: 'PROCESSING', leaseExpiresAt: { lte: now }, completedAt: null },
        data: { status: 'PENDING', claimedBy: null, claimedAt: null, leaseExpiresAt: null },
      });
      const candidates = await tx.$queryRaw(Prisma.sql`
        SELECT "id"
        FROM "CmsScheduledJob"
        WHERE "status" = 'PENDING' AND "scheduledAt" <= ${now}
        ORDER BY "scheduledAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${boundedLimit}
      `) as Array<{ id: string }>;
      const ids = candidates.map((entry) => entry.id);
      if (!ids.length) return [];
      await tx.cmsScheduledJob.updateMany({
        where: { id: { in: ids }, status: 'PENDING' },
        data: {
          status: 'PROCESSING',
          claimedBy: leaseOwner,
          claimedAt: now,
          leaseExpiresAt,
          failureCode: null,
          attemptCount: { increment: 1 },
        },
      });
      return tx.cmsScheduledJob.findMany({
        where: { id: { in: ids }, status: 'PROCESSING', claimedBy: leaseOwner },
        orderBy: { scheduledAt: 'asc' },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const result: CmsScheduleResultDto = { processed: 0, published: 0, archived: 0, failed: 0, affectedSites: [] };
    const affectedSites = new Set<string>();
    for (const job of jobs) {
      result.processed += 1;
      const targetState = job.jobType === 'PUBLISH' ? CmsContentStatus.PUBLISHED : CmsContentStatus.ARCHIVED;
      try {
        const localized = await this.db.cmsLocalizedContent.findUnique({ where: { id: job.localizedContentId } });
        if (!localized) throw new Error('CMS_LOCALIZATION_NOT_FOUND');
        const content = await this.db.cmsContentNode.findUnique({ where: { id: localized.contentId }, select: { siteIdentifier: true } });
        if (content) affectedSites.add(content.siteIdentifier);
        if (localized.state !== targetState) {
          if (job.jobType === 'PUBLISH') {
            await this.publish({ contentId: localized.contentId, locale: localized.locale, actorId, expectedVersion: localized.version });
          } else {
            await this.archive({ contentId: localized.contentId, locale: localized.locale, actorId, expectedVersion: localized.version });
          }
        }
        const completed = await this.completeScheduledJob(job.id, leaseOwner);
        if (!completed) throw new Error('CMS_SCHEDULE_LEASE_LOST');
        if (job.jobType === 'PUBLISH') result.published += 1;
        else result.archived += 1;
      } catch (error) {
        const current = await this.db.cmsLocalizedContent.findUnique({ where: { id: job.localizedContentId } });
        if (current?.state === targetState) {
          await this.completeScheduledJob(job.id, leaseOwner);
          if (job.jobType === 'PUBLISH') result.published += 1;
          else result.archived += 1;
          continue;
        }
        result.failed += 1;
        await this.db.cmsScheduledJob.updateMany({
          where: { id: job.id, status: 'PROCESSING', claimedBy: leaseOwner },
          data: {
            status: 'FAILED',
            failureCode: error instanceof Error ? error.message.slice(0, 120) : 'CMS_SCHEDULE_FAILED',
            claimedBy: null,
            claimedAt: null,
            leaseExpiresAt: null,
          },
        });
      }
    }
    result.affectedSites = [...affectedSites];
    return result;
  }

  private async completeScheduledJob(jobId: string, leaseOwner: string): Promise<boolean> {
    const completed = await this.db.cmsScheduledJob.updateMany({
      where: { id: jobId, status: 'PROCESSING', claimedBy: leaseOwner },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        claimedBy: null,
        claimedAt: null,
        leaseExpiresAt: null,
        failureCode: null,
      },
    });
    return completed.count === 1;
  }

  private async transition(
    command: CmsWorkflowCommandDto,
    next: CmsContentStatus,
    action: string,
    extra: Record<string, unknown> = {},
  ): Promise<CmsLocalizedContentDto> {
    return this.db.$transaction(async (tx: any) => {
      const { content, localized } = await this.loadWorkflow(tx, command);
      CmsPublishingPolicy.assertTransition(localized.state, next);
      if (next === CmsContentStatus.IN_REVIEW) {
        const readiness = await this.readinessFromRows(content, localized);
        if (!readiness.ready) throw new Error(`CMS_NOT_READY:${readiness.missing.join(',')}`);
        await tx.cmsWorkflowReview.create({
          data: {
            id: randomUUID(),
            localizedContentId: localized.id,
            requestedBy: command.actorId,
            comments: command.comments,
          },
        });
      }
      if (next === CmsContentStatus.SCHEDULED) {
        const approved = await tx.cmsWorkflowReview.findFirst({
          where: { localizedContentId: localized.id, status: 'APPROVED' },
        });
        if (!approved) throw new Error('CMS_APPROVAL_REQUIRED');
        await tx.cmsScheduledJob.upsert({
          where: { idempotencyKey: `publish:${localized.id}:${localized.version + 1}` },
          create: {
            id: randomUUID(), localizedContentId: localized.id, jobType: 'PUBLISH',
            scheduledAt: command.scheduledAt, idempotencyKey: `publish:${localized.id}:${localized.version + 1}`,
          },
          update: {
            scheduledAt: command.scheduledAt,
            status: 'PENDING',
            failureCode: null,
            completedAt: null,
            claimedBy: null,
            claimedAt: null,
            leaseExpiresAt: null,
          },
        });
      }
      const row = await tx.cmsLocalizedContent.update({
        where: { id: localized.id },
        data: { state: next, ...extra, version: { increment: 1 } },
      });
      await this.syncRootLifecycle(tx, content.id);
      await this.appendMutation(tx, content, localized.id, action, command.actorId, {
        locale: command.locale,
        ...extra,
      });
      return this.localized(row);
    });
  }

  private async loadWorkflow(
    tx: any,
    command: CmsWorkflowCommandDto,
    includeRelations = false,
  ): Promise<{ content: any; localized: any }> {
    const content = await this.requireContent(tx, command.contentId);
    const localized = await tx.cmsLocalizedContent.findUnique({
      where: { contentId_locale: { contentId: command.contentId, locale: command.locale } },
      ...(includeRelations
        ? { include: { tags: { include: { tag: true } }, attachments: true } }
        : {}),
    });
    if (!localized) throw new Error('CMS_LOCALIZATION_NOT_FOUND');
    this.assertVersion(localized.version, command.expectedVersion);
    return { content, localized };
  }

  private async readinessFromRows(
    content: any,
    localized: any,
  ): Promise<CmsPublishingReadinessDto> {
    const base = CmsPublishingPolicy.readiness(this.content(content), this.localized(localized));
    const warnings = [...base.warnings];
    const tagCount = Array.isArray(localized.tags) ? localized.tags.length : undefined;
    if (tagCount === 0) warnings.push('tags');
    return { ...base, warnings };
  }

  private async resolveCategory(
    tx: any,
    categoryId?: string | null,
    categorySlug?: string | null,
  ): Promise<any | null> {
    if (!categoryId && !categorySlug) return null;
    const category = categoryId
      ? await tx.cmsCategory.findUnique({ where: { id: categoryId } })
      : await tx.cmsCategory.findUnique({ where: { slug: categorySlug } });
    if (!category) throw new Error('CMS_CATEGORY_NOT_FOUND');
    if (category.status !== 'ACTIVE') throw new Error('CMS_CATEGORY_INACTIVE');
    return category;
  }

  private async requireContent(tx: any, id: string): Promise<any> {
    const content = await tx.cmsContentNode.findUnique({ where: { id } });
    if (!content) throw new Error('CMS_CONTENT_NOT_FOUND');
    return content;
  }

  private assertVersion(current: number, expected?: number): void {
    if (expected !== undefined && current !== expected) throw new Error('CMS_VERSION_CONFLICT');
  }

  private async captureRevision(
    tx: any,
    localized: any,
    actorId: string,
    reason: string,
  ): Promise<void> {
    await tx.cmsContentRevision.upsert({
      where: {
        localizedContentId_versionNumber: {
          localizedContentId: localized.id,
          versionNumber: localized.version,
        },
      },
      create: {
        id: randomUUID(),
        localizedContentId: localized.id,
        versionNumber: localized.version,
        reason,
        capturedBy: actorId,
        payload: json({
          localizedSlug: localized.localizedSlug,
          title: localized.title,
          summary: localized.summary,
          body: localized.body,
          readingTimeMinutes: localized.readingTimeMinutes,
          featuredAssetId: localized.featuredAssetId,
          seoMetadata: localized.seoMetadata,
          metadata: localized.metadata,
        }),
      },
      update: {},
    });
  }

  private async syncRootLifecycle(
    tx: any,
    contentId: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    const localized = await tx.cmsLocalizedContent.findMany({
      where: { contentId },
      select: { state: true, publishedAt: true, scheduledAt: true },
    });
    const states: CmsContentStatus[] = localized.map((entry: any) => entry.state as CmsContentStatus);
    const anyPublished = states.includes(CmsContentStatus.PUBLISHED);
    const allArchived = states.length > 0 && states.every((state) => state === CmsContentStatus.ARCHIVED);
    const aggregateStatus = CmsPublishingPolicy.aggregateRootStatus(states);
    const publishedAtValues: Date[] = localized
      .map((entry: any) => entry.publishedAt as Date | null)
      .filter((value: Date | null): value is Date => value instanceof Date);
    const scheduledAtValues: Date[] = localized
      .filter((entry: any) => entry.state === CmsContentStatus.SCHEDULED && entry.scheduledAt instanceof Date)
      .map((entry: any) => entry.scheduledAt as Date);
    await tx.cmsContentNode.update({
      where: { id: contentId },
      data: {
        ...extra,
        status: aggregateStatus,
        publishedAt: anyPublished && publishedAtValues.length
          ? new Date(Math.max(...publishedAtValues.map((value) => value.getTime())))
          : null,
        scheduledAt: scheduledAtValues.length
          ? new Date(Math.min(...scheduledAtValues.map((value) => value.getTime())))
          : null,
        archivedAt: allArchived ? new Date() : null,
        version: { increment: 1 },
      },
    });
  }

  private async assertRedirectGraphSafe(
    tx: any,
    siteIdentifier: string,
    locale: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    const visited = new Set<string>([sourcePath]);
    let cursor = destinationPath;
    for (let depth = 0; depth < 256; depth += 1) {
      if (visited.has(cursor)) throw new Error('CMS_REDIRECT_LOOP');
      visited.add(cursor);
      const next = await tx.cmsRedirect.findUnique({
        where: { siteIdentifier_locale_sourcePath: { siteIdentifier, locale, sourcePath: cursor } },
      });
      if (!next || !next.active || next.sourcePath === sourcePath) return;
      cursor = next.destinationPath;
    }
    throw new Error('CMS_REDIRECT_GRAPH_TOO_DEEP');
  }

  private navigationContentHash(menu: any): string {
    return this.contentHash({
      siteIdentifier: menu.siteIdentifier,
      locale: menu.locale,
      locationKey: menu.locationKey,
      nodes: (menu.nodes ?? []).map((node: any) => ({
        id: node.id,
        parentNodeId: node.parentNodeId ?? null,
        displayText: node.displayText,
        targetType: node.targetType,
        targetValue: node.targetValue,
        sortOrder: node.sortOrder,
        openInNewWindow: node.openInNewWindow,
        metadata: node.metadata ?? null,
      })),
    });
  }

  private announcementContentHash(announcement: any): string {
    return this.contentHash({
      siteIdentifier: announcement.siteIdentifier,
      locale: announcement.locale,
      title: announcement.title,
      body: announcement.body,
      urgency: announcement.urgency,
      audience: announcement.audience ?? null,
      startsAt: announcement.startsAt instanceof Date ? announcement.startsAt.toISOString() : announcement.startsAt,
      expiresAt: announcement.expiresAt instanceof Date ? announcement.expiresAt.toISOString() : announcement.expiresAt ?? null,
    });
  }

  private contentHash(value: unknown): string {
    return createHash('sha256').update(this.stableStringify(value)).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
    if (Array.isArray(value)) return `[${value.map((entry) => this.stableStringify(entry)).join(',')}]`;
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`).join(',')}}`;
  }

  private seo(
    value: unknown,
    title: string,
    summary: string | null,
    locale: string,
    contentType: string,
    slug: string,
  ): CmsSeoMetadata & { canonicalUrl: string } {
    const input = (value ?? {}) as Partial<CmsSeoMetadata>;
    return {
      title: input.title ?? title,
      description: input.description ?? summary ?? title,
      canonicalUrl: CmsPublishingPolicy.canonicalPath(locale, contentType, slug),
      keywords: input.keywords ?? [],
      noIndex: input.noIndex ?? false,
      noFollow: input.noFollow ?? false,
      openGraphTitle: input.openGraphTitle ?? input.title ?? title,
      openGraphDescription: input.openGraphDescription ?? input.description ?? summary ?? title,
      openGraphAssetId: input.openGraphAssetId ?? null,
    };
  }

  private async appendMutation(
    tx: any,
    content: any,
    localizedContentId: string | null,
    action: string,
    actorId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await tx.cmsEditorialLedger.create({
      data: {
        id: randomUUID(),
        contentId: content.id,
        localizedContentId,
        action,
        actorId,
        payload: json(payload),
      },
    });
    await this.appendStandaloneMutation(tx, content.id, 'CmsContent', action, actorId, {
      publicId: content.publicId,
      localizedContentId,
      ...payload,
    });
  }

  private async appendStandaloneMutation(
    tx: any,
    targetId: string,
    targetType: string,
    action: string,
    actorId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const auditId = randomUUID();
    await tx.auditRecord.create({
      data: {
        id: auditId,
        reference: `cms-audit-${auditId}`,
        action,
        category: 'CMS',
        severity: action.includes('PUBLISHED') || action.includes('ARCHIVED') ? 'HIGH' : 'INFO',
        actorId,
        actorType: 'USER',
        targetId,
        targetType,
        source: 'Phase16',
        timestamp: new Date(),
        contextMetadata: json(payload),
      },
    });
    await tx.transactionalOutboxRecord.create({
      data: {
        id: randomUUID(),
        eventType: this.eventType(action),
        domain: 'CMS',
        aggregateType: targetType,
        aggregateId: targetId,
        payload: json({ targetId, action, ...payload }),
        metadata: json({ sourcePhase: 'Phase16', schemaVersion: '1.0' }),
      },
    });
  }

  private eventType(action: string): string {
    const names: Record<string, string> = {
      CONTENT_CREATED: 'CmsContentCreated',
      CONTENT_UPDATED: 'CmsContentUpdated',
      LOCALIZATION_SAVED: 'CmsLocalizationSaved',
      REVIEW_REQUESTED: 'CmsReviewRequested',
      REVIEW_APPROVED: 'CmsReviewApproved',
      REVIEW_REJECTED: 'CmsReviewRejected',
      CONTENT_SCHEDULED: 'CmsContentScheduled',
      SCHEDULE_CANCELLED: 'CmsScheduleCancelled',
      CONTENT_PUBLISHED: 'CmsContentPublished',
      CONTENT_ARCHIVED: 'CmsContentArchived',
      REVISION_RESTORED: 'CmsRevisionRestored',
      CATEGORY_CREATED: 'CmsCategoryCreated',
      TAG_UPSERTED: 'CmsTagUpserted',
      SLUG_CHANGED: 'CmsSlugChanged',
      REDIRECT_CREATED: 'CmsRedirectCreated',
      NAVIGATION_UPDATED: 'CmsNavigationUpdated',
      NAVIGATION_PUBLISHED: 'CmsNavigationPublished',
      BLOCK_SCHEMA_CREATED: 'CmsBlockSchemaCreated',
      BLOCK_SAVED: 'CmsContentBlockSaved',
      ANNOUNCEMENT_SAVED: 'CmsAnnouncementSaved',
      ANNOUNCEMENT_PUBLISHED: 'CmsAnnouncementPublished',
    };
    return names[action] ?? `Cms${action}`;
  }

  private async availableLocales(
    contentIds: string[],
  ): Promise<Map<string, Array<{ locale: string; slug: string }>>> {
    if (!contentIds.length) return new Map();
    const rows = await this.db.cmsPublishedContent.findMany({
      where: { contentId: { in: [...new Set(contentIds)] }, status: CmsContentStatus.PUBLISHED },
      select: { contentId: true, locale: true, slug: true },
    });
    const result = new Map<string, Array<{ locale: string; slug: string }>>();
    for (const row of rows) {
      const entries = result.get(row.contentId) ?? [];
      entries.push({ locale: row.locale, slug: row.slug });
      result.set(row.contentId, entries);
    }
    return result;
  }

  private domainLink(row: any): CmsContentDomainLinkDto {
    return {
      id: row.id,
      contentId: row.contentId,
      targetType: row.targetType,
      targetId: row.targetId,
      relationType: row.relationType,
      sortOrder: row.sortOrder ?? 0,
      metadata: row.metadata ?? null,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }

  private content(row: any): CmsContentDto {
    return {
      ...row,
      status: row.status as CmsContentStatus,
      seoMetadata: row.seoMetadata as CmsSeoMetadata | null,
      editorialMetadata: row.editorialMetadata as Record<string, unknown> | null,
      metadata: row.metadata as Record<string, unknown> | null,
    };
  }

  private localized(row: any): CmsLocalizedContentDto {
    return {
      ...row,
      state: row.state as CmsContentStatus,
      seoMetadata: row.seoMetadata as CmsSeoMetadata | null,
      metadata: row.metadata as Record<string, unknown> | null,
      attachmentAssetIds: Array.isArray(row.attachments)
        ? row.attachments.map((entry: any) => entry.assetId)
        : [],
      tagIds: Array.isArray(row.tags) ? row.tags.map((entry: any) => entry.tagId) : [],
      actorId: row.lastModifiedBy,
    };
  }

  private category(row: any): CmsCategoryDto {
    const { _count, ...category } = row;
    return { ...category, contentCount: _count?.contents ?? 0 };
  }

  private tag(row: any): CmsTagDto {
    const { _count, ...tag } = row;
    return { ...tag, contentCount: _count?.contents ?? 0 };
  }

  private revision(row: any): CmsContentRevisionDto {
    return { ...row, payload: row.payload as Record<string, unknown> };
  }

  private navigation(row: any): CmsNavigationMenuDto {
    return { ...row, status: row.status as CmsContentStatus, nodes: row.nodes.map((node: any) => ({ ...node, metadata: node.metadata as Record<string, unknown> | null })) };
  }

  private blockSchema(row: any): CmsBlockSchemaDto {
    return { ...row, fieldSchema: row.fieldSchema as Record<string, unknown>, localizedFields: Array.isArray(row.localizedFields) ? row.localizedFields : [], assetFields: Array.isArray(row.assetFields) ? row.assetFields : [] };
  }

  private block(row: any): CmsContentBlockDto {
    return { ...row, status: row.status as CmsContentStatus, payload: row.payload as Record<string, unknown> };
  }

  private publicContent(
    row: any,
    availableLocales: Array<{ locale: string; slug: string }>,
  ): PublicCmsContentDto {
    const seo = row.seoMetadata as CmsSeoMetadata;
    const tags = (Array.isArray(row.tags) ? row.tags : []).map((entry: any) => ({
      normalizedValue: entry.normalizedValue,
      label: row.locale.startsWith('ar') ? entry.labelAr : entry.labelEn,
    }));
    return {
      publicId: row.publicId,
      contentId: row.contentId,
      siteIdentifier: row.siteIdentifier,
      locale: row.locale,
      slug: row.slug,
      canonicalUrl: row.canonicalUrl,
      contentType: row.contentType,
      title: row.title,
      summary: row.summary,
      body: row.body,
      categorySlug: row.categorySlug,
      featuredAssetId: row.featuredAssetId,
      attachmentAssetIds: Array.isArray(row.attachmentAssetIds) ? row.attachmentAssetIds : [],
      tags,
      publishedAt: row.publishedAt,
      versionNumber: row.versionNumber,
      seoMetadata: seo,
      availableLocales,
      localizedPayload: {
        id: row.id,
        contentId: row.contentId,
        locale: row.locale,
        localizedSlug: row.slug,
        state: CmsContentStatus.PUBLISHED,
        version: row.versionNumber,
        title: row.title,
        summary: row.summary,
        body: row.body,
        readingTimeMinutes: Math.max(1, Math.ceil(row.body.split(/\s+/).length / 220)),
        featuredAssetId: row.featuredAssetId,
        seoMetadata: seo,
        metadata: null,
        attachmentAssetIds: Array.isArray(row.attachmentAssetIds) ? row.attachmentAssetIds : [],
        tagIds: [],
        actorId: 'published-projection',
        lastModifiedBy: 'published-projection',
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  }
}

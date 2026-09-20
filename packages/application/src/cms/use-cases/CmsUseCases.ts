import { AssetReferencePolicy, assertAssetReferencesUsable } from '../../asset-platform/AssetReferencePolicy';
import { randomUUID } from 'node:crypto';
import {
  CmsCategoryDto,
  CmsAnnouncementDto,
  CmsBlockSchemaDto,
  CmsContentBlockDto,
  CmsContentDetailDto,
  CmsContentDto,
  CmsContentDomainLinkDto,
  CmsContentFilters,
  CmsDomainTargetType,
  CmsContentRevisionDto,
  CmsContentStatus,
  CmsContentType,
  CmsNavigationMenuDto,
  CmsLocalizedContentDto,
  CmsPublishingPolicy,
  CmsPublishingReadinessDto,
  CmsRedirectDto,
  CmsScheduleResultDto,
  CmsTagDto,
  CreateCmsCategoryDto,
  CreateCmsContentDto,
  CreateCmsTagDto,
  ICmsRepository,
  ICmsDeliveryCache,
  PaginatedCmsResult,
  PublicCmsContentDto,
  UpdateCmsContentDto,
  UpsertCmsContentDomainLinkDto,
  UpsertCmsLocalizedContentDto,
} from '@manaratak/domain';

type CreateContentInput = Omit<
  CreateCmsContentDto,
  'publicId' | 'status' | 'authorId' | 'ownerId'
> & { ownerId?: string };

export class AdminCmsUseCases {
  public constructor(
    private readonly repository: ICmsRepository,
    private readonly deliveryCache?: ICmsDeliveryCache | null,
    private readonly assetReferences?: AssetReferencePolicy,
  ) {}

  public async createContent(data: CreateContentInput, actorId: string): Promise<CmsContentDto> {
    this.ensureActor(actorId);
    CmsPublishingPolicy.assertSlug(data.slug);
    await this.ensureAssetHandles([data.featuredAssetId, data.seoMetadata?.openGraphAssetId]);
    return this.repository.createContent({
      ...data,
      seoMetadata: this.authoringSeo(data.seoMetadata),
      publicId: `cms-${randomUUID()}`,
      status: CmsContentStatus.DRAFT,
      authorId: actorId,
      ownerId: data.ownerId ?? actorId,
    });
  }

  public async updateContent(
    id: string,
    data: UpdateCmsContentDto,
    actorId: string,
  ): Promise<CmsContentDto> {
    this.ensureActor(actorId);
    if (data.slug) CmsPublishingPolicy.assertSlug(data.slug);
    await this.ensureAssetHandles([data.featuredAssetId, data.seoMetadata?.openGraphAssetId]);
    return this.repository.updateContent(id, { ...data, seoMetadata: this.authoringSeo(data.seoMetadata) }, actorId);
  }

  public async listContent(filters: CmsContentFilters): Promise<PaginatedCmsResult<CmsContentDto>> {
    return this.repository.listContent(filters);
  }

  public async getContent(id: string): Promise<CmsContentDetailDto> {
    const content = await this.repository.getContentDetail(id);
    if (!content) throw new Error('CMS_CONTENT_NOT_FOUND');
    return content;
  }

  public async upsertLocalizedContent(
    data: Omit<UpsertCmsLocalizedContentDto, 'actorId'>,
    actorId: string,
  ): Promise<CmsLocalizedContentDto> {
    this.ensureActor(actorId);
    CmsPublishingPolicy.assertSlug(data.localizedSlug);
    if (!data.body.trim()) throw new Error('CMS_LOCALIZED_BODY_REQUIRED');
    CmsPublishingPolicy.assertSafeRichText(data.body);
    await this.ensureAssetHandles([
      data.featuredAssetId,
      data.seoMetadata?.openGraphAssetId,
      ...(data.attachmentAssetIds ?? []),
    ]);
    return this.repository.upsertLocalizedContent({ ...data, seoMetadata: this.authoringSeo(data.seoMetadata), actorId });
  }

  public async getReadiness(contentId: string, locale: string): Promise<CmsPublishingReadinessDto> {
    return this.repository.getReadiness(contentId, locale);
  }

  public async submitForReview(
    contentId: string,
    locale: string,
    actorId: string,
    expectedVersion?: number,
    comments?: string | null,
  ): Promise<CmsLocalizedContentDto> {
    const readiness = await this.repository.getReadiness(contentId, locale);
    if (!readiness.ready) throw new Error(`CMS_NOT_READY:${readiness.missing.join(',')}`);
    return this.repository.submitForReview({
      contentId,
      locale,
      actorId,
      expectedVersion,
      comments,
    });
  }

  public async approveReview(
    contentId: string,
    locale: string,
    actorId: string,
    expectedVersion?: number,
    comments?: string | null,
  ): Promise<CmsLocalizedContentDto> {
    this.ensureActor(actorId);
    return this.repository.approveReview({
      contentId,
      locale,
      actorId,
      expectedVersion,
      comments,
    });
  }

  public async rejectReview(
    contentId: string,
    locale: string,
    actorId: string,
    comments: string,
    expectedVersion?: number,
  ): Promise<CmsLocalizedContentDto> {
    if (!comments.trim()) throw new Error('CMS_REJECTION_REASON_REQUIRED');
    return this.repository.rejectReview({
      contentId,
      locale,
      actorId,
      expectedVersion,
      comments,
    });
  }

  public async schedule(
    contentId: string,
    locale: string,
    actorId: string,
    scheduledAt: Date,
    expectedVersion?: number,
  ): Promise<CmsLocalizedContentDto> {
    if (scheduledAt.getTime() <= Date.now()) throw new Error('CMS_SCHEDULE_MUST_BE_FUTURE');
    return this.repository.schedule({
      contentId,
      locale,
      actorId,
      expectedVersion,
      scheduledAt,
    });
  }

  public async publish(
    contentId: string,
    locale: string,
    actorId: string,
    expectedVersion?: number,
  ): Promise<CmsLocalizedContentDto> {
    const readiness = await this.repository.getReadiness(contentId, locale);
    if (!readiness.ready) throw new Error(`CMS_NOT_READY:${readiness.missing.join(',')}`);
    const result = await this.repository.publish({ contentId, locale, actorId, expectedVersion });
    await this.invalidateDelivery(contentId, 'content-published');
    return result;
  }

  public async cancelSchedule(contentId: string, locale: string, actorId: string, expectedVersion?: number): Promise<CmsLocalizedContentDto> {
    return this.repository.cancelSchedule({ contentId, locale, actorId, expectedVersion });
  }

  public async archive(
    contentId: string,
    locale: string,
    actorId: string,
    expectedVersion?: number,
  ): Promise<CmsLocalizedContentDto> {
    const result = await this.repository.archive({ contentId, locale, actorId, expectedVersion });
    await this.invalidateDelivery(contentId, 'content-archived');
    return result;
  }

  public async listRevisions(contentId: string, locale: string): Promise<CmsContentRevisionDto[]> {
    return this.repository.listRevisions(contentId, locale);
  }

  public async restoreRevision(
    contentId: string,
    locale: string,
    revisionId: string,
    actorId: string,
    expectedVersion?: number,
  ): Promise<CmsLocalizedContentDto> {
    return this.repository.restoreRevision({
      contentId,
      locale,
      revisionId,
      actorId,
      expectedVersion,
    });
  }

  public async createCategory(
    data: CreateCmsCategoryDto,
    actorId: string,
  ): Promise<CmsCategoryDto> {
    CmsPublishingPolicy.assertSlug(data.slug);
    return this.repository.createCategory(data, actorId);
  }

  public async listCategories(): Promise<CmsCategoryDto[]> {
    return this.repository.listCategories();
  }

  public async createTag(data: CreateCmsTagDto, actorId: string): Promise<CmsTagDto> {
    if (!data.normalizedValue.trim()) throw new Error('CMS_TAG_REQUIRED');
    return this.repository.createTag(
      { ...data, normalizedValue: data.normalizedValue.trim().toLocaleLowerCase('en') },
      actorId,
    );
  }

  public async listTags(): Promise<CmsTagDto[]> {
    return this.repository.listTags();
  }


  public async replaceDomainLinks(
    contentId: string,
    links: UpsertCmsContentDomainLinkDto[],
    actorId: string,
  ): Promise<CmsContentDomainLinkDto[]> {
    this.ensureActor(actorId);
    if (!this.repository.replaceDomainLinks) throw new Error('CMS_DOMAIN_LINKS_NOT_SUPPORTED');
    if (links.length > 50) throw new Error('CMS_DOMAIN_LINK_LIMIT_EXCEEDED');
    const seen = new Set<string>();
    const normalized = links.map((link, index) => {
      const targetId = link.targetId.trim();
      if (!targetId) throw new Error('CMS_DOMAIN_TARGET_ID_REQUIRED');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
        throw new Error('CMS_DOMAIN_TARGET_OWNER_ID_REQUIRED');
      }
      const key = `${link.targetType}:${targetId}:${link.relationType}`;
      if (seen.has(key)) throw new Error('CMS_DOMAIN_LINK_DUPLICATE');
      seen.add(key);
      return { ...link, targetId, sortOrder: link.sortOrder ?? index };
    });
    return this.repository.replaceDomainLinks(contentId, normalized, actorId);
  }

  public async listDomainLinks(contentId: string): Promise<CmsContentDomainLinkDto[]> {
    return this.repository.listDomainLinks ? this.repository.listDomainLinks(contentId) : [];
  }

  public async changeLocalizedSlug(contentId: string, locale: string, newSlug: string, reason: string, expectedVersion: number, actorId: string): Promise<CmsLocalizedContentDto> {
    this.ensureActor(actorId); CmsPublishingPolicy.assertSlug(newSlug);
    if (!reason.trim()) throw new Error('CMS_SLUG_CHANGE_REASON_REQUIRED');
    const result = await this.repository.changeLocalizedSlug({ contentId, locale, newSlug, reason: reason.trim(), expectedVersion, actorId });
    await this.invalidateDelivery(contentId, 'slug-changed');
    return result;
  }

  public async listRedirects(siteIdentifier?: string, locale?: string): Promise<CmsRedirectDto[]> {
    return this.repository.listRedirects(siteIdentifier, locale);
  }

  public async createRedirect(data: Omit<CmsRedirectDto, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>, actorId: string): Promise<CmsRedirectDto> {
    CmsPublishingPolicy.assertRedirect(data.sourcePath, data.destinationPath);
    return this.repository.createRedirect({ ...data, createdBy: actorId });
  }

  public async listNavigation(siteIdentifier: string, locale: string): Promise<CmsNavigationMenuDto[]> {
    return this.repository.listNavigation(siteIdentifier, locale);
  }

  public async saveNavigation(
    data: Omit<CmsNavigationMenuDto, 'id' | 'version' | 'status' | 'updatedBy' | 'publishedContentHash' | 'publishedBy' | 'publishedAt' | 'createdAt' | 'updatedAt'> & { id?: string; expectedVersion?: number },
    actorId: string,
  ): Promise<CmsNavigationMenuDto> {
    CmsPublishingPolicy.assertAcyclicNavigation(data.nodes);
    for (const node of data.nodes) CmsPublishingPolicy.assertSafeNavigationTarget(node.targetType, node.targetValue);
    return this.repository.saveNavigation({ ...data, updatedBy: actorId });
  }

  public async publishNavigation(id: string, expectedVersion: number, actorId: string): Promise<CmsNavigationMenuDto> {
    this.ensureActor(actorId);
    return this.repository.publishNavigation(id, expectedVersion, actorId);
  }

  public async listBlockSchemas(): Promise<CmsBlockSchemaDto[]> { return this.repository.listBlockSchemas(); }
  public async createBlockSchema(data: Omit<CmsBlockSchemaDto, 'id' | 'createdAt' | 'createdBy'>, actorId: string): Promise<CmsBlockSchemaDto> {
    return this.repository.createBlockSchema({ ...data, createdBy: actorId });
  }
  public async listBlocks(siteIdentifier: string, locale: string): Promise<CmsContentBlockDto[]> { return this.repository.listBlocks(siteIdentifier, locale); }
  public async saveBlock(data: Omit<CmsContentBlockDto, 'id' | 'publicId' | 'version' | 'createdAt' | 'updatedAt' | 'updatedBy'> & { id?: string; expectedVersion?: number }, actorId: string): Promise<CmsContentBlockDto> {
    return this.repository.saveBlock({ ...data, updatedBy: actorId });
  }
  public async listAnnouncements(siteIdentifier: string, locale: string): Promise<CmsAnnouncementDto[]> { return this.repository.listAnnouncements(siteIdentifier, locale); }
  public async saveAnnouncement(
    data: Omit<CmsAnnouncementDto, 'id' | 'publicId' | 'version' | 'status' | 'createdBy' | 'updatedBy' | 'approvedBy' | 'publishedContentHash' | 'publishedAt' | 'archivedAt' | 'createdAt' | 'updatedAt'> & { id?: string; expectedVersion?: number },
    actorId: string,
  ): Promise<CmsAnnouncementDto> {
    CmsPublishingPolicy.assertSafeRichText(data.body);
    return this.repository.saveAnnouncement({ ...data, createdBy: actorId, updatedBy: actorId });
  }

  public async publishAnnouncement(id: string, expectedVersion: number, actorId: string): Promise<CmsAnnouncementDto> {
    this.ensureActor(actorId);
    return this.repository.publishAnnouncement(id, expectedVersion, actorId);
  }

  public async archiveAnnouncement(id: string, expectedVersion: number, actorId: string): Promise<CmsAnnouncementDto> {
    this.ensureActor(actorId);
    return this.repository.archiveAnnouncement(id, expectedVersion, actorId);
  }
  public async processDueSchedules(actorId: string, now = new Date(), limit = 50): Promise<CmsScheduleResultDto> {
    this.ensureActor(actorId);
    const result = await this.repository.processDueSchedules(actorId, now, limit);
    for (const siteIdentifier of result.affectedSites) await this.deliveryCache?.invalidateSite(siteIdentifier, 'scheduled-job-completed');
    return result;
  }

  private authoringSeo<T extends { canonicalUrl?: string | null } | null | undefined>(seo: T): T {
    if (!seo) return seo;
    const { canonicalUrl: _ignoredCanonicalUrl, ...governed } = seo;
    return governed as T;
  }

  private async ensureAssetHandles(assetIds: Array<string | null | undefined>): Promise<void> {
    for (const assetId of assetIds) CmsPublishingPolicy.assertAssetHandle(assetId);
    await assertAssetReferencesUsable(this.assetReferences, assetIds, { purpose: 'CMS_PUBLIC_MEDIA' });
  }

  private ensureActor(actorId: string): void {
    if (!actorId.trim()) throw new Error('CMS_AUTHENTICATED_ACTOR_REQUIRED');
  }

  private async invalidateDelivery(contentId: string, reason: string): Promise<void> {
    if (!this.deliveryCache) return;
    const content = await this.repository.findContentById(contentId);
    if (content) await this.deliveryCache.invalidateSite(content.siteIdentifier, reason);
  }
}

export class PublicCmsUseCases {
  public constructor(private readonly repository: ICmsRepository, private readonly deliveryCache?: ICmsDeliveryCache | null) {}

  public async listPublished(
    filters: CmsContentFilters,
    locale?: string,
  ): Promise<PaginatedCmsResult<PublicCmsContentDto>> {
    return this.repository.listPublished(filters, locale);
  }

  public async getBySlug(slug: string, locale?: string, siteIdentifier?: string): Promise<PublicCmsContentDto> {
    const site = siteIdentifier ?? 'manaratak';
    const language = locale ?? 'ar';
    const cached = await this.deliveryCache?.getPublished(site, language, slug);
    if (cached) return cached;
    const content = await this.repository.getPublishedBySlug(slug, locale, siteIdentifier);
    if (!content) throw new Error('CMS_CONTENT_NOT_FOUND');
    await this.deliveryCache?.setPublished(content);
    return content;
  }

  public async listNavigation(siteIdentifier: string, locale: string): Promise<CmsNavigationMenuDto[]> {
    return (await this.repository.listNavigation(siteIdentifier, locale)).filter((menu) => menu.status === CmsContentStatus.PUBLISHED);
  }

  public async listAnnouncements(siteIdentifier: string, locale: string): Promise<CmsAnnouncementDto[]> {
    return this.repository.listAnnouncements(siteIdentifier, locale, true);
  }


  public async listRelated(
    targetType: CmsDomainTargetType,
    targetId: string,
    locale = 'ar',
    siteIdentifier = 'manaratak',
    limit = 6,
  ): Promise<PublicCmsContentDto[]> {
    if (!this.repository.listPublishedByDomainTarget) return [];
    const normalizedTargetId = targetId.trim();
    if (!normalizedTargetId) throw new Error('CMS_DOMAIN_TARGET_ID_REQUIRED');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedTargetId)) {
      throw new Error('CMS_DOMAIN_TARGET_OWNER_ID_REQUIRED');
    }
    return this.repository.listPublishedByDomainTarget(targetType, normalizedTargetId, locale, siteIdentifier, limit);
  }

  public async resolveRedirect(siteIdentifier: string, locale: string, sourcePath: string): Promise<CmsRedirectDto | null> {
    return (await this.repository.listRedirects(siteIdentifier, locale)).find((redirect) => redirect.active && redirect.sourcePath === sourcePath) ?? null;
  }
}

export const CmsContentTypeValues = Object.values(CmsContentType);

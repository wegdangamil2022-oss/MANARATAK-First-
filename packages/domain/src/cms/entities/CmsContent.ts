import { CmsCategoryStatus } from '../enums/CmsCategoryStatus';
import { CmsContentStatus } from '../enums/CmsContentStatus';
import { CmsContentType } from '../enums/CmsContentType';
import { CmsDomainRelationType } from '../enums/CmsDomainRelationType';
import { CmsDomainTargetType } from '../enums/CmsDomainTargetType';

export interface CmsSeoMetadata {
  title: string;
  description: string;
  canonicalUrl?: string | null;
  keywords: string[];
  noIndex: boolean;
  noFollow: boolean;
  openGraphTitle?: string | null;
  openGraphDescription?: string | null;
  openGraphAssetId?: string | null;
}

export interface CreateCmsContentDto {
  publicId: string;
  slug: string;
  siteIdentifier: string;
  primaryLocale: string;
  contentType: CmsContentType;
  status: CmsContentStatus;
  title: string;
  summary?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  authorId: string;
  ownerId: string;
  featuredAssetId?: string | null;
  seoMetadata?: CmsSeoMetadata | null;
  editorialMetadata?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
}

export interface UpdateCmsContentDto {
  expectedVersion?: number;
  slug?: string;
  contentType?: CmsContentType;
  title?: string;
  summary?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  ownerId?: string;
  featuredAssetId?: string | null;
  seoMetadata?: CmsSeoMetadata | null;
  editorialMetadata?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface CmsContentDto extends CreateCmsContentDto {
  id: string;
  version: number;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertCmsLocalizedContentDto {
  contentId: string;
  locale: string;
  localizedSlug: string;
  title: string;
  summary?: string | null;
  body: string;
  readingTimeMinutes?: number | null;
  featuredAssetId?: string | null;
  seoMetadata?: CmsSeoMetadata | null;
  metadata?: Record<string, unknown> | null;
  attachmentAssetIds?: string[];
  tagIds?: string[];
  expectedVersion?: number;
  actorId: string;
}

export interface CmsLocalizedContentDto extends UpsertCmsLocalizedContentDto {
  id: string;
  state: CmsContentStatus;
  version: number;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  lastModifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCmsCategoryDto {
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  parentCategoryId?: string | null;
  status: CmsCategoryStatus;
  metadata?: Record<string, unknown> | null;
}

export interface CmsCategoryDto extends CreateCmsCategoryDto {
  id: string;
  contentCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCmsTagDto {
  normalizedValue: string;
  labelAr: string;
  labelEn: string;
}

export interface CmsTagDto extends CreateCmsTagDto {
  id: string;
  contentCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CmsAttachmentDto {
  id: string;
  localizedContentId: string;
  assetId: string;
  role: 'FEATURED' | 'ATTACHMENT' | 'OPEN_GRAPH';
  sortOrder: number;
  caption?: string | null;
}

export interface CmsWorkflowReviewDto {
  id: string;
  localizedContentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  requestedAt: Date;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  comments?: string | null;
}

export interface CmsContentRevisionDto {
  id: string;
  localizedContentId: string;
  versionNumber: number;
  reason: string;
  capturedBy: string;
  capturedAt: Date;
  payload: Record<string, unknown>;
}

export interface CmsPublishingReadinessDto {
  ready: boolean;
  missing: string[];
  warnings: string[];
}

export interface CmsContentDetailDto extends CmsContentDto {
  localizedPayloads: CmsLocalizedContentDto[];
  tags: CmsTagDto[];
  attachments: CmsAttachmentDto[];
  reviews: CmsWorkflowReviewDto[];
  revisions: CmsContentRevisionDto[];
  readiness: Record<string, CmsPublishingReadinessDto>;
  domainLinks: CmsContentDomainLinkDto[];
}

export interface CmsContentFilters {
  status?: CmsContentStatus;
  contentType?: CmsContentType;
  categorySlug?: string;
  tag?: string;
  locale?: string;
  siteIdentifier?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface PublicCmsContentDto {
  publicId: string;
  contentId: string;
  siteIdentifier: string;
  locale: string;
  slug: string;
  canonicalUrl: string;
  contentType: CmsContentType;
  title: string;
  summary?: string | null;
  body: string;
  categorySlug?: string | null;
  featuredAssetId?: string | null;
  attachmentAssetIds: string[];
  tags: Array<{ normalizedValue: string; label: string }>;
  publishedAt: Date;
  versionNumber: number;
  seoMetadata: CmsSeoMetadata;
  availableLocales: Array<{ locale: string; slug: string }>;
  localizedPayload?: CmsLocalizedContentDto | null;
}


export interface CmsContentDomainLinkDto {
  id: string;
  contentId: string;
  targetType: CmsDomainTargetType;
  targetId: string;
  relationType: CmsDomainRelationType;
  sortOrder: number;
  metadata?: Record<string, unknown> | null;
  createdBy: string;
  createdAt: Date;
}

export interface UpsertCmsContentDomainLinkDto {
  targetType: CmsDomainTargetType;
  targetId: string;
  relationType: CmsDomainRelationType;
  sortOrder?: number;
  metadata?: Record<string, unknown> | null;
}

export interface CmsWorkflowCommandDto {
  contentId: string;
  locale: string;
  actorId: string;
  expectedVersion?: number;
  comments?: string | null;
  scheduledAt?: Date | null;
}

export interface CmsRestoreRevisionDto {
  contentId: string;
  locale: string;
  revisionId: string;
  actorId: string;
  expectedVersion?: number;
}

export interface CmsRedirectDto {
  id: string;
  siteIdentifier: string;
  locale: string;
  sourcePath: string;
  destinationPath: string;
  statusCode: 301 | 302 | 308;
  reason: string;
  contentId?: string | null;
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CmsNavigationNodeDto {
  id?: string;
  parentNodeId?: string | null;
  displayText: string;
  targetType: 'CMS_CONTENT' | 'EXTERNAL_URL' | 'DOMAIN_REFERENCE';
  targetValue: string;
  sortOrder: number;
  openInNewWindow: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface CmsNavigationMenuDto {
  id: string;
  siteIdentifier: string;
  locale: string;
  locationKey: string;
  status: CmsContentStatus;
  version: number;
  nodes: CmsNavigationNodeDto[];
  updatedBy: string;
  publishedContentHash?: string | null;
  publishedBy?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CmsBlockSchemaDto {
  id: string;
  key: string;
  version: number;
  nameAr: string;
  nameEn: string;
  fieldSchema: Record<string, unknown>;
  localizedFields: string[];
  assetFields: string[];
  status: string;
  createdBy: string;
  createdAt: Date;
}

export interface CmsContentBlockDto {
  id: string;
  publicId: string;
  siteIdentifier: string;
  locale: string;
  schemaId: string;
  name: string;
  payload: Record<string, unknown>;
  status: CmsContentStatus;
  version: number;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CmsAnnouncementDto {
  id: string;
  publicId: string;
  siteIdentifier: string;
  locale: string;
  title: string;
  body: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  audience?: string | null;
  startsAt: Date;
  expiresAt?: Date | null;
  status: CmsContentStatus;
  version: number;
  createdBy: string;
  updatedBy: string;
  approvedBy?: string | null;
  publishedContentHash?: string | null;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CmsSlugChangeDto {
  contentId: string;
  locale: string;
  newSlug: string;
  reason: string;
  actorId: string;
  expectedVersion: number;
}

export interface CmsScheduleResultDto {
  processed: number;
  published: number;
  archived: number;
  failed: number;
  affectedSites: string[];
}

export interface PaginatedCmsResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

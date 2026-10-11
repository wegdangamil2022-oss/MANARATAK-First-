export enum ServiceCompletenessStatus {
  INCOMPLETE = 'INCOMPLETE',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  COMPLETE = 'COMPLETE',
}

export enum ServiceStatus {
  READY_TO_REVIEW = 'READY_TO_REVIEW',
  READY_TO_PUBLISH = 'READY_TO_PUBLISH',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum ServiceAvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  PAUSED = 'PAUSED',
}

export enum ServiceCategory {
  STUDENT_SERVICES = 'STUDENT_SERVICES',
  DOCUMENT_SERVICES = 'DOCUMENT_SERVICES',
  VISA_SERVICES = 'VISA_SERVICES',
  TRAVEL_SERVICES = 'TRAVEL_SERVICES',
  ACADEMIC_SERVICES = 'ACADEMIC_SERVICES',
  PROFESSIONAL_SERVICES = 'PROFESSIONAL_SERVICES',
  ENTERPRISE_SERVICES = 'ENTERPRISE_SERVICES',
}

export enum ServiceDeliveryMode {
  ONLINE = 'ONLINE',
  IN_PERSON = 'IN_PERSON',
  HYBRID = 'HYBRID',
}

export enum ServiceFulfillmentType {
  CONSULTATION = 'CONSULTATION',
  DOCUMENT_PROCESSING = 'DOCUMENT_PROCESSING',
  BOOKING = 'BOOKING',
  APPLICATION_SUPPORT = 'APPLICATION_SUPPORT',
  MANAGED_SERVICE = 'MANAGED_SERVICE',
}

export enum ServiceRequestStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ServiceCatalogItemDto {
  approvedPrice?: {
    amountMinorUnits: string;
    currencyCode: string;
    scale: number;
    pricingId: string;
    fingerprint: string;
    effectiveTo?: string | null;
  } | null;
  cancellationPolicyCode?: 'FINANCE_REVIEW_REQUIRED' | 'FREE_BEFORE_START';
  reviewEvidence?: Record<string, unknown> | null;
  fulfillmentPolicy?: 'FREE' | 'CHARGEABLE' | 'QUOTE_REQUIRED';
  inputSchema?: Array<{
    key: string;
    type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'ASSET';
    required: boolean;
    sensitive?: boolean;
  }>;
  localizedContent?: Record<string, { displayName: string; serviceDescription: string }> | null;
  makerActorId?: string | null;
  reviewerActorId?: string | null;
  reviewedVersion?: number | null;
  publishedSnapshot?: Record<string, unknown> | null;
  id: string;
  publicId: string;
  slug: string;
  canonicalName: string;
  canonicalDedupKey: string;
  displayName: string;
  status: ServiceStatus;
  completenessStatus: ServiceCompletenessStatus;
  serviceCategory: ServiceCategory;
  fulfillmentType: ServiceFulfillmentType;
  serviceDescription: string;
  serviceAvailabilityStatus: ServiceAvailabilityStatus;
  requiredInputsOrDocuments: string[];
  deliveryMode: ServiceDeliveryMode;
  responsibleServiceOwnerType: string;
  providerName?: string | null;
  providerReferenceId?: string | null;
  estimatedDeliveryTime?: string | null;
  slaPolicy?: Record<string, unknown> | null;
  appointmentRequired?: boolean | null;
  /** Canonical Phase 7 IDs are the relationship truth. */
  supportedCountryReferenceIds?: string[] | null;
  supportedLanguageReferenceIds?: string[] | null;
  /** Compatibility/source labels only; never relationship identity. */
  supportedCountries?: string[] | null;
  supportedLanguages?: string[] | null;
  servicePrerequisites?: string[] | null;
  deliveryArtifactTypes?: string[] | null;
  pricingReferenceId?: string | null;
  thumbnailAssetId?: string | null;
  publicDisplayMetadata?: Record<string, unknown> | null;
  optionalFields?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  version: number;
}

export type CreateServiceCatalogItemDto = Omit<
  ServiceCatalogItemDto,
  'id' | 'createdAt' | 'updatedAt' | 'version'
>;
export type UpdateServiceCatalogItemDto = Partial<
  Omit<CreateServiceCatalogItemDto, 'publicId' | 'canonicalDedupKey' | 'canonicalName'>
>;
export type ServiceCatalogRepositoryUpdateDto = UpdateServiceCatalogItemDto & {
  canonicalName?: string;
  canonicalDedupKey?: string;
};

export interface ServiceCatalogFilters {
  search?: string;
  status?: ServiceStatus;
  completenessStatus?: ServiceCompletenessStatus;
  serviceCategory?: ServiceCategory;
  fulfillmentType?: ServiceFulfillmentType;
  serviceAvailabilityStatus?: ServiceAvailabilityStatus;
  deliveryMode?: ServiceDeliveryMode;
  supportedCountryReferenceId?: string;
  supportedLanguageReferenceId?: string;
  page?: number;
  pageSize?: number;
}

export type PublicServiceCatalogFilters = Omit<
  ServiceCatalogFilters,
  'status' | 'completenessStatus' | 'page' | 'pageSize'
> & { cursor?: string; limit?: number; locale?: 'ar' | 'en' };
export type PublicServiceCatalogItemDto = Omit<
  ServiceCatalogItemDto,
  | 'id'
  | 'canonicalName'
  | 'canonicalDedupKey'
  | 'status'
  | 'completenessStatus'
  | 'optionalFields'
  | 'createdAt'
  | 'updatedAt'
>;

export interface PaginatedServiceCatalogResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore?: boolean;
  nextCursor?: string | null;
}

export interface ServiceRequestDto {
  retentionUntil?: Date | string | null;
  assignedStaffId?: string | null;
  dueAt?: Date | string | null;
  cancellationState?: string;
  payloadFingerprint?: string | null;
  serviceSnapshot?: Record<string, unknown> | null;
  invoiceIntent?: Record<string, unknown> | null;
  invoiceLinkState?: string;
  id: string;
  publicId: string;
  studentReferenceId: string;
  serviceId: string;
  status: ServiceRequestStatus;
  requestParameters: Record<string, unknown>;
  providerReferenceId?: string | null;
  financeInvoiceId?: string | null;
  financeInvoicePublicId?: string | null;
  fulfillmentMetadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string | null;
  version: number;
}

export interface CreateServiceRequestDto {
  retentionUntil?: Date | string | null;
  dueAt?: Date | string | null;
  payloadFingerprint?: string | null;
  serviceSnapshot?: Record<string, unknown> | null;
  publicId: string;
  studentReferenceId: string;
  serviceId: string;
  status: ServiceRequestStatus;
  requestParameters: Record<string, unknown>;
}

export interface ServiceRequestFilters {
  assignedStaffId?: string;
  unassigned?: boolean;
  overdue?: boolean;
  providerReferenceId?: string;
  search?: string;
  studentReferenceId?: string;
  serviceId?: string;
  status?: ServiceRequestStatus;
  page?: number;
  pageSize?: number;
}

export interface PaginatedServiceRequestResult {
  data: ServiceRequestDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IServiceCatalogRepository {
  create(data: CreateServiceCatalogItemDto): Promise<ServiceCatalogItemDto>;
  update(
    id: string,
    data: ServiceCatalogRepositoryUpdateDto,
    expectedVersion: number,
  ): Promise<ServiceCatalogItemDto>;
  findById(id: string): Promise<ServiceCatalogItemDto | null>;
  findBySlug(slug: string): Promise<ServiceCatalogItemDto | null>;
  findByDedupKey(dedupKey: string): Promise<ServiceCatalogItemDto | null>;
  updateStatus(
    id: string,
    status: ServiceStatus,
    expectedVersion: number,
  ): Promise<ServiceCatalogItemDto>;
  list(
    filters: ServiceCatalogFilters,
  ): Promise<PaginatedServiceCatalogResult<ServiceCatalogItemDto>>;
  listPublished(
    filters: PublicServiceCatalogFilters,
  ): Promise<PaginatedServiceCatalogResult<ServiceCatalogItemDto>>;
}

export interface IServiceRequestRepository {
  /** P20-owned support triage; only distinct student references, never request details. */
  listSupportAwaitingPaymentStudents?(
    page: number,
    limit: number,
  ): Promise<{
    items: Array<{ studentReferenceId: string }>;
    total: number;
    hasMore: boolean;
    nextPage: number | null;
  }>;
  eraseRequestInputs?(
    id: string,
    studentReferenceId: string,
    expectedVersion: number,
  ): Promise<ServiceRequestDto>;
  markCancellationPending?(id: string, expectedVersion: number): Promise<ServiceRequestDto>;
  claimRequest?(id: string, actorId: string, expectedVersion: number): Promise<ServiceRequestDto>;
  requestTimeline?(id: string): Promise<Array<Record<string, unknown>>>;
  prepareInvoiceIntent?(
    id: string,
    intent: Record<string, unknown>,
    expectedVersion: number,
  ): Promise<ServiceRequestDto>;
  createRequest(data: CreateServiceRequestDto): Promise<ServiceRequestDto>;
  findRequestById(id: string): Promise<ServiceRequestDto | null>;
  findRequestByPublicId(publicId: string): Promise<ServiceRequestDto | null>;
  listRequests(filters: ServiceRequestFilters): Promise<PaginatedServiceRequestResult>;
  updateRequestStatus(
    id: string,
    status: ServiceRequestStatus,
    expectedVersion: number,
    fulfillmentMetadata?: Record<string, unknown> | null,
  ): Promise<ServiceRequestDto>;
  linkFinanceInvoice(
    id: string,
    financeInvoiceId: string,
    financeInvoicePublicId: string,
    expectedVersion: number,
  ): Promise<ServiceRequestDto>;
  assignProvider(
    id: string,
    providerReferenceId: string,
    expectedVersion: number,
  ): Promise<ServiceRequestDto>;
}

export interface IServiceReferenceGateway {
  resolveCountryReference(input: string): Promise<{ id: string; label?: string }>;
  resolveLanguageReference(input: string): Promise<{ id: string; label?: string }>;
}

export interface IServiceFinanceGateway {
  createDraftInvoice(input: {
    requestId: string;
    requestPublicId: string;
    studentReferenceId: string;
    description: string;
    quantity: number;
    amountMinorUnits: string;
    currencyCode: string;
    scale: number;
    actorId: string;
  }): Promise<{ id: string; publicId: string }>;
  getInvoiceClearance(
    invoiceId: string,
    request?: { requestPublicId: string; studentReferenceId: string },
  ): Promise<{
    invoiceId: string;
    invoiceStatus: string;
    amountDueMinorUnits: string;
    financiallyCleared: boolean;
    cancellationCleared?: boolean;
  }>;
}

export interface ServiceRequestedEvent {
  eventType: 'ServiceRequested';
  requestId: string;
  serviceId: string;
  studentReferenceId: string;
  occurredAt: Date | string;
}

export interface ServiceFulfillmentStatusChangedEvent {
  eventType: 'ServiceFulfillmentStatusChanged';
  requestId: string;
  status: ServiceRequestStatus;
  occurredAt: Date | string;
}

export interface ServiceProviderAssignedEvent {
  eventType: 'ServiceProviderAssigned';
  requestId: string;
  providerReferenceId: string;
  occurredAt: Date | string;
}

export interface ServiceFinanceInvoiceLinkedEvent {
  eventType: 'ServiceFinanceInvoiceLinked';
  requestId: string;
  financeInvoiceId: string;
  occurredAt: Date | string;
}

export * from './operations';

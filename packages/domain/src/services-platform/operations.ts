export enum ServiceProviderStatus {
  DRAFT = 'DRAFT',
  QUALIFIED = 'QUALIFIED',
  SUSPENDED = 'SUSPENDED',
  RETIRED = 'RETIRED',
}

export enum ServicePackageStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ServicePricingStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  RETIRED = 'RETIRED',
}

export enum ServiceDiscountType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

export enum ServicePromotionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
}

export enum ServiceProviderAvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  BLOCKED = 'BLOCKED',
  RETIRED = 'RETIRED',
}

export enum ServiceBookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceWorkflowDefinitionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  RETIRED = 'RETIRED',
}

export enum ServiceWorkflowExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface ServiceProviderDto {
  id: string;
  publicId: string;
  displayName: string;
  status: ServiceProviderStatus;
  timezone: string;
  capacity: number;
  countryReferenceId?: string | null;
  supportedServiceIds: string[];
  qualificationMetadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ServicePackageItemDto {
  id?: string;
  packageId?: string;
  serviceId: string;
  sequence: number;
  quantity: number;
  required: boolean;
}

export interface ServicePackageDto {
  id: string;
  publicId: string;
  displayName: string;
  status: ServicePackageStatus;
  items: ServicePackageItemDto[];
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ServicePricingDto {
  id: string;
  publicId: string;
  serviceId?: string | null;
  packageId?: string | null;
  currencyCode: string;
  scale: number;
  amountMinorUnits: string;
  status: ServicePricingStatus;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  immutableFingerprint: string;
  createdAt: Date | string;
}

export interface ServiceDiscountDto {
  id: string;
  publicId: string;
  code?: string | null;
  discountType: ServiceDiscountType;
  valueMinorUnits?: string | null;
  percentageBasisPoints?: number | null;
  currencyCode?: string | null;
  serviceId?: string | null;
  packageId?: string | null;
  activeFrom: Date | string;
  activeTo?: Date | string | null;
  maxRedemptions?: number | null;
  redemptionCount: number;
  createdAt: Date | string;
}

export interface ServicePromotionDto {
  id: string;
  publicId: string;
  name: string;
  status: ServicePromotionStatus;
  discountId: string;
  serviceId?: string | null;
  packageId?: string | null;
  activeFrom: Date | string;
  activeTo?: Date | string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ServiceAvailabilitySlotDto {
  id: string;
  publicId: string;
  providerId: string;
  serviceId: string;
  startsAt: Date | string;
  endsAt: Date | string;
  timezone: string;
  capacity: number;
  status: ServiceProviderAvailabilityStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ServiceBookingItemDto {
  id?: string;
  bookingId?: string;
  serviceId: string;
  packageItemId?: string | null;
  sequence: number;
  quantity: number;
  status: ServiceBookingStatus;
}

export interface ServiceBookingPricingSnapshot {
  pricingId: string;
  baseAmountMinorUnits: string;
  discountId?: string | null;
  promotionId?: string | null;
  discountMinorUnits: string;
  finalAmountMinorUnits: string;
  currencyCode: string;
  scale: number;
  capturedAt: Date | string;
  pricingFingerprint: string;
}

export interface ServiceBookingDto {
  id: string;
  publicId: string;
  studentReferenceId: string;
  serviceId?: string | null;
  packageId?: string | null;
  providerId: string;
  slotId: string;
  status: ServiceBookingStatus;
  startsAt: Date | string;
  endsAt: Date | string;
  timezone: string;
  pricingSnapshot: ServiceBookingPricingSnapshot;
  items: ServiceBookingItemDto[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ServiceWorkflowStepDefinition {
  key: string;
  sequence: number;
  slaMinutes?: number | null;
  requiredArtifactTypes?: string[] | null;
}

export interface ServiceWorkflowDefinitionDto {
  id: string;
  publicId: string;
  name: string;
  serviceId?: string | null;
  packageId?: string | null;
  status: ServiceWorkflowDefinitionStatus;
  steps: ServiceWorkflowStepDefinition[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ServiceWorkflowExecutionDto {
  id: string;
  publicId: string;
  bookingId: string;
  workflowDefinitionId: string;
  status: ServiceWorkflowExecutionStatus;
  currentStepKey?: string | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  failureReason?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ServiceDeliveryArtifactDto {
  id: string;
  bookingId: string;
  workflowExecutionId?: string | null;
  artifactType: string;
  assetId: string;
  deliveredBy: string;
  deliveredAt: Date | string;
}

export interface CreateServiceBookingInput {
  publicId: string;
  studentReferenceId: string;
  serviceId?: string | null;
  packageId?: string | null;
  providerId: string;
  slotId: string;
  pricingSnapshot: ServiceBookingPricingSnapshot;
  items: Omit<ServiceBookingItemDto, 'id' | 'bookingId'>[];
}

export interface IServiceOperationsRepository {
  createProvider(data: Omit<ServiceProviderDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceProviderDto>;
  updateProviderStatus(id: string, status: ServiceProviderStatus): Promise<ServiceProviderDto>;
  findProviderById(id: string): Promise<ServiceProviderDto | null>;
  createPackage(data: Omit<ServicePackageDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServicePackageDto>;
  updatePackageStatus(id: string, status: ServicePackageStatus): Promise<ServicePackageDto>;
  findPackageById(id: string): Promise<ServicePackageDto | null>;
  createPricing(data: Omit<ServicePricingDto, 'id' | 'createdAt'>): Promise<ServicePricingDto>;
  findPricingById(id: string): Promise<ServicePricingDto | null>;
  updatePricingStatus(id: string, status: ServicePricingStatus): Promise<ServicePricingDto>;
  retirePricing(id: string, effectiveTo: Date): Promise<void>;
  findActivePricing(serviceId: string | null, packageId: string | null, at: Date): Promise<ServicePricingDto | null>;
  createDiscount(data: Omit<ServiceDiscountDto, 'id' | 'createdAt'>): Promise<ServiceDiscountDto>;
  findDiscountById(id: string): Promise<ServiceDiscountDto | null>;
  createPromotion(data: Omit<ServicePromotionDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServicePromotionDto>;
  updatePromotionStatus(id: string, status: ServicePromotionStatus): Promise<ServicePromotionDto>;
  findPromotionById(id: string): Promise<ServicePromotionDto | null>;
  createAvailabilitySlot(data: Omit<ServiceAvailabilitySlotDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceAvailabilitySlotDto>;
  findAvailabilitySlotById(id: string): Promise<ServiceAvailabilitySlotDto | null>;
  createBookingWithCapacity(data: CreateServiceBookingInput): Promise<ServiceBookingDto>;
  findBookingById(id: string): Promise<ServiceBookingDto | null>;
  updateBookingStatus(id: string, status: ServiceBookingStatus): Promise<ServiceBookingDto>;
  createWorkflowDefinition(data: Omit<ServiceWorkflowDefinitionDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceWorkflowDefinitionDto>;
  findWorkflowDefinitionById(id: string): Promise<ServiceWorkflowDefinitionDto | null>;
  updateWorkflowDefinitionStatus(id: string, status: ServiceWorkflowDefinitionStatus): Promise<ServiceWorkflowDefinitionDto>;
  findActiveWorkflowDefinition(serviceId: string | null, packageId: string | null): Promise<ServiceWorkflowDefinitionDto | null>;
  createWorkflowExecution(data: Omit<ServiceWorkflowExecutionDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceWorkflowExecutionDto>;
  updateWorkflowExecution(id: string, data: Partial<Pick<ServiceWorkflowExecutionDto, 'status' | 'currentStepKey' | 'startedAt' | 'completedAt' | 'failureReason'>>): Promise<ServiceWorkflowExecutionDto>;
  addDeliveryArtifact(data: Omit<ServiceDeliveryArtifactDto, 'id' | 'deliveredAt'>): Promise<ServiceDeliveryArtifactDto>;
}
